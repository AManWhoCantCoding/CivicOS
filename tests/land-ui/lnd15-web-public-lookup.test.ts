import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildPublicLandLookupQuery,
  fetchPublicLandLookup,
  LAND_PUBLIC_LOOKUP_URL,
} from '@/components/land/land-api';
import { mapPublicLookupError } from '@/components/land/PublicLandLookup';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// LND-15 assertions follow the ticket AC/test-skeleton and screen-05 textual
// handoff. The public client is projection-only and never passes through the
// authenticated land detail surfaces.
describe('LND-15 public lookup request and projection boundary', () => {
  it('sends exactly one selected query key and keeps only eight result fields', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        seen.push(url);
        return jsonResponse(
          {
            lookup: {
              applicationCode: 'APP-001',
              parcelCode: 'PARCEL-001',
              mapSheetNumber: '12',
              parcelNumber: '34',
              status: 'completed',
              submittedAt: '2026-09-30T00:00:00.000Z',
              updatedAt: '2026-09-30T01:00:00.000Z',
              completedAt: '2026-09-30T02:00:00.000Z',
              partyName: 'Should not reach the UI',
              address: 'Should not reach the UI',
              polygon: { type: 'Polygon' },
              storageKey: 'internal/key',
            },
            simulated: true,
          },
          200,
        );
      }),
    );

    const result = await fetchPublicLandLookup('applicationCode', ' APP-001 ');

    expect(seen).toEqual([`${LAND_PUBLIC_LOOKUP_URL}?applicationCode=APP-001`]);
    expect(buildPublicLandLookupQuery('parcelCode', ' PARCEL-001 ')).toBe(
      `${LAND_PUBLIC_LOOKUP_URL}?parcelCode=PARCEL-001`,
    );
    expect([
      ...new URL(seen[0], 'http://localhost').searchParams.keys(),
    ]).toEqual(['applicationCode']);
    expect(result.simulated).toBe(true);
    expect(result.lookup).toEqual({
      applicationCode: 'APP-001',
      parcelCode: 'PARCEL-001',
      mapSheetNumber: '12',
      parcelNumber: '34',
      status: 'completed',
      submittedAt: '2026-09-30T00:00:00.000Z',
      updatedAt: '2026-09-30T01:00:00.000Z',
      completedAt: '2026-09-30T02:00:00.000Z',
    });
    expect(Object.keys(result.lookup ?? {})).toEqual([
      'applicationCode',
      'parcelCode',
      'mapSheetNumber',
      'parcelNumber',
      'status',
      'submittedAt',
      'updatedAt',
      'completedAt',
    ]);
  });

  it('does not call the network for blank or invalid mode input', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const blank = await fetchPublicLandLookup('applicationCode', '   ');
    const invalidMode = await fetchPublicLandLookup(
      'both' as 'applicationCode',
      'APP-001',
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(blank).toMatchObject({
      status: 400,
      error: { code: 'LAND_LOOKUP_QUERY_INVALID' },
    });
    expect(invalidMode).toMatchObject({
      status: 400,
      error: { code: 'LAND_LOOKUP_QUERY_INVALID' },
    });
  });

  it('preserves the mapped invalid response when the API returns 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            code: 'LAND_LOOKUP_QUERY_INVALID',
            error: 'Cần cung cấp chính xác một mã hồ sơ hoặc mã thửa.',
          },
          400,
        ),
      ),
    );

    const result = await fetchPublicLandLookup('parcelCode', 'PARCEL-001');

    expect(result.error).toEqual({
      status: 400,
      code: 'LAND_LOOKUP_QUERY_INVALID',
    });
  });
});

describe('LND-15 not-found, rate-limit and transport states', () => {
  it.each([
    [404, 'LAND_LOOKUP_NOT_FOUND'],
    [429, 'LAND_RATE_LIMITED'],
  ] as const)(
    'keeps %s API errors redacted and retryable',
    async (status, code) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => jsonResponse({ code, error: 'safe error' }, status)),
      );

      const result = await fetchPublicLandLookup('parcelCode', 'PARCEL-001');
      const mapped = mapPublicLookupError(code, result.status, true);

      expect(result.lookup).toBeNull();
      expect(result.error?.code).toBe(code);
      expect(mapped.code).toBe(code);
      expect(mapped.retryable).toBe(true);
    },
  );

  it('maps offline and network failures without automatic retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network unavailable');
      }),
    );

    const result = await fetchPublicLandLookup('applicationCode', 'APP-001');

    expect(result.status).toBe(0);
    expect(mapPublicLookupError(null, result.status, false)).toMatchObject({
      code: 'LAND_LOOKUP_OFFLINE',
      retryable: true,
    });
    expect(mapPublicLookupError(null, result.status, true)).toMatchObject({
      code: 'LAND_LOOKUP_NETWORK_ERROR',
      retryable: true,
    });
  });
});

describe('LND-15 screen-05 accessibility, state and redaction surfaces', () => {
  const pageSource = readSource('src/app/public/land/lookup/page.tsx');
  const componentSource = readSource(
    'src/components/land/PublicLandLookup.tsx',
  );

  it('uses a standalone anonymous page and keeps input/mode for retry', () => {
    expect(pageSource).not.toContain('getCurrentUser');
    expect(pageSource).not.toContain('ModuleShell');
    expect(pageSource).not.toContain('SessionControls');
    expect(componentSource).toContain('value={code}');
    expect(componentSource).toContain('checked={mode ===');
    expect(componentSource).toContain('onClick={() => void submitLookup()}');
    expect(componentSource).not.toContain('setTimeout');
    expect(componentSource).not.toContain('setInterval');
  });

  it('renders the required state and keyboard-accessible surfaces', () => {
    for (const field of [
      'applicationCode',
      'parcelCode',
      'mapSheetNumber',
      'parcelNumber',
      'status',
      'submittedAt',
      'updatedAt',
      'completedAt',
    ]) {
      expect(componentSource).toContain(field);
    }
    expect(componentSource).toContain('Mô phỏng · simulated');
    expect(componentSource).toContain('LAND_LOOKUP_QUERY_INVALID');
    expect(componentSource).toContain('LAND_LOOKUP_NOT_FOUND');
    expect(componentSource).toContain('LAND_RATE_LIMITED');
    expect(componentSource).toContain('LAND_LOOKUP_OFFLINE');
    expect(componentSource).toContain('role="status"');
    expect(componentSource).toContain('role="alert"');
    expect(componentSource).toContain('aria-describedby');
    expect(componentSource).toContain('noValidate');
    expect(componentSource).toContain('min-h-[44px]');
    expect(componentSource).toContain('Thử lại');
  });

  it('does not render internal fields or official wording', () => {
    for (const forbidden of [
      'party',
      'address',
      'polygon',
      'sync',
      'approval',
      'audit',
      'Evidence',
      'storageKey',
      'chính thức',
      'certified',
    ]) {
      const forbiddenPattern = new RegExp(`\\b${forbidden}\\b`, 'i');
      expect(componentSource).not.toMatch(forbiddenPattern);
      expect(pageSource).not.toMatch(forbiddenPattern);
    }
  });
});
