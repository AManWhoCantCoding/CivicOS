import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  canEnterFeature,
  visibleFeatures,
} from '@/components/navigation/feature-registry';
import {
  encumbranceStatusText,
  evidencePlaceholderCopy,
  geometryPreviewText,
  hasSensitiveLeak,
  mapLandApiStatus,
  maskedPartyLabel,
  parcelStatusText,
  rightStatusText,
} from '@/components/land/workspace-view';
import {
  LAND_PARCELS_URL,
  LAND_PARTIES_URL,
  parcelDetailUrl,
} from '@/components/land/land-api';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

// LND-05 Red: UI contract/accessibility cho screen-04 parcel/party workspace.
// Assertion source: ticket LND-05 AC + .scratch/land-module/ui/screen-04.md,
// design-tokens.md (textual handoff, Stitch report: 0 rendered URL),
// api-contract GET parcels/{parcelId} + GET parties/parcels.
describe('LND-05 land-parcel-workspace registration follows server policy', () => {
  const officer = {
    id: 'lnd05-officer',
    roles: ['land_officer'],
    organizationUnitId: 'lnd05-ou-a',
  } as const;
  const leader = {
    id: 'lnd05-leader',
    roles: ['commune_leader'],
    organizationUnitId: 'lnd05-ou-a',
  } as const;

  it('exposes the workspace to scoped officer with land_review assignment', () => {
    const assignments = [
      {
        task: 'land_review',
        status: 'active',
        assigneeUserId: 'lnd05-officer',
        organizationId: 'lnd05-ou-a',
      },
    ];
    expect(
      canEnterFeature('land-parcel-workspace', { ...officer }, assignments),
    ).toBe(true);
  });

  it('exposes the workspace to same-unit leader without assignment (bypass)', () => {
    expect(canEnterFeature('land-parcel-workspace', { ...leader }, [])).toBe(
      true,
    );
  });

  it('hides the workspace from officer without assignment', () => {
    expect(
      visibleFeatures('land', { ...officer }, []).some(
        (feature) => feature.id === 'land-parcel-workspace',
      ),
    ).toBe(false);
  });

  it('hides the workspace from non-land roles', () => {
    const citizen = {
      id: 'lnd05-citizen',
      roles: ['citizen'],
      organizationUnitId: 'lnd05-ou-a',
    };
    expect(canEnterFeature('land-parcel-workspace', citizen, [])).toBe(false);
  });
});

describe('LND-05 API status mapping never leaks scoped data', () => {
  it('maps 403 to denied without parcel payload', () => {
    expect(mapLandApiStatus(403, true)).toBe('denied');
  });

  it('maps 401 to denied fail-closed', () => {
    expect(mapLandApiStatus(401, true)).toBe('denied');
  });

  it('maps 404 parcel detail to not-found', () => {
    expect(mapLandApiStatus(404, true)).toBe('not-found');
  });

  it('maps offline to offline state before error', () => {
    expect(mapLandApiStatus(500, false)).toBe('offline');
    expect(mapLandApiStatus(null, false)).toBe('offline');
  });

  it('maps server failure to error with retry', () => {
    expect(mapLandApiStatus(500, true)).toBe('error');
    expect(mapLandApiStatus(null, true)).toBe('error');
  });

  it('returns null for success so panels render', () => {
    expect(mapLandApiStatus(200, true)).toBeNull();
  });
});

describe('LND-05 Vietnamese labels follow screen-04 handoff', () => {
  it('marks proposed/retired parcels read-only', () => {
    expect(parcelStatusText('proposed')).toContain('chỉ đọc');
    expect(parcelStatusText('retired')).toContain('chỉ đọc');
    expect(parcelStatusText('active')).toBe('Đang sử dụng');
  });

  it('labels rights/encumbrances lifecycle in Vietnamese', () => {
    expect(rightStatusText('active')).toBe('Đang hiệu lực');
    expect(rightStatusText('ended')).toBe('Đã kết thúc');
    expect(encumbranceStatusText('active')).toBe('Đang hiệu lực');
    expect(encumbranceStatusText('released')).toBe('Đã giải tỏa');
  });

  it('shows masked party reference, never plaintext identity', () => {
    const label = maskedPartyLabel(
      {
        referenceCode: 'PARTY-001',
        identityNumberMasked: '*******0001',
        displayName: 'Demo Citizen',
      },
      'party-001',
    );
    expect(label).toContain('PARTY-001');
    expect(label).toContain('*******0001');
  });

  it('falls back to parcel-scoped party reference when party list misses', () => {
    expect(maskedPartyLabel(null, 'party-001')).toContain('party-001');
    expect(maskedPartyLabel(undefined, 'party-001')).not.toContain('*******');
  });

  it('describes geometry as internal preview without public reuse', () => {
    const text = geometryPreviewText({
      type: 'Polygon',
      coordinates: [
        [
          [105, 20],
          [105.001, 20],
          [105.001, 20.001],
          [105, 20],
        ],
      ],
    });
    expect(text).toContain('Polygon');
    expect(text).toContain('4');
    expect(text).toContain('nội bộ');
  });

  it('provides an empty Evidence placeholder copy, never a storage key', () => {
    const copy = evidencePlaceholderCopy();
    expect(copy.length).toBeGreaterThan(0);
    expect(copy).not.toContain('storageKey');
  });
});

describe('LND-05 detail projection guard stays free of sensitive internals', () => {
  const detailFixture = {
    parcel: {
      id: 'parcel-001',
      parcelCode: 'PARCEL-001',
      mapSheetNumber: '12',
      parcelNumber: '34',
      areaSqm: '125.50',
      landUseType: 'residential',
      address: 'Demo address',
      communeCode: 'DEMO-COMMUNE',
      organizationId: 'ou-demo',
      geometry: { type: 'Polygon', coordinates: [] },
      nationalRecordRef: null,
      status: 'active',
      version: 1,
      createdAt: '2026-09-30T00:00:00.000Z',
      updatedAt: '2026-09-30T00:00:00.000Z',
    },
    rights: [
      {
        id: 'right-001',
        parcelId: 'parcel-001',
        partyId: 'party-001',
        rightType: 'land_use_right',
        sharePercent: '100.00',
        status: 'active',
        validFrom: '2026-09-30T00:00:00.000Z',
        validTo: null,
        sourceApplicationId: null,
      },
    ],
    encumbrances: [
      {
        id: 'enc-001',
        parcelId: 'parcel-001',
        securedPartyId: null,
        encumbranceType: 'mortgage',
        status: 'released',
        externalReference: null,
        registeredAt: '2026-09-30T00:00:00.000Z',
        releasedAt: '2026-10-01T00:00:00.000Z',
        sourceApplicationId: 'app-001',
      },
    ],
  };

  it('accepts the locked { parcel, rights, encumbrances } projection', () => {
    expect(hasSensitiveLeak(detailFixture)).toBe(false);
  });

  it('rejects payloads carrying ciphertext or storage internals', () => {
    expect(
      hasSensitiveLeak({
        ...detailFixture,
        parcel: {
          ...detailFixture.parcel,
          displayNameCiphertext: 'ENC(...)',
        },
      }),
    ).toBe(true);
    expect(hasSensitiveLeak({ storageKey: 'evidence/abc' })).toBe(true);
  });
});

describe('LND-05 client uses only approved land list/detail endpoints', () => {
  it('targets the locked internal parcel/party list routes', () => {
    expect(LAND_PARCELS_URL).toBe('/api/land/parcels');
    expect(LAND_PARTIES_URL).toBe('/api/land/parties');
  });

  it('targets the locked parcel detail route without extra segments', () => {
    expect(parcelDetailUrl('parcel-001')).toBe('/api/land/parcels/parcel-001');
  });
});

describe('LND-05 screen-04 sections render with accessible Vietnamese copy', () => {
  const listSource = readSource('src/components/land/ParcelList.tsx');
  const partySource = readSource('src/components/land/PartyList.tsx');
  const detailSource = readSource('src/components/land/ParcelDetail.tsx');
  const pilotUiSource = readSource('src/components/land/ParcelPilotUI.tsx');
  const evidenceSource = readSource('src/components/land/EvidencePanel.tsx');

  it('renders captioned tables with header scope for rights/encumbrances', () => {
    expect(detailSource).toContain('<caption');
    expect(detailSource).toContain('<table');
    expect(detailSource).toContain('<th');
    expect(detailSource).toContain('scope=');
  });

  it('announces loading/error/empty/forbidden/offline states with retry', () => {
    for (const source of [listSource, partySource, detailSource]) {
      expect(source).toContain('role="status"');
      expect(source).toContain('role="alert"');
      expect(source).toContain('Thử lại');
    }
    expect(listSource).toContain('ngoại tuyến');
    expect(detailSource).toContain('ngoại tuyến');
  });

  it('keeps dense tables scrollable and keyboard reachable on narrow screens', () => {
    for (const source of [listSource, partySource, detailSource]) {
      expect(source).toContain('<ParcelTableViewport');
    }
    expect(pilotUiSource).toContain('role="region"');
    expect(pilotUiSource).toContain('tabIndex={0}');
    expect(pilotUiSource).toContain('overflow-x-auto');
    expect(pilotUiSource).toContain('focus-visible:');
  });

  it('reuses pilot-only page, filter, status, feedback, and detail primitives', () => {
    for (const primitive of [
      'ParcelPageHeader',
      'ParcelFilterToolbar',
      'ParcelTableViewport',
      'ParcelStatusBadge',
      'ParcelFeedback',
      'ParcelSection',
    ]) {
      expect(pilotUiSource).toContain(`export function ${primitive}`);
    }
    for (const source of [listSource, partySource]) {
      expect(source).toContain('<ParcelFilterToolbar');
    }
    for (const source of [listSource, partySource, detailSource]) {
      expect(source).toContain('<ParcelFeedback');
    }
    expect(listSource).toContain('<ParcelStatusBadge');
    expect(detailSource).toContain('<ParcelStatusBadge');
    expect(detailSource).toContain('<ParcelSection');
    expect(readSource('src/app/land/parcels/page.tsx')).toContain(
      '<ParcelPageHeader',
    );
    expect(readSource('src/app/land/parcels/[parcelId]/page.tsx')).toContain(
      '<ParcelPageHeader',
    );
  });

  it('shows masked identity and never a plaintext identity number', () => {
    expect(partySource).toContain('identityNumberMasked');
    expect(detailSource).toContain('masked');
    expect(partySource).not.toContain('identityNumberCiphertext');
    expect(detailSource).not.toContain('identityNumberCiphertext');
    expect(detailSource).not.toContain('storageKey');
    expect(evidenceSource).not.toContain('storageKey');
  });

  it('exposes no direct rights/encumbrance mutation or hard-delete control', () => {
    for (const source of [listSource, partySource, detailSource]) {
      expect(source).not.toMatch(/Tạo quyền|Thêm quyền|Sửa quyền|Xóa quyền/);
      expect(source).not.toMatch(/Xóa thửa|Xóa vĩnh viễn|hard-delete/i);
      expect(source).not.toMatch(
        /mutateRight|mutateEncumbrance|directMutation/,
      );
    }
    expect(detailSource).not.toMatch(/method:\s*['"]POST['"]/);
    expect(detailSource).not.toMatch(/method:\s*['"]DELETE['"]/);
  });

  it('keeps codes and numerics in monospace per design tokens', () => {
    expect(detailSource).toContain('font-mono');
    expect(listSource).toContain('font-mono');
  });
});

describe('LND-05 parcel pages gate entry through the land workspace feature', () => {
  const listPage = readSource('src/app/land/parcels/page.tsx');
  const detailPage = readSource('src/app/land/parcels/[parcelId]/page.tsx');

  it('lists parcels inside ModuleShell without leaking denied data', () => {
    expect(listPage).toContain('canEnterEntry');
    expect(listPage).toContain('land-parcel-workspace');
    expect(listPage).toContain('ModuleShell');
    expect(listPage).toContain('module="land"');
    expect(listPage).toContain('AccessDenied');
  });

  it('opens parcel detail inside ModuleShell with the same entry gate', () => {
    expect(detailPage).toContain('canEnterEntry');
    expect(detailPage).toContain('land-parcel-workspace');
    expect(detailPage).toContain('ModuleShell');
    expect(detailPage).toContain('module="land"');
    expect(detailPage).toContain('AccessDenied');
  });
});

describe('CUI-002 land presentation uses shared tokens without new exposure', () => {
  const queueSource = readSource('src/components/land/ApplicationQueue.tsx');
  const applicationSource = readSource(
    'src/components/land/ApplicationDetail.tsx',
  );
  const parcelSource = readSource('src/components/land/ParcelDetail.tsx');
  const queuePage = readSource('src/app/land/applications/page.tsx');

  const legacyPaint =
    /slate-(950|900|800|700|600|500|400)|cyan-(300|200)|amber-(400|300|200|100)|emerald-(400|300|200)|rose-(400|300|200|100)|teal-(700|600)|bg-white|text-white|#[0-9A-Fa-f]{6}/;

  it('renders Inspection and Land detail sections without adding mutation or exposing payload/PII fields', () => {
    for (const source of [queueSource, applicationSource, parcelSource]) {
      expect(source).not.toMatch(/storageKey/i);
      expect(source).not.toMatch(/syncPayload|syncToken|syncSecret/i);
      expect(source).not.toMatch(/method:\s*['"]POST['"]/);
      expect(source).not.toMatch(/method:\s*['"]DELETE['"]/);
    }
    expect(queueSource).not.toMatch(/changePayload/i);
    expect(parcelSource).not.toMatch(/changePayload/i);
    // Application detail keeps only the pre-existing safe excerpt boundary.
    expect(applicationSource).toContain('trích an toàn');
    expect(applicationSource).toContain('terminal');
    expect(parcelSource).toContain('maskedPartyLabel');
    expect(queuePage).toContain('Mô phỏng:');
  });

  it('matches the approved token values and rejects prohibited visual treatments across web domain surfaces', () => {
    for (const source of [queueSource, applicationSource, parcelSource]) {
      expect(source).toContain('var(--civicos-');
      expect(source).not.toMatch(legacyPaint);
      expect(source).not.toMatch(/gradient|neon|glow/i);
      expect(source).not.toContain('#000000');
      expect(source).not.toContain('official');
      expect(source).not.toContain('certified');
    }
    expect(parcelSource).toContain('min-h-[44px]');
    expect(queueSource).toContain('min-h-[44px]');
  });
});
