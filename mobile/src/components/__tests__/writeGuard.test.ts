import { assertReadOnly } from '../WriteGuard';

describe('read-only guard', () => {
  it('blocks all write commands and never produces a request', () => {
    expect(assertReadOnly('POST', true)).toEqual({
      allowed: false,
      reason: 'MAP_OFFLINE_WRITE_BLOCKED',
    });
    expect(assertReadOnly('PATCH', false)).toEqual({
      allowed: false,
      reason: 'READ_ONLY_MVP',
    });
  });

  it('allows only the session login/logout boundary', () => {
    expect(assertReadOnly('POST', false, '/api/auth/session')).toBeNull();
    expect(assertReadOnly('DELETE', false, '/api/auth/session')).toBeNull();
    expect(assertReadOnly('POST', false, '/api/related-info/search')).toEqual({
      allowed: false,
      reason: 'READ_ONLY_MVP',
    });
  });
  it('allows only exact approved sync command schemas', () => {
    const command = {
      commandType: 'resident.record_activity',
      resourceType: 'SubjectManagementRecord',
      resourceId: 'record-1',
      clientCommandId: 'stable-1',
      occurredAt: '2026-01-01T00:00:00.000Z',
      payloadVersion: 1,
      baseVersion: 4,
      payload: { activityType: 'followup', content: 'visited' },
    };
    const body = JSON.stringify(command);
    expect(assertReadOnly('POST', false, '/api/sync', body)).toBeNull();
    expect(assertReadOnly('POST', false, '/api/sync?x=1', body)).not.toBeNull();
    expect(assertReadOnly('PUT', false, '/api/sync', body)).not.toBeNull();
    const inspection = {
      ...command,
      commandType: 'inspection.start',
      resourceType: 'Inspection',
      resourceId: 'inspection-1',
      payload: {},
    };
    expect(
      assertReadOnly('POST', false, '/api/sync', JSON.stringify(inspection)),
    ).toBeNull();
    for (const [commandType, payload] of [
      [
        'inspection.save_checklist',
        { responses: [{ key: 'a', value: 'yes' }] },
      ],
      [
        'inspection.finding',
        {
          checklistKey: 'a',
          description: 'issue',
          result: 'needs_action',
          severity: 'high',
        },
      ],
    ])
      expect(
        assertReadOnly(
          'POST',
          false,
          '/api/sync',
          JSON.stringify({ ...inspection, commandType, payload }),
        ),
      ).toBeNull();
    for (const forbidden of [
      {
        ...inspection,
        commandType: 'inspection.complete',
        payload: { result: 'pass' },
      },
      {
        ...inspection,
        commandType: 'inspection.start',
        payload: { arbitrary: true },
      },
      {
        ...inspection,
        commandType: 'inspection.finding',
        payload: {
          checklistKey: 'a',
          description: 'x',
          result: 'x',
          evidenceIds: [],
        },
      },
      {
        ...inspection,
        commandType: 'inspection.save_checklist',
        payload: { responses: [{ key: 'a', value: 'x', extra: true }] },
      },
      {
        ...inspection,
        commandType: 'inspection.finding',
        payload: { checklistKey: 'a', description: 'x', result: 'fail' },
      },
      { ...inspection, unexpected: true },
      { ...inspection, baseVersion: -1 },
      { ...inspection, occurredAt: 'not-a-date' },
    ])
      expect(
        assertReadOnly('POST', false, '/api/sync', JSON.stringify(forbidden)),
      ).not.toBeNull();
    expect(
      assertReadOnly(
        'POST',
        false,
        '/api/sync',
        JSON.stringify({ ...command, baseVersion: undefined }),
      ),
    ).not.toBeNull();
    expect(
      assertReadOnly(
        'POST',
        false,
        '/api/sync',
        JSON.stringify({
          ...command,
          payload: { ...command.payload, gps: 'x' },
        }),
      ),
    ).not.toBeNull();
  });
});
