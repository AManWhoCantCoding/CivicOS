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
    constructor(mockStatus: number) {
      super();
      this.status = mockStatus;
    }
  },
  requestJson: jest.fn(),
}));

import {
  canFieldwork,
  inspectionActions,
  canRecordResidentActivity,
  resetInspectionDraft,
  resetActivityDraft,
  queueRetryFeedback,
} from '../TaskScreen';
import {
  retryResidentActivities,
  syncResidentActivity,
  type QueueRetryOutcome,
} from '../activitySync';
import { requestJson } from '../../../api/client';
import {
  enqueue,
  readQueue,
  removeCommand,
  clearQueue,
  nextInspectionVersion,
  readRejected,
  rejectCommand,
  type ResidentActivityCommand,
  type InspectionCommand,
} from '../activityQueue';

const command: ResidentActivityCommand = {
  commandType: 'resident.record_activity',
  resourceType: 'SubjectManagementRecord',
  resourceId: 'record',
  clientCommandId: 'stable',
  occurredAt: '2026-01-01T00:00:00Z',
  payloadVersion: 1,
  baseVersion: 7,
  payload: { activityType: 'followup', content: 'test' },
};
const inspectionCommand: InspectionCommand = {
  commandType: 'inspection.save_checklist',
  resourceType: 'Inspection',
  resourceId: 'inspection-1',
  clientCommandId: 'inspection-stable',
  occurredAt: '2026-01-01T00:00:00Z',
  payloadVersion: 1,
  baseVersion: 3,
  payload: { responses: [{ key: 'safety', value: 'pass' }] },
};

describe('resident activity mobile boundary', () => {
  beforeEach(() => jest.mocked(requestJson).mockReset());
  it('clears sensitive draft text and status when changing task selection', () => {
    const setActivity = jest.fn();
    const setStatus = jest.fn();
    resetActivityDraft(setActivity, setStatus);
    expect(setActivity).toHaveBeenCalledWith('');
    expect(setStatus).toHaveBeenCalledWith('');
  });

  it('requires the exact active resident task and a valid version', () => {
    const task = {
      id: 'task-1',
      title: 'Resident followup',
      status: 'active',
      createdAt: '',
      resourceId: 'record',
      resourceType: 'SubjectManagementRecord',
      relatedInfo: { entityType: 'RESIDENT' as const, id: 'record' },
      assignmentSummary: {
        assignmentId: 'assignment',
        task: 'resident_followup',
        status: 'active',
      },
      baseVersion: 1,
    };
    expect(canRecordResidentActivity(task)).toBe(true);
    expect(
      canRecordResidentActivity({
        ...task,
        assignmentSummary: { ...task.assignmentSummary, task: 'other' },
      }),
    ).toBe(false);
    expect(
      canRecordResidentActivity({
        ...task,
        assignmentSummary: { ...task.assignmentSummary, status: 'revoked' },
      }),
    ).toBe(false);
    expect(
      canRecordResidentActivity({ ...task, resourceType: 'Incident' }),
    ).toBe(false);
    expect(
      canRecordResidentActivity({
        ...task,
        relatedInfo: { entityType: 'BUSINESS', id: 'record' },
      }),
    ).toBe(false);
    expect(canRecordResidentActivity({ ...task, baseVersion: undefined })).toBe(
      false,
    );
  });

  it('requires active inspection_fieldwork assignment, Inspection resource, and version', () => {
    const task = {
      id: 'task-i',
      title: 'Inspection',
      status: 'active',
      createdAt: '',
      resourceType: 'Inspection',
      resourceId: 'inspection-1',
      baseVersion: 3,
      assignmentSummary: {
        assignmentId: 'assignment',
        task: 'inspection_fieldwork',
        status: 'active',
      },
    };
    expect(canFieldwork(task)).toBe(true);
    expect(
      canFieldwork({
        ...task,
        assignmentSummary: { ...task.assignmentSummary, status: 'closed' },
      }),
    ).toBe(false);
    expect(
      canFieldwork({
        ...task,
        assignmentSummary: {
          ...task.assignmentSummary,
          task: 'inspection_close',
        },
      }),
    ).toBe(false);
    expect(canFieldwork({ ...task, resourceType: 'InspectionFinding' })).toBe(
      false,
    );
    expect(canFieldwork({ ...task, baseVersion: undefined })).toBe(false);
    const scheduledDetail = {
      inspection: { id: 'inspection-1', status: 'scheduled', version: 3 },
      permissions: { canFieldwork: true },
      template: [{ key: 'safety', label: 'Safety' }],
    };
    expect(inspectionActions(task, scheduledDetail)).toEqual({
      start: true,
      checklist: false,
      finding: false,
    });
    expect(
      inspectionActions(task, {
        ...scheduledDetail,
        inspection: { id: 'inspection-1', status: 'in_progress', version: 4 },
        permissions: { canFieldwork: true },
      }),
    ).toEqual({ start: false, checklist: true, finding: true });
    expect(
      inspectionActions(task, {
        ...scheduledDetail,
        inspection: { id: 'inspection-1', status: 'in_progress', version: 4 },
        permissions: { canFieldwork: false },
      }),
    ).toEqual({ start: false, checklist: false, finding: false });
    expect(inspectionActions(task, null)).toEqual({
      start: false,
      checklist: false,
      finding: false,
    });
    expect(
      inspectionActions(task, {
        ...scheduledDetail,
        inspection: { id: 'other-inspection', status: 'scheduled' },
      }),
    ).toEqual({ start: false, checklist: false, finding: false });
  });

  it('clears Inspection checklist and finding drafts when leaving or changing task', () => {
    const setResponses = jest.fn();
    const setKey = jest.fn();
    const setDescription = jest.fn();
    const setResult = jest.fn();
    resetInspectionDraft(setResponses, setKey, setDescription, setResult);
    expect(setResponses).toHaveBeenCalledWith({});
    expect(setKey).toHaveBeenCalledWith('');
    expect(setDescription).toHaveBeenCalledWith('');
    expect(setResult).toHaveBeenCalledWith('needs_action');
  });

  it('maps queue retry outcomes to the user-visible feedback message', () => {
    expect(queueRetryFeedback('synced')).toBe('Đã đồng bộ thao tác đã lưu.');
    for (const outcome of [
      'pending',
      'rejected',
      'idle',
      'error',
    ] as const) {
      expect(queueRetryFeedback(outcome)).toBeUndefined();
    }
    const exhaustive: Record<QueueRetryOutcome, string | undefined> = {
      synced: 'Đã đồng bộ thao tác đã lưu.',
      pending: undefined,
      rejected: undefined,
      idle: undefined,
      error: undefined,
    };
    expect(Object.keys(exhaustive)).toHaveLength(5);
  });

  it('persists one stable command id for retries and isolates/clears users', () => {
    enqueue('user-a', command);
    enqueue('user-a', command);
    expect(readQueue('user-a')).toEqual([command]);
    expect(readQueue('user-b')).toEqual([]);
    removeCommand('user-a', command.clientCommandId);
    expect(readQueue('user-a')).toEqual([]);
    enqueue('user-a', command);
    clearQueue('user-a');
    expect(readQueue('user-a')).toEqual([]);
  });

  it('queues inspection command envelopes unchanged and isolates retries by user', async () => {
    const request = jest.mocked(requestJson);
    request.mockRejectedValueOnce(new Error('offline'));
    expect(
      await syncResidentActivity('inspection-user', inspectionCommand),
    ).toBe('pending');
    expect(readQueue('inspection-user')).toEqual([inspectionCommand]);
    expect(readQueue('other-user')).toEqual([]);
    request.mockResolvedValueOnce({ command: { status: 'synced' } });
    await retryResidentActivities('inspection-user');
    expect(JSON.parse(String(request.mock.calls.at(-1)?.[1]?.body))).toEqual(
      inspectionCommand,
    );
    expect(readQueue('inspection-user')).toEqual([]);
  });

  it('preserves ordered Inspection versions and sends all three exact action envelopes', async () => {
    expect(nextInspectionVersion('ordered-user', 'inspection-1', 3)).toBe(3);
    enqueue('ordered-user', inspectionCommand);
    expect(nextInspectionVersion('ordered-user', 'inspection-1', 3)).toBe(4);
    removeCommand('ordered-user', inspectionCommand.clientCommandId);
    const actions: InspectionCommand[] = [
      {
        ...inspectionCommand,
        commandType: 'inspection.start',
        clientCommandId: 'start',
        baseVersion: 3,
        payload: {},
      },
      {
        ...inspectionCommand,
        commandType: 'inspection.save_checklist',
        clientCommandId: 'checklist',
        baseVersion: 4,
        payload: { responses: [{ key: 'safety', value: 'ok' }] },
      },
      {
        ...inspectionCommand,
        commandType: 'inspection.finding',
        clientCommandId: 'finding',
        baseVersion: 5,
        payload: {
          checklistKey: 'safety',
          description: 'issue',
          result: 'needs_action',
        },
      },
    ];
    const request = jest.mocked(requestJson);
    request.mockResolvedValue({ command: { status: 'synced' } });
    for (const action of actions)
      expect(await syncResidentActivity('actions-user', action)).toBe('synced');
    expect(
      request.mock.calls.map((call) => JSON.parse(String(call[1]?.body))),
    ).toEqual(actions);
  });

  it('retains a transient command and retries the exact persisted ID until synced', async () => {
    const request = jest.mocked(requestJson);
    request.mockRejectedValueOnce(new Error('transient'));
    expect(await syncResidentActivity('retry-user', command)).toBe('pending');
    expect(readQueue('retry-user')).toEqual([command]);
    request.mockResolvedValueOnce({ command: { status: 'synced' } });
    await retryResidentActivities('retry-user');
    expect(request).toHaveBeenCalledTimes(2);
    const first = JSON.parse(String(request.mock.calls[0][1]?.body));
    const retry = JSON.parse(String(request.mock.calls[1][1]?.body));
    expect(first.clientCommandId).toBe(command.clientCommandId);
    expect(retry).toEqual(first);
    expect(readQueue('retry-user')).toEqual([]);
  });

  it('retains definitive and explicit rejections without retrying them', async () => {
    const request = jest.mocked(requestJson);
    request.mockResolvedValueOnce({ command: { status: 'rejected' } });
    expect(await syncResidentActivity('reject-user', command)).toBe('rejected');
    expect(readQueue('reject-user')).toEqual([]);
    expect(readRejected('reject-user')).toEqual([command]);
    await retryResidentActivities('reject-user');
    expect(request).toHaveBeenCalledTimes(1);
    request.mockRejectedValueOnce(
      new (jest.requireMock('../../../api/client').ApiError)(409),
    );
    expect(await syncResidentActivity('reject-user', inspectionCommand)).toBe(
      'rejected',
    );
    expect(readRejected('reject-user')).toEqual([command, inspectionCommand]);
    expect(nextInspectionVersion('reject-user', 'inspection-1', 3)).toBe(3);
    expect(readRejected('other-user')).toEqual([]);
    clearQueue('reject-user');
    expect(readRejected('reject-user')).toEqual([]);
  });

  it('does not POST an ID already rejected and clears all states on 401', async () => {
    const request = jest.mocked(requestJson);
    enqueue('expiry-user', command);
    rejectCommand('expiry-user', command.clientCommandId);
    expect(await syncResidentActivity('expiry-user', command)).toBe('rejected');
    expect(request).not.toHaveBeenCalled();

    enqueue('expiry-user', {
      ...command,
      clientCommandId: 'pending-before-401',
    });
    request.mockRejectedValueOnce(
      new (jest.requireMock('../../../api/client').ApiError)(401),
    );
    expect(await syncResidentActivity('expiry-user', inspectionCommand)).toBe(
      'rejected',
    );
    expect(readQueue('expiry-user')).toEqual([]);
    expect(readRejected('expiry-user')).toEqual([]);
  });

  it('counts rejected entries toward the bounded queue and retains each payload unchanged', () => {
    const entries: InspectionCommand[] = [
      {
        ...inspectionCommand,
        commandType: 'inspection.start',
        clientCommandId: 'start',
        payload: {},
      },
      inspectionCommand,
      {
        ...inspectionCommand,
        commandType: 'inspection.finding',
        clientCommandId: 'finding',
        payload: {
          checklistKey: 'safety',
          description: 'issue',
          result: 'needs_action',
        },
      },
    ];
    for (const entry of entries) {
      enqueue('payload-user', entry);
    }
    const resident = { ...command, clientCommandId: 'resident-payload' };
    enqueue('payload-user', resident);
    rejectCommand('payload-user', entries[0].clientCommandId);
    expect(readQueue('payload-user')).toEqual([
      entries[1],
      entries[2],
      resident,
    ]);
    expect(readRejected('payload-user')).toEqual([entries[0]]);
    for (let i = 0; i < 16; i++)
      enqueue('payload-user', { ...command, clientCommandId: `limit-${i}` });
    expect(() =>
      enqueue('payload-user', { ...command, clientCommandId: 'over-limit' }),
    ).toThrow('QUEUE_FULL');
  });
});
