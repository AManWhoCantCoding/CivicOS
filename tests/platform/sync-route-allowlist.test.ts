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
  recordActivity: vi.fn(),
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

vi.mock('@/modules/residents', () => ({
  recordActivity: routeMocks.recordActivity,
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
  routeMocks.recordActivity.mockResolvedValue({ id: 'activity-1' });
});

describe('BP-BE-01 / D-22: /api/sync inspection allowlist', () => {
  it.each(
    [
      'resident.record_activity',
      'inspection.start',
      'inspection.save_checklist',
      'inspection.finding',
    ].flatMap((commandType) =>
      [
        ['missing', undefined],
        ['negative', -1],
        ['fractional', 1.5],
        ['string', '4'],
      ].map(([caseName, invalidVersion]) => [
        commandType,
        caseName,
        invalidVersion,
      ]),
    ),
  )(
    'rejects %s baseVersion for %s before access or storage',
    async (commandType, caseName, invalidVersion) => {
      const body: Record<string, unknown> = {
        clientCommandId: commandId,
        commandType,
        resourceType: 'Inspection',
        resourceId: inspectionId,
        occurredAt,
        payload: {},
      };
      if (caseName !== 'missing') body.baseVersion = invalidVersion;
      const response = await POST(
        new Request('http://localhost/api/sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'INVALID_BASE_VERSION' });
      expect(routeMocks.assertAccess).not.toHaveBeenCalled();
      expect(routeMocks.acceptOfflineCommand).not.toHaveBeenCalled();
      expect(routeMocks.startInspection).not.toHaveBeenCalled();
      expect(routeMocks.saveChecklistResponses).not.toHaveBeenCalled();
      expect(routeMocks.recordFinding).not.toHaveBeenCalled();
      expect(routeMocks.recordActivity).not.toHaveBeenCalled();
    },
  );

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

describe('D-22 / D-63: /api/sync resident.record_activity offline', () => {
  const recordId = 'record-1';

  function residentCommand(
    overrides: Partial<{
      commandType: string;
      payload: Record<string, unknown>;
      status: string;
      error: string | null;
    }> = {},
  ) {
    return {
      id: 'offline-command-row-1',
      clientCommandId: commandId,
      actorId: routeMocks.actor.id,
      commandType: 'resident.record_activity',
      resourceType: 'SubjectManagementRecord',
      resourceId: recordId,
      occurredAt: new Date(occurredAt),
      payload: {},
      payloadVersion: 1,
      baseVersion,
      status: 'pending',
      error: null,
      ...overrides,
    };
  }

  async function postResidentActivity(
    commandOverrides: Parameters<typeof residentCommand>[0] = {},
    { bodyPayload }: { bodyPayload?: Record<string, unknown> } = {},
  ) {
    const command = residentCommand(commandOverrides);
    const payload =
      bodyPayload ??
      (command.payload as Record<string, unknown> | undefined) ??
      {};
    routeMocks.acceptOfflineCommand.mockResolvedValueOnce(command);
    return POST(
      new Request('http://localhost/api/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientCommandId: commandId,
          commandType: 'resident.record_activity',
          resourceType: 'SubjectManagementRecord',
          resourceId: recordId,
          occurredAt,
          payload,
          payloadVersion: 1,
          baseVersion,
        }),
      }),
    );
  }

  it('dispatches to recordActivity with resourceId, occurredAt and the client command id as idempotency key', async () => {
    const response = await postResidentActivity({
      payload: {
        activityType: 'visit',
        content: 'Tham gia sinh hoạt',
        evaluation: 'good',
        latitude: 21.02,
        longitude: 105.83,
      },
    });

    expect(response.status).toBe(200);
    expect((await response.json()).command).toMatchObject({
      clientCommandId: commandId,
      status: 'synced',
    });
    expect(routeMocks.recordActivity).toHaveBeenCalledWith(
      {
        recordId,
        activityType: 'visit',
        occurredAt,
        content: 'Tham gia sinh hoạt',
        evaluation: 'good',
        latitude: 21.02,
        longitude: 105.83,
        evidenceIds: undefined,
        idempotencyKey: commandId,
      },
      routeMocks.actor,
    );
    expect(routeMocks.completeOfflineCommand).toHaveBeenCalledWith(commandId, {
      result: { activityId: 'activity-1' },
    });
  });

  it('synces support an idempotent retry of an already synced client command without re-dispatching', async () => {
    const response = await postResidentActivity({ status: 'synced' });

    expect(response.status).toBe(200);
    expect(routeMocks.recordActivity).not.toHaveBeenCalled();
    expect(routeMocks.completeOfflineCommand).not.toHaveBeenCalled();
  });

  it('returns a previously rejected command without re-dispatching activity', async () => {
    const response = await postResidentActivity({
      status: 'rejected',
      error: 'CONTENT_REQUIRED',
    });

    expect(response.status).toBe(409);
    expect((await response.json()).command).toMatchObject({
      clientCommandId: commandId,
      status: 'rejected',
      error: 'CONTENT_REQUIRED',
    });
    expect(routeMocks.recordActivity).not.toHaveBeenCalled();
  });

  it.each([
    { error: 'CONTENT_REQUIRED' },
    { error: 'RECORD_LOCKED' },
    { error: 'GEOPOINT_INCOMPLETE' },
    { error: 'RECORD_NOT_FOUND' },
    { error: 'FORBIDDEN' },
  ])(
    'classifies deterministic activity error $error as rejected, not transient',
    async ({ error }) => {
      routeMocks.recordActivity.mockRejectedValueOnce(new Error(error));
      routeMocks.rejectOfflineCommand.mockImplementationOnce(
        async (id: string, rejectedError: string) => ({
          clientCommandId: id,
          status: 'rejected',
          error: rejectedError,
        }),
      );

      const response = await postResidentActivity({
        payload: { activityType: 'visit', content: 'Ghi nhận hoạt động' },
      });

      expect(response.status).toBe(409);
      expect((await response.json()).command).toMatchObject({
        clientCommandId: commandId,
        status: 'rejected',
        error,
      });
      expect(routeMocks.rejectOfflineCommand).toHaveBeenCalledWith(
        commandId,
        error,
      );
      expect(routeMocks.failOfflineCommand).not.toHaveBeenCalled();
      expect(routeMocks.completeOfflineCommand).not.toHaveBeenCalled();
    },
  );

  it('keeps resident.allowlist closed: unsupported resident command types stay rejected', async () => {
    const response = await postResidentActivity({
      commandType: 'resident.raise_risk',
      payload: {},
    });

    expect(response.status).toBe(409);
    expect((await response.json()).command).toMatchObject({
      clientCommandId: commandId,
      status: 'rejected',
      error: 'UNSUPPORTED_OFFLINE_COMMAND',
    });
    expect(routeMocks.recordActivity).not.toHaveBeenCalled();
  });
});
