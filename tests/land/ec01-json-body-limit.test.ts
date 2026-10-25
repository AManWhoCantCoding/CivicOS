import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

// EC-01 (F-01..F-04): every JSON mutation route under /api/land rejects a
// request body larger than 1 MiB (1,048,576 bytes) with 400
// LAND_INVALID_REQUEST before any mutation function runs. Exactly 1 MiB is
// not oversized. Verified at the API-route seam with mocked Land service.

const routeMocks = vi.hoisted(() => ({
  actor: {
    id: 'ec01-officer',
    email: 'ec01-officer@demo.local',
    name: 'EC01 Officer',
    roles: ['land_officer'],
    organizationUnitId: 'ou-a',
  },
  requireLandActor: vi.fn(),
  createParcel: vi.fn(),
  createApplication: vi.fn(),
  reviewApplication: vi.fn(),
  approveApplication: vi.fn(),
  rejectApplication: vi.fn(),
  syncApplication: vi.fn(),
  retryApplicationSync: vi.fn(),
}));

vi.mock('@/modules/land', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/land')>();
  return {
    ...actual,
    createParcel: routeMocks.createParcel,
    createApplication: routeMocks.createApplication,
    reviewApplication: routeMocks.reviewApplication,
    approveApplication: routeMocks.approveApplication,
    rejectApplication: routeMocks.rejectApplication,
    syncApplication: routeMocks.syncApplication,
    retryApplicationSync: routeMocks.retryApplicationSync,
  };
});
vi.mock('@/modules/land/access', () => ({
  requireLandActor: routeMocks.requireLandActor,
}));

import { LAND_JSON_BODY_LIMIT_BYTES } from '@/app/api/land/json-body';
import * as applicationsRoute from '@/app/api/land/applications/route';
import * as approveRoute from '@/app/api/land/applications/[applicationId]/approve/route';
import * as rejectRoute from '@/app/api/land/applications/[applicationId]/reject/route';
import * as reviewRoute from '@/app/api/land/applications/[applicationId]/review/route';
import * as syncRetryRoute from '@/app/api/land/applications/[applicationId]/sync/retry/route';
import * as syncRoute from '@/app/api/land/applications/[applicationId]/sync/route';
import * as parcelsRoute from '@/app/api/land/parcels/route';

type LandRoute = {
  POST: (...args: never[]) => Promise<Response>;
};

const LIMIT = LAND_JSON_BODY_LIMIT_BYTES;
expect(LIMIT).toBe(1_048_576);

const encoder = new TextEncoder();

// Valid parcel JSON (would pass parseParcelInput) whose encoded size exceeds the
// limit, so any rejection is attributable to size, not parsing or validation.
function oversizedValidJson(): string {
  return JSON.stringify({
    parcelCode: 'EC01-PARCEL',
    mapSheetNumber: 'SHEET-01',
    parcelNumber: 'PARCEL-01',
    areaSqm: '1.00',
    landUseType: 'residential',
    address: 'x'.repeat(LIMIT),
    communeCode: 'COMMUNE-01',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [105, 20],
          [105.001, 20],
          [105.001, 20.001],
          [105, 20.001],
          [105, 20],
        ],
      ],
    },
  });
}

function jsonRequest(body: string, headers?: Record<string, string>): Request {
  return new Request('http://localhost/api/land/parcels', {
    method: 'POST',
    headers,
    body,
  });
}

// Stream-backed request with a caller-controlled Content-Length header, used
// to prove the cap is enforced on actual bytes, not the header alone.
function streamRequest(body: string, declaredContentLength?: string): Request {
  const bytes = encoder.encode(body);
  return new Request('http://localhost/api/land/parcels', {
    method: 'POST',
    headers:
      declaredContentLength === undefined
        ? undefined
        : { 'content-length': declaredContentLength },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
    duplex: 'half',
  } as RequestInit);
}

// Exactly-at-limit valid parcel JSON; adjusts address padding until the UTF-8 byte
// length equals the limit.
function exactlyLimitParcelJson(): string {
  const base = {
    parcelCode: 'EC01-PARCEL',
    mapSheetNumber: 'SHEET-01',
    parcelNumber: 'PARCEL-01',
    areaSqm: '1.00',
    landUseType: 'residential',
    address: '',
    communeCode: 'COMMUNE-01',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [105, 20],
          [105.001, 20],
          [105.001, 20.001],
          [105, 20.001],
          [105, 20],
        ],
      ],
    },
  };
  const emptyLength = encoder.encode(JSON.stringify(base)).byteLength;
  const paddingLength = LIMIT - emptyLength;
  if (paddingLength < 0) throw new Error('valid parcel body exceeds limit');
  const body = JSON.stringify({ ...base, address: 'x'.repeat(paddingLength) });
  if (encoder.encode(body).byteLength !== LIMIT)
    throw new Error('unable to build exactly-limit body');
  return body;
}

const mutationMocksByRouteName: Record<string, Mock> = {
  parcels: routeMocks.createParcel,
  applications: routeMocks.createApplication,
  review: routeMocks.reviewApplication,
  approve: routeMocks.approveApplication,
  reject: routeMocks.rejectApplication,
  sync: routeMocks.syncApplication,
  'sync/retry': routeMocks.retryApplicationSync,
};

const routeByName: Array<[string, LandRoute]> = [
  ['parcels', parcelsRoute],
  ['applications', applicationsRoute],
  ['review', reviewRoute],
  ['approve', approveRoute],
  ['reject', rejectRoute],
  ['sync', syncRoute],
  ['sync/retry', syncRetryRoute],
];

const dynamicRoutes = new Set([
  'review',
  'approve',
  'reject',
  'sync',
  'sync/retry',
]);

function callPost(
  route: LandRoute,
  name: string,
  request: Request,
): Promise<Response> {
  const context = dynamicRoutes.has(name)
    ? {
        params: Promise.resolve({ applicationId: 'application-a' }),
      }
    : undefined;
  const post = route.POST as (
    request: Request,
    context?: unknown,
  ) => Promise<Response>;
  return post(request, context);
}

beforeEach(() => {
  routeMocks.requireLandActor.mockReset();
  routeMocks.requireLandActor.mockResolvedValue(routeMocks.actor);
  for (const mock of new Set(Object.values(mutationMocksByRouteName))) {
    mock.mockReset();
    mock.mockResolvedValue({ id: 'ec01-result' });
  }
});

describe('EC-01 JSON mutation bodies over 1 MiB', () => {
  it.each(routeByName)(
    '%s route: 400 LAND_INVALID_REQUEST, mutation not invoked',
    async (name, route) => {
      const mutation = mutationMocksByRouteName[name];
      const response = await callPost(
        route,
        name,
        jsonRequest(oversizedValidJson(), {
          'If-Match-Version': '1',
        }),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as { code: string };
      expect(body.code).toBe('LAND_INVALID_REQUEST');
      expect(mutation).not.toHaveBeenCalled();
    },
  );
});

describe('EC-01 size gate is not fooled by Content-Length', () => {
  it.each([[syncRoute, 'sync', routeMocks.syncApplication]] as const)(
    '%s route: declared tiny header, oversized actual bytes',
    async (route, name, mutation) => {
      const response = await callPost(
        route,
        name,
        streamRequest(oversizedValidJson(), '5'),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as { code: string };
      expect(body.code).toBe('LAND_INVALID_REQUEST');
      expect(mutation).not.toHaveBeenCalled();
    },
  );

  it('declared oversized header with small body is rejected early', async () => {
    const response = await callPost(
      parcelsRoute,
      'parcels',
      streamRequest('{}', String(LIMIT + 1)),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe('LAND_INVALID_REQUEST');
    expect(routeMocks.createParcel).not.toHaveBeenCalled();
  });
});

describe('EC-01 at-limit and below-limit behavior', () => {
  it('exactly 1 MiB valid JSON passes the size gate on parcels', async () => {
    routeMocks.createParcel.mockResolvedValueOnce({
      id: 'parcel-1',
      parcelCode: 'EC01-PARCEL',
    });
    const response = await callPost(
      parcelsRoute,
      'parcels',
      jsonRequest(exactlyLimitParcelJson()),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.createParcel).toHaveBeenCalledTimes(1);
    const input = routeMocks.createParcel.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(input.parcelCode).toBe('EC01-PARCEL');
  });

  it('below-limit invalid JSON remains a 400 LAND_INVALID_REQUEST', async () => {
    const response = await callPost(
      parcelsRoute,
      'parcels',
      jsonRequest('not-json'),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe('LAND_INVALID_REQUEST');
    expect(routeMocks.createParcel).not.toHaveBeenCalled();
  });
});
