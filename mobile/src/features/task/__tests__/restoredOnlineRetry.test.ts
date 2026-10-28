jest.mock('react-native-mmkv-storage', () => {
  const data = new Map<string, Map<string, string>>();
  class MMKVLoader {
    private id = '';
    withInstanceID(id: string) {
      this.id = id;
      return this;
    }
    withEncryption() {
      return this;
    }
    initialize() {
      const values = data.get(this.id) ?? new Map<string, string>();
      data.set(this.id, values);
      return {
        getString: (key: string) => values.get(key) ?? null,
        setString: (key: string, value: string) => {
          values.set(key, value);
          return true;
        },
        removeItem: (key: string) => values.delete(key),
      };
    }
  }
  return { MMKVLoader };
});

jest.mock('../../../api/client', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(mockStatus: number, mockCode: string) {
      super(mockCode);
      this.status = mockStatus;
      this.code = mockCode;
    }
  },
  requestJson: jest.fn(),
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DeviceEventEmitter } from 'react-native';

import { ApiError, requestJson } from '../../../api/client';
import {
  createQueueRetryRunner,
  type QueueRetryOutcome,
} from '../activitySync';
import * as activityQueueModule from '../activityQueue';
import {
  enqueue,
  readQueue,
  type ResidentActivityCommand,
  type InspectionCommand,
} from '../activityQueue';
import {
  RESTORED_ONLINE_EVENT,
  addRestoredOnlineListener,
} from '../connectivity';

const residentCommand: ResidentActivityCommand = {
  commandType: 'resident.record_activity',
  resourceType: 'SubjectManagementRecord',
  resourceId: 'record',
  clientCommandId: 'stable-resident',
  occurredAt: '2026-01-01T00:00:00Z',
  payloadVersion: 1,
  baseVersion: 7,
  payload: { activityType: 'followup', content: 'offline draft' },
};
const inspectionCommand: InspectionCommand = {
  commandType: 'inspection.save_checklist',
  resourceType: 'Inspection',
  resourceId: 'inspection-1',
  clientCommandId: 'stable-inspection',
  occurredAt: '2026-01-01T00:00:00Z',
  payloadVersion: 1,
  baseVersion: 3,
  payload: { responses: [{ key: 'safety', value: 'pass' }] },
};
type SyncBody = { commandType: string; clientCommandId: string };

async function flushMicroTasks(): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    await undefined;
  }
}

function sentBodies(): SyncBody[] {
  return jest
    .mocked(requestJson)
    .mock.calls.map(
      (call) => JSON.parse(String(call[1]?.body ?? '{}')) as SyncBody,
    );
}

function assertSyncOnly(): void {
  for (const call of jest.mocked(requestJson).mock.calls) {
    expect(call[0]).toBe('/api/sync');
    expect(call[1]?.method).toBe('POST');
  }
}

describe('restored-online queue retry', () => {
  beforeEach(() => {
    jest.mocked(requestJson).mockReset();
  });

  afterEach(() => {
    DeviceEventEmitter.removeAllListeners(RESTORED_ONLINE_EVENT);
  });

  it('retries queued Resident and Inspection actions when the device reports restored online while the same subscription stays active', async () => {
    enqueue('officer', residentCommand);
    enqueue('officer', inspectionCommand);
    expect(readQueue('officer').map((entry) => entry.clientCommandId)).toEqual([
      'stable-resident',
      'stable-inspection',
    ]);

    let offline = true;
    jest.mocked(requestJson).mockImplementation(async (path, init) => {
      const body = JSON.parse(String(init?.body)) as SyncBody;
      if (offline) throw new ApiError(0, 'OFFLINE', body);
      return { command: { status: 'synced' } };
    });

    // Wiring identical to TaskScreen: the coalescing runner behind both the
    // session-change pass and the device-restored subscription, so one
    // subscription stays active across the transition while the screen
    // stays mounted.
    let settled = 0;
    const outcomes: QueueRetryOutcome[] = [];
    const runner = createQueueRetryRunner((outcome) => {
      settled += 1;
      outcomes.push(outcome);
    });
    const unsubscribe = addRestoredOnlineListener(() =>
      runner.retry('officer'),
    );

    runner.retry('officer'); // offline mount/session pass
    await flushMicroTasks();
    // Offline handling breaks after the first attempt; the offline pass can
    // only try the head of the queue and both commands stay pending.
    expect(sentBodies().map((body) => body.clientCommandId)).toEqual([
      'stable-resident',
    ]);
    expect(readQueue('officer')).toHaveLength(2);
    expect(settled).toBe(1);

    offline = false;
    DeviceEventEmitter.emit(RESTORED_ONLINE_EVENT); // same mounted screen
    await flushMicroTasks();

    expect(sentBodies().map((body) => body.clientCommandId)).toEqual([
      'stable-resident',
      'stable-resident',
      'stable-inspection',
    ]);
    expect(readQueue('officer')).toEqual([]);
    expect(settled).toBe(2);
    // The mounted-screen retry path must settle with a proven-synced outcome
    // so the UI can show the completion feedback instead of "saved for retry".
    expect(outcomes).toEqual(['pending', 'synced']);
    assertSyncOnly();

    const callsAfterSync = jest.mocked(requestJson).mock.calls.length;
    unsubscribe();
    DeviceEventEmitter.emit(RESTORED_ONLINE_EVENT); // after unsubscribe
    await flushMicroTasks();
    expect(jest.mocked(requestJson).mock.calls).toHaveLength(callsAfterSync);
    expect(readQueue('officer')).toEqual([]);
  });

  it('coalesces a reconnect arriving while an offline pass is still in flight', async () => {
    enqueue('officer', residentCommand);
    enqueue('officer', inspectionCommand);

    const releaseGate: { first: () => void } = { first: () => {} };
    const gate = new Promise<void>((resolve) => {
      releaseGate.first = resolve;
    });
    let sawFirst = false;
    let offline = true;
    const mockedApi = jest.mocked(requestJson);
    mockedApi.mockImplementation(async (path, init) => {
      const body = JSON.parse(String(init?.body)) as SyncBody;
      if (!sawFirst && offline) {
        sawFirst = true;
        await gate;
        return { command: { status: 'pending' } };
      }
      if (offline) throw new ApiError(0, 'OFFLINE', body);
      return { command: { status: 'synced' } };
    });

    const runner = createQueueRetryRunner();
    const unsubscribe = addRestoredOnlineListener(() =>
      runner.retry('officer'),
    );

    runner.retry('officer'); // pass A: blocked on the first command
    await flushMicroTasks();
    expect(sentBodies().map((body) => body.clientCommandId)).toEqual([
      'stable-resident',
    ]);

    DeviceEventEmitter.emit(RESTORED_ONLINE_EVENT); // reconnect while pass A is in flight
    await flushMicroTasks();
    // Serialized: the restored event did not start a second concurrent pass.
    expect(sentBodies().map((body) => body.clientCommandId)).toEqual([
      'stable-resident',
    ]);
    expect(readQueue('officer')).toHaveLength(2);

    offline = false;
    releaseGate.first();
    await flushMicroTasks();

    // Exactly one follow-up pass runs for the coalesced reconnect.
    expect(sentBodies().map((body) => body.clientCommandId)).toEqual([
      'stable-resident',
      'stable-resident',
      'stable-inspection',
    ]);
    expect(readQueue('officer')).toEqual([]);
    assertSyncOnly();
    unsubscribe();
  });

  it('does not send another old-user command after the session identity changes', async () => {
    enqueue('officer', residentCommand);
    enqueue('officer', inspectionCommand);

    const releaseGate: { first: () => void } = { first: () => {} };
    const gate = new Promise<void>((resolve) => {
      releaseGate.first = resolve;
    });
    let currentIdentity = 'officer';
    const posts: Array<{ identity: string; clientCommandId: string }> = [];
    jest.mocked(requestJson).mockImplementation(async (_path, init) => {
      const body = JSON.parse(String(init?.body)) as SyncBody;
      posts.push({ identity: currentIdentity, clientCommandId: body.clientCommandId });
      if (posts.length === 1) await gate;
      return { command: { status: 'synced' } };
    });

    const runner = createQueueRetryRunner();
    runner.retry('officer');
    await flushMicroTasks();
    expect(posts).toEqual([
      { identity: 'officer', clientCommandId: 'stable-resident' },
    ]);

    currentIdentity = 'different-user';
    runner.retry('different-user');
    releaseGate.first();
    await flushMicroTasks();

    expect(posts).not.toContainEqual({
      identity: 'different-user',
      clientCommandId: 'stable-inspection',
    });
  });

  it('keeps TaskScreen subscribed to the restored-online seam with the shared runner', () => {
    const taskSource = readFileSync(
      join(__dirname, '../TaskScreen.tsx'),
      'utf8',
    );
    expect(taskSource).toContain('addRestoredOnlineListener');
    expect(taskSource).toContain('createQueueRetryRunner');
    expect(taskSource).not.toContain(RESTORED_ONLINE_EVENT);
  });

  it('reports error when reading the queue throws and lets a later pass settle normally', async () => {
    const readQueueSpy = jest.spyOn(activityQueueModule, 'readQueue');
    readQueueSpy.mockImplementationOnce(() => {
      throw new Error('SECURE_QUEUE_UNAVAILABLE');
    });
    const outcomes: QueueRetryOutcome[] = [];
    const runner = createQueueRetryRunner((outcome) => outcomes.push(outcome));

    runner.retry('officer'); // queue read throws -> outcome 'error'
    await flushMicroTasks();
    expect(outcomes).toEqual(['error']);
    // No API call may come from the queue-read error path.
    expect(jest.mocked(requestJson).mock.calls).toHaveLength(0);

    // The runner's finally-cleanup released the in-flight slot, so a second
    // trigger runs a fresh pass; the queue read now succeeds with no pending
    // commands and the pass settles 'idle' (still without any API request).
    readQueueSpy.mockImplementationOnce(() => []);
    runner.retry('officer');
    await flushMicroTasks();
    expect(outcomes).toEqual(['error', 'idle']);
    expect(jest.mocked(requestJson).mock.calls).toHaveLength(0);
    readQueueSpy.mockRestore();
  });
});
