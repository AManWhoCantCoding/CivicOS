import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/public/land/lookup/route';
import { prisma } from '@/lib/prisma';

const ROW = {
  applicationCode: 'APP-001',
  parcelCode: 'PARCEL-001',
  mapSheetNumber: '12',
  parcelNumber: '34',
  status: 'completed',
  submittedAt: new Date('2026-09-30T00:00:00.000Z'),
  updatedAt: new Date('2026-09-30T01:00:00.000Z'),
  completedAt: new Date('2026-09-30T02:00:00.000Z'),
};

function request(query: string, ip: string): Request {
  return new Request(`http://localhost/api/public/land/lookup${query}`, {
    headers: { 'x-forwarded-for': ip },
  });
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LND-14 public land lookup', () => {
  it('returns the exact projection for an application code', async () => {
    const querySpy = vi
      .spyOn(prisma, '$queryRaw')
      .mockResolvedValue([ROW] as never);

    const response = await GET(
      request('?applicationCode=APP-001', '198.51.100.14'),
    );

    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({
      lookup: {
        applicationCode: 'APP-001',
        parcelCode: 'PARCEL-001',
        mapSheetNumber: '12',
        parcelNumber: '34',
        status: 'completed',
        submittedAt: '2026-09-30T00:00:00.000Z',
        updatedAt: '2026-09-30T01:00:00.000Z',
        completedAt: '2026-09-30T02:00:00.000Z',
      },
      simulated: true,
    });
    expect(querySpy).toHaveBeenCalledTimes(1);
  });

  it('returns the exact projection for a parcel code without a session', async () => {
    const querySpy = vi
      .spyOn(prisma, '$queryRaw')
      .mockResolvedValue([ROW] as never);

    const response = await GET(
      request('?parcelCode=PARCEL-001', '198.51.100.15'),
    );

    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({
      lookup: {
        applicationCode: 'APP-001',
        parcelCode: 'PARCEL-001',
        mapSheetNumber: '12',
        parcelNumber: '34',
        status: 'completed',
        submittedAt: '2026-09-30T00:00:00.000Z',
        updatedAt: '2026-09-30T01:00:00.000Z',
        completedAt: '2026-09-30T02:00:00.000Z',
      },
      simulated: true,
    });
    expect(querySpy).toHaveBeenCalledTimes(1);
  });

  it('rejects missing and both keys before any detail query', async () => {
    const querySpy = vi.spyOn(prisma, '$queryRaw');

    const missing = await GET(request('', '198.51.100.16'));
    const both = await GET(
      request(
        '?applicationCode=APP-001&parcelCode=PARCEL-001',
        '198.51.100.17',
      ),
    );

    expect(missing.status).toBe(400);
    expect(both.status).toBe(400);
    expect(await body(missing)).toMatchObject({
      code: 'LAND_LOOKUP_QUERY_INVALID',
      error: 'Cần cung cấp chính xác một mã hồ sơ hoặc mã thửa.',
    });
    expect(await body(both)).toMatchObject({
      code: 'LAND_LOOKUP_QUERY_INVALID',
      error: 'Cần cung cấp chính xác một mã hồ sơ hoặc mã thửa.',
    });
    expect(querySpy).not.toHaveBeenCalled();
  });

  it('returns a redacted not-found error', async () => {
    const querySpy = vi
      .spyOn(prisma, '$queryRaw')
      .mockResolvedValue([] as never);

    const response = await GET(
      request('?applicationCode=UNKNOWN', '198.51.100.18'),
    );
    const result = await body(response);
    const serialized = JSON.stringify(result);

    expect(response.status).toBe(404);
    expect(result).toEqual({
      code: 'LAND_LOOKUP_NOT_FOUND',
      error: 'Không tìm thấy kết quả tra cứu.',
    });
    expect(serialized).not.toMatch(
      /party|pii|address|polygon|sync|approval|evidence|storageKey/i,
    );
    expect(querySpy).toHaveBeenCalledTimes(1);
  });

  it('limits the 61st request from one IP without querying after quota', async () => {
    const querySpy = vi
      .spyOn(prisma, '$queryRaw')
      .mockResolvedValue([ROW] as never);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T00:00:00.000Z'));

    try {
      const statuses: number[] = [];
      let limitedBody: Record<string, unknown> | undefined;
      for (let index = 0; index < 61; index += 1) {
        const response = await GET(
          request('?applicationCode=APP-001', '198.51.100.19'),
        );
        statuses.push(response.status);
        if (index === 60) limitedBody = await body(response);
      }

      expect(statuses.slice(0, 60)).toEqual(Array(60).fill(200));
      expect(statuses[60]).toBe(429);
      expect(limitedBody).toEqual({
        code: 'LAND_RATE_LIMITED',
        error: 'Bạn đã vượt quá số lần tra cứu cho phép; hãy thử lại sau.',
      });
      expect(querySpy).toHaveBeenCalledTimes(60);
    } finally {
      vi.useRealTimers();
    }
  });
});
