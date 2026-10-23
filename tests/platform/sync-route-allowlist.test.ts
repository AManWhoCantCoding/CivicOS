import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  actor: { id: 'field-officer', roles: ['field_officer'] },
  getCurrentUser: vi.fn(),
  assertAccess: vi.fn(),
  acceptOfflineCommand: vi.fn(),
  markOfflineCommandSyncing: vi.fn(),
  completeOfflineCommand: vi.fn(),
  rejectOfflineCommand: vi.fn(),
  failOfflineCommand: vi.fn(),
  listOfflineCommands: vi.fn(),
  startInspection: vi.fn(),
  saveChecklistResponses: vi.fn(),
  recordFinding: vi.fn(),
  completeInspection: vi.fn(),
  recordVehicleObservation: vi.fn(),
}));

vi.mock('@/modules/identity', () => ({
  assertAccess: routeMocks.assertAccess,
  getCurrentUser: routeMocks.getCurrentUser,
}));

vi.mock('@/modules/platform', () => ({
  acceptOfflineCommand: routeMocks.acceptOfflineCommand,
  completeOfflineCommand: routeMocks.completeOfflineCommand,
  failOfflineCommand: routeMocks.failOfflineCommand,
  listOfflineCommands: routeMocks.listOfflineCommands,
  markOfflineCommandSyncing: routeMocks.markOfflineCommandSyncing,
  rejectOfflineCommand: routeMocks.rejectOfflineCommand,
}));

vi.mock('@/modules/inspections', () => ({
  completeInspection: routeMocks.completeInspection,
  recordFinding: routeMocks.recordFinding,
  saveChecklistResponses: routeMocks.saveChecklistResponses,
  startInspection: routeMocks.startInspection,
}));

vi.mock('@/modules/vehicles', () => ({
  recordVehicleObservation: routeMocks.recordVehicleObservation,
}));

import { POST } from '@/app/api/sync/route';

const commandId = 'client-command-1';
const inspectionId = 'inspection-1';
const baseVersion = 4;
const occurredAt = '2026-10-22T10:00:00.000Z';

function offlineCommand(commandType: string, payload: Record<string, unknown>) {
  return {
    id: 'offline-command-row-1',
    clientCommandId: commandId,
    actorId: routeMocks.actor.id,
    commandType,
    resourceType: 'Inspection',
    resourceId: inspectionId,
    occurredAt: new Date(occurredAt),
    payload,
    payloadVersion: 1,
    baseVersion,
    status: 'pending',
  };
}

async function postCommand(
  commandType: string,
  payload: Record<string, unknown> = {},
) {
  routeMocks.acceptOfflineCommand.mockResolvedValueOnce(
    offlineCommand(commandType, payload),
  );
  return POST(
    new Request('http://localhost/api/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientCommandId: commandId,
        commandType,
        resourceType: 'Inspection',
        resourceId: inspectionId,
        occurredAt,
        payload,
        payloadVersion: 1,
        baseVersion,
      }),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getCurrentUser.mockResolvedValue(routeMocks.actor);
  routeMocks.assertAccess.mockResolvedValue(undefined);
  routeMocks.markOfflineCommandSyncing.mockResolvedValue(undefined);
  routeMocks.completeOfflineCommand.mockResolvedValue({
    clientCommandId: commandId,
    status: 'synced',
  });
  routeMocks.rejectOfflineCommand.mockResolvedValue({
    clientCommandId: commandId,
    status: 'rejected',
    error: 'UNSUPPORTED_OFFLINE_COMMAND',
  });
  routeMocks.startInspection.mockResolvedValue({
    id: inspectionId,
    status: 'in_progress',
    version: baseVersion + 1,
  });
  routeMocks.saveChecklistResponses.mockResolvedValue({
    id: inspectionId,
    status: 'in_progress',
    version: baseVersion + 1,
  });
  routeMocks.recordFinding.mockResolvedValue({
    id: 'finding-1',
    severity: 'low',
    category: 'safety',
    evidenceIds: [],
  });
});

describe('BP-BE-01 / D-22: /api/sync inspection allowlist', () => {
  it('persists inspection.complete as rejected and never invokes completion', async () => {
    const response = await postCommand('inspection.complete', {
      result: 'passed',
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      command: {
        clientCommandId: commandId,
        status: 'rejected',
        error: 'UNSUPPORTED_OFFLINE_COMMAND',
      },
    });
    expect(routeMocks.rejectOfflineCommand).toHaveBeenCalledWith(
      commandId,
      'UNSUPPORTED_OFFLINE_COMMAND',
    );
    expect(routeMocks.completeInspection).not.toHaveBeenCalled();
    expect(routeMocks.startInspection).not.toHaveBeenCalled();
    expect(routeMocks.saveChecklistResponses).not.toHaveBeenCalled();
    expect(routeMocks.recordFinding).not.toHaveBeenCalled();
    expect(routeMocks.recordVehicleObservation).not.toHaveBeenCalled();
    expect(routeMocks.completeOfflineCommand).not.toHaveBeenCalled();
    expect(routeMocks.failOfflineCommand).not.toHaveBeenCalled();
  });

  it.each([
    {
      commandType: 'inspection.start',
      payload: {},
      dispatch: () => routeMocks.startInspection,
    },
    {
      commandType: 'inspection.save_checklist',
      payload: { responses: [{ key: 'safety', value: 'yes' }] },
      dispatch: () => routeMocks.saveChecklistResponses,
    },
    {
      commandType: 'inspection.finding',
      payload: {
        checklistKey: 'safety',
        description: 'Exit is unobstructed',
        result: 'pass',
      },
      dispatch: () => routeMocks.recordFinding,
    },
  ])(
    'continues to sync $commandType offline',
    async ({ commandType, payload, dispatch }) => {
      const response = await postCommand(commandType, payload);

      expect(response.status).toBe(200);
      expect((await response.json()).command).toMatchObject({
        clientCommandId: commandId,
        status: 'synced',
      });
      expect(dispatch()).toHaveBeenCalled();
      expect(routeMocks.completeOfflineCommand).toHaveBeenCalledWith(
        commandId,
        expect.objectContaining({ result: expect.any(Object) }),
      );
    },
  );
});
