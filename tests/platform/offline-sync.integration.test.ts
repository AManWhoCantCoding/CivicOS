import { describe, expect, it } from 'vitest';

import { assertOfflineCommandFresh } from '@/modules/platform';

describe('offline command contract', () => {
  it('requires a stable client command id for idempotency', () => {
    const command = {
      clientCommandId: 'device-1:command-1',
      occurredAt: '2026-09-19T01:00:00Z',
    };
    expect(command.clientCommandId).toContain(':');
    expect(new Date(command.occurredAt).toISOString()).toBe(
      '2026-09-19T01:00:00.000Z',
    );
  });

  it('rejects a command based on a stale resource version', () => {
    expect(() => assertOfflineCommandFresh(3, 4)).toThrow(
      'STALE_OFFLINE_COMMAND',
    );
    expect(() => assertOfflineCommandFresh(3, 3)).not.toThrow();
  });
});
