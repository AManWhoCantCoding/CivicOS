import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  EVIDENCE_MIME_TYPES,
  evidenceUrl,
  fetchEvidence,
  MAX_EVIDENCE_SIZE_BYTES,
  postEvidence,
} from '@/components/land/land-api';
import { canAccessScopedEvidence } from '@/components/land/application-view';
import {
  mapEvidencePanelError,
  mapEvidenceUploadError,
  validateEvidenceFile,
} from '@/components/land/EvidencePanel';

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

const serverEvidence = {
  id: 'evidence-001',
  resourceType: 'LandChangeApplication',
  resourceId: 'application-001',
  fileName: 'giay-to.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  originalHash: 'a'.repeat(64),
  immutable: true,
  description: 'Giấy tờ kiểm tra',
  createdAt: '2026-10-01T00:00:00.000Z',
  storageKey: 'internal/path/giay-to.pdf',
  bytes: 'must never reach the UI',
  physicalPath: 'storage/evidence/internal/path/giay-to.pdf',
};

describe('LND-18 nested Evidence API projection', () => {
  it('uses only application, parcel and party nested Evidence boundaries', () => {
    expect(evidenceUrl('application', 'application/001')).toBe(
      '/api/land/applications/application%2F001/evidence',
    );
    expect(evidenceUrl('parcel', 'parcel-001')).toBe(
      '/api/land/parcels/parcel-001/evidence',
    );
    expect(evidenceUrl('party', 'party-001')).toBe(
      '/api/land/parties/party-001/evidence',
    );
  });

  it('projects safe metadata and redacts storage/path/byte fields from list responses', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        seen.push(String(url));
        return jsonResponse({ evidence: [serverEvidence] }, 200);
      }),
    );

    const result = await fetchEvidence('application', 'application-001');

    expect(seen).toEqual(['/api/land/applications/application-001/evidence']);
    expect(result.evidence).toEqual([
      {
        id: 'evidence-001',
        resourceType: 'LandChangeApplication',
        resourceId: 'application-001',
        fileName: 'giay-to.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        originalHash: 'a'.repeat(64),
        immutable: true,
        description: 'Giấy tờ kiểm tra',
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /storageKey|physicalPath|"bytes"/i,
    );
  });

  it('posts multipart metadata through the nested party boundary and projects 201 response', async () => {
    const seen: Array<{ url: string; init: Record<string, unknown> }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown, init: unknown) => {
        seen.push({
          url: String(url),
          init: (init ?? {}) as Record<string, unknown>,
        });
        return jsonResponse({ evidence: serverEvidence }, 201);
      }),
    );
    const file = new File(['pdf bytes'], 'giay-to.pdf', {
      type: 'application/pdf',
    });

    const result = await postEvidence(
      'party',
      'party-001',
      file,
      '  Giấy tờ kiểm tra  ',
    );

    expect(seen[0].url).toBe('/api/land/parties/party-001/evidence');
    expect(seen[0].init.method).toBe('POST');
    const form = seen[0].init.body as FormData;
    expect(form.get('file')).toMatchObject({
      name: 'giay-to.pdf',
      type: 'application/pdf',
    });
    expect(form.get('description')).toBe('Giấy tờ kiểm tra');
    expect(result.status).toBe(201);
    expect(result.evidence?.fileName).toBe('giay-to.pdf');
    expect(JSON.stringify(result)).not.toMatch(
      /storageKey|physicalPath|"bytes"/i,
    );
  });
});

describe('LND-18 Evidence UI validation and states', () => {
  it('validates the locked MIME allowlist and 10 MiB limit in Vietnamese', () => {
    expect(EVIDENCE_MIME_TYPES).toEqual([
      'application/pdf',
      'image/jpeg',
      'image/png',
    ]);
    expect(
      validateEvidenceFile({ type: 'application/pdf', size: 1 }),
    ).toBeNull();
    expect(validateEvidenceFile({ type: 'image/jpeg', size: 1 })).toBeNull();
    expect(validateEvidenceFile({ type: 'image/png', size: 1 })).toBeNull();
    expect(validateEvidenceFile({ type: 'text/plain', size: 1 })).toMatch(
      /định dạng.*không được hỗ trợ/i,
    );
    expect(
      validateEvidenceFile({
        type: 'application/pdf',
        size: MAX_EVIDENCE_SIZE_BYTES + 1,
      }),
    ).toMatch(/vượt quá dung lượng/i);
  });

  it('maps loading list failures to forbidden, offline and retryable error states', () => {
    expect(mapEvidencePanelError(403, 'LAND_FORBIDDEN', true)).toBe(
      'forbidden',
    );
    expect(mapEvidencePanelError(500, null, false)).toBe('offline');
    expect(mapEvidencePanelError(0, null, true)).toBe('error');
    expect(
      mapEvidenceUploadError('LAND_EVIDENCE_TOO_LARGE', 400, true),
    ).toMatch(/vượt quá dung lượng/i);
    expect(
      mapEvidenceUploadError('LAND_EVIDENCE_TYPE_UNSUPPORTED', 400, true),
    ).toMatch(/định dạng.*không được hỗ trợ/i);
    expect(mapEvidenceUploadError(null, 0, false)).toMatch(/ngoại tuyến/i);
  });

  it('shows Evidence only to scoped internal actors and preserves terminal/offline guards', () => {
    expect(
      canAccessScopedEvidence({
        roles: ['land_officer'],
        hasAssignment: true,
        sameOrganizationUnit: true,
      }),
    ).toBe(true);
    expect(
      canAccessScopedEvidence({
        roles: ['land_officer'],
        hasAssignment: false,
        sameOrganizationUnit: true,
      }),
    ).toBe(false);
    expect(
      canAccessScopedEvidence({
        roles: ['commune_leader'],
        hasAssignment: false,
        sameOrganizationUnit: true,
      }),
    ).toBe(true);
    expect(
      canAccessScopedEvidence({
        roles: ['commune_leader'],
        hasAssignment: false,
        sameOrganizationUnit: false,
      }),
    ).toBe(false);
  });
});

describe('LND-18 web/public/mobile Evidence surface boundaries', () => {
  const evidenceSource = readSource('src/components/land/EvidencePanel.tsx');
  const applicationSource = readSource(
    'src/components/land/ApplicationDetail.tsx',
  );
  const parcelSource = readSource('src/components/land/ParcelDetail.tsx');
  const publicSource = readSource('src/components/land/PublicLandLookup.tsx');
  const publicPageSource = readSource('src/app/public/land/lookup/page.tsx');
  const mobileSource = readSource('mobile/src/features/land/LandScreen.tsx');
  const mobileApiSource = readSource('mobile/src/api/land.ts');

  it('renders metadata states and keeps upload exclusively on application detail', () => {
    expect(evidenceSource).toContain('Đang tải siêu dữ liệu Evidence');
    expect(evidenceSource).toContain('Chưa có Evidence');
    expect(evidenceSource).toContain('role="alert"');
    expect(evidenceSource).toContain('role="status"');
    expect(evidenceSource).toContain('Thử lại');
    expect(evidenceSource).toContain('type="file"');
    expect(evidenceSource).toContain('10 MiB');
    expect(evidenceSource).not.toContain('storageKey');
    expect(applicationSource).toContain('resourceType="application"');
    expect(applicationSource).toContain('canAccessEvidence');
    expect(applicationSource).toContain('!readOnly');
    expect(parcelSource).toContain('resourceType="parcel"');
    expect(parcelSource).not.toContain('canUpload');
    expect(parcelSource).not.toContain('type="file"');
  });

  it('keeps public and mobile land fixtures free of Evidence surfaces', () => {
    for (const source of [
      publicSource,
      publicPageSource,
      mobileSource,
      mobileApiSource,
    ]) {
      expect(source).not.toMatch(/Evidence|storageKey/i);
    }
  });
});
