import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/identity', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/modules/incidents', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/incidents')>()),
  listIntakeReports: vi.fn(),
  registerIntakeReport: vi.fn().mockResolvedValue({ reportId: 'report-1' }),
}));

import { POST } from '@/app/api/intake-reports/route';
import { getCurrentUser } from '@/modules/identity';
import { registerIntakeReport } from '@/modules/incidents';

afterEach(() => vi.restoreAllMocks());

describe('POST /api/intake-reports', () => {
  it('replaces a forged client receipt timestamp with server time', async () => {
    const receivedAt = '2026-10-27T12:34:56.000Z';
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'officer' } as never);
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(receivedAt);
    const response = await POST(
      new Request('http://localhost/api/intake-reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceChannel: 'direct',
          content: 'report',
          receivedAt: '1999-01-01T00:00:00.000Z',
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect(vi.mocked(registerIntakeReport)).toHaveBeenCalledWith(
      expect.objectContaining({ receivedAt }),
      expect.anything(),
    );
  });
});
