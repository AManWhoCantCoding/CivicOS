import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  actor: {
    id: 'lnd17-officer',
    email: 'lnd17-officer@demo.local',
    name: 'LND17 Officer',
    roles: ['land_officer'],
    organizationUnitId: 'ou-a',
  },
  requireLandActor: vi.fn(),
  uploadEvidence: vi.fn(),
  listEvidence: vi.fn(),
}));

vi.mock('@/modules/land', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/land')>();
  return {
    ...actual,
    listEvidence: routeMocks.listEvidence,
    uploadEvidence: routeMocks.uploadEvidence,
  };
});
vi.mock('@/modules/land/access', () => ({
  requireLandActor: routeMocks.requireLandActor,
}));

import { MAX_EVIDENCE_SIZE_BYTES } from '@/modules/land';
import * as applicationRoute from '@/app/api/land/applications/[applicationId]/evidence/route';
import * as parcelRoute from '@/app/api/land/parcels/[parcelId]/evidence/route';
import * as partyRoute from '@/app/api/land/parties/[partyId]/evidence/route';

const evidence = {
  id: 'evidence-1',
  resourceType: 'LandParcel',
  resourceId: 'parcel-a',
  fileName: 'proof.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 7,
  originalHash: 'a'.repeat(64),
  immutable: true,
  description: null,
  createdAt: '2026-10-01T00:00:00.000Z',
};

function uploadRequest(bytes = new Uint8Array([1, 2, 3])): Request {
  const form = new FormData();
  form.set('file', new File([bytes], 'proof.pdf', { type: 'application/pdf' }));
  form.set('description', 'Mô tả');
  return new Request('http://localhost', { method: 'POST', body: form });
}

beforeEach(() => {
  routeMocks.requireLandActor.mockReset();
  routeMocks.requireLandActor.mockResolvedValue(routeMocks.actor);
  routeMocks.uploadEvidence.mockReset();
  routeMocks.listEvidence.mockReset();
});

describe('LND-17 nested Evidence APIs', () => {
  it.each([
    [
      applicationRoute,
      'applicationId',
      'application-a',
      'LandChangeApplication',
    ],
    [parcelRoute, 'parcelId', 'parcel-a', 'LandParcel'],
    [partyRoute, 'partyId', 'party-a', 'LandParty'],
  ] as const)(
    'uploads and lists metadata for %s',
    async (route, param, id, resourceType) => {
      const responseEvidence = { ...evidence, resourceType, resourceId: id };
      routeMocks.uploadEvidence.mockResolvedValueOnce(responseEvidence);
      routeMocks.listEvidence.mockResolvedValueOnce([responseEvidence]);
      const context = { params: Promise.resolve({ [param]: id }) } as never;

      const uploadResponse = await route.POST(uploadRequest(), context);
      expect(uploadResponse.status).toBe(201);
      expect(await uploadResponse.json()).toEqual({
        evidence: responseEvidence,
      });
      expect(routeMocks.uploadEvidence).toHaveBeenCalledWith(
        expect.objectContaining({ resourceType, resourceId: id }),
        routeMocks.actor,
      );

      const listResponse = await route.GET(
        new Request('http://localhost'),
        context,
      );
      expect(listResponse.status).toBe(200);
      const listBody = await listResponse.json();
      expect(listBody).toEqual({
        evidence: [responseEvidence],
      });
      expect(routeMocks.listEvidence).toHaveBeenCalledWith(
        resourceType,
        id,
        routeMocks.actor,
      );
      expect(JSON.stringify(listBody)).not.toContain('storageKey');
    },
  );

  it('maps size rejection to the locked error without invoking storage service', async () => {
    const response = await parcelRoute.POST(
      uploadRequest(new Uint8Array(MAX_EVIDENCE_SIZE_BYTES + 1)),
      { params: Promise.resolve({ parcelId: 'parcel-a' }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: 'LAND_EVIDENCE_TOO_LARGE',
    });
    expect(routeMocks.uploadEvidence).not.toHaveBeenCalled();
  });

  it('keeps unauthenticated and service errors redacted', async () => {
    routeMocks.requireLandActor.mockRejectedValueOnce(
      new Error('UNAUTHENTICATED'),
    );
    const unauthenticated = await applicationRoute.GET(
      new Request('http://localhost'),
      { params: Promise.resolve({ applicationId: 'application-a' }) },
    );
    expect(unauthenticated.status).toBe(401);
    expect(await unauthenticated.json()).toEqual({
      code: 'LAND_UNAUTHENTICATED',
      error: 'Bạn cần đăng nhập để thực hiện thao tác này.',
    });

    routeMocks.uploadEvidence.mockRejectedValueOnce(
      new Error('EVIDENCE_TYPE_UNSUPPORTED'),
    );
    const unsupported = await applicationRoute.POST(uploadRequest(), {
      params: Promise.resolve({ applicationId: 'application-a' }),
    });
    expect(unsupported.status).toBe(400);
    expect(await unsupported.json()).toMatchObject({
      code: 'LAND_EVIDENCE_TYPE_UNSUPPORTED',
    });
  });
});
