import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

// LND-09 Red: UI contract cho screen-01 queue + screen-02 create.
// Assertion source: phase-02-intake-review.md:108-132,
// .scratch/land-module/ui/screen-01.md, screen-02.md, design-tokens.md,
// api-contract GET/POST /api/land/applications.

describe('LND-09 queue feature registry preserves parcel workspace', () => {
  it('registers queue visible to officer with assignment and leader bypass', async () => {
    const { canEnterFeature, visibleFeatures } =
      await import('@/components/navigation/feature-registry');
    const officer = {
      id: 'lnd09-officer',
      roles: ['land_officer'],
      organizationUnitId: 'lnd09-ou-a',
    } as const;
    const leader = {
      id: 'lnd09-leader',
      roles: ['commune_leader'],
      organizationUnitId: 'lnd09-ou-a',
    } as const;
    const assignments = [
      {
        task: 'land_review',
        status: 'active',
        assigneeUserId: 'lnd09-officer',
        organizationId: 'lnd09-ou-a',
      },
    ];
    expect(
      canEnterFeature('land-application-queue', { ...officer }, assignments),
    ).toBe(true);
    expect(canEnterFeature('land-application-queue', { ...leader }, [])).toBe(
      true,
    );
    expect(
      visibleFeatures('land', { ...officer }, []).some(
        (feature) => feature.id === 'land-application-queue',
      ),
    ).toBe(false);
  });

  it('registers create for land_officer mutate capability without Assignment', async () => {
    const { canEnterFeature } =
      await import('@/components/navigation/feature-registry');
    const officer = {
      id: 'lnd09-officer',
      roles: ['land_officer'],
      organizationUnitId: 'lnd09-ou-a',
    } as const;
    const leader = {
      id: 'lnd09-leader',
      roles: ['commune_leader'],
      organizationUnitId: 'lnd09-ou-a',
    } as const;
    const assignments = [
      {
        task: 'land_review',
        status: 'active',
        assigneeUserId: 'lnd09-officer',
        organizationId: 'lnd09-ou-a',
      },
    ];
    expect(canEnterFeature('land-application-create', { ...officer }, [])).toBe(
      true,
    );
    expect(
      canEnterFeature('land-application-create', { ...officer }, assignments),
    ).toBe(true);
    expect(canEnterFeature('land-application-create', { ...leader }, [])).toBe(
      false,
    );
    expect(
      canEnterFeature('land-application-create', { ...leader }, assignments),
    ).toBe(false);
  });

  it('preserves land-parcel-workspace gate and endpoints', async () => {
    const { canEnterFeature } =
      await import('@/components/navigation/feature-registry');
    const officer = {
      id: 'lnd09-officer',
      roles: ['land_officer'],
      organizationUnitId: 'lnd09-ou-a',
    } as const;
    const assignments = [
      {
        task: 'land_review',
        status: 'active',
        assigneeUserId: 'lnd09-officer',
        organizationId: 'lnd09-ou-a',
      },
    ];
    expect(
      canEnterFeature('land-parcel-workspace', { ...officer }, assignments),
    ).toBe(true);
    const registry = readSource(
      'src/components/navigation/feature-registry.ts',
    );
    expect(registry).toContain('land-parcel-workspace');
    expect(registry).toContain('land-application-queue');
    expect(registry).toContain('land-application-create');
    expect(registry).not.toMatch(/approve|reject|sync/i);
  });
});

describe('LND-09 application view helpers follow locked contracts', () => {
  it('labels application statuses and change types in Vietnamese', async () => {
    const view = await import('@/components/land/application-view');
    expect(view.applicationStatusText('submitted')).toMatch(
      /đã gửi|tiếp nhận/i,
    );
    expect(view.applicationStatusText('in_review')).toMatch(/thẩm tra|đang/i);
    expect(view.applicationStatusText('rejected')).toMatch(/từ chối|không/i);
    expect(view.applicationChangeTypeText('transfer')).toMatch(
      /chuyển|nhượng/i,
    );
    expect(view.applicationChangeTypeText('information_update')).toMatch(
      /cập nhật|thông tin/i,
    );
    expect(view.applicationChangeTypeText('mortgage')).toMatch(/thế chấp/i);
    expect(view.applicationChangeTypeText('parcel_split_merge')).toMatch(
      /tách|gộp|thửa/i,
    );
  });

  it('builds list query only with locked params and filters code client-side', async () => {
    const view = await import('@/components/land/application-view');
    const query = view.buildApplicationListQuery({
      status: 'submitted',
      changeType: 'transfer',
      assignedTo: 'user-1',
      cursor: null,
    });
    expect(query).toContain('status=submitted');
    expect(query).toContain('changeType=transfer');
    expect(query).toContain('assignedTo=user-1');
    expect(query).not.toContain('changePayload');
    expect(query).not.toContain('parcelCode');
    const items = [
      { applicationCode: 'APP-001' },
      { applicationCode: 'APP-002' },
    ] as never[];
    expect(view.filterSummariesByCode(items, 'APP-001')).toHaveLength(1);
  });

  it('validates transfer share total equals 100.00', async () => {
    const view = await import('@/components/land/application-view');
    expect(view.isShareTotalValid(['100.00'])).toBe(true);
    expect(view.isShareTotalValid(['50.00', '50.00'])).toBe(true);
    expect(view.isShareTotalValid(['60.00', '40.00'])).toBe(true);
    expect(view.isShareTotalValid(['60.00'])).toBe(false);
    expect(view.isShareTotalValid([''])).toBe(false);
  });

  it('builds all four locked create payloads with correct links', async () => {
    const view = await import('@/components/land/application-view');
    const transfer = view.buildTransferInput({
      currentHolderPartyId: 'p-current',
      proposedHolders: [{ partyId: 'p-new', sharePercent: '100.00' }],
      subjectParcelId: 'parcel-001',
    });
    expect(transfer.changeType).toBe('transfer');
    expect(transfer.changePayload).toHaveProperty('shareChanges');
    expect(
      transfer.parties.some(
        (p: { partyRole: string }) => p.partyRole === 'current_holder',
      ),
    ).toBe(true);
    const info = view.buildInformationUpdateInput({
      applicantPartyId: 'p-1',
      subjectParcelId: 'parcel-001',
      field: 'address',
      newValue: 'Dia chi moi',
    });
    expect(info.changePayload).toMatchObject({
      field: 'address',
      newValue: 'Dia chi moi',
    });
    const mortgageRegister = view.buildMortgageInput({
      action: 'register',
      securedPartyId: 'p-sec',
      applicantPartyId: null,
      subjectParcelId: 'parcel-001',
    });
    expect(
      mortgageRegister.parties.some(
        (p: { partyRole: string }) => p.partyRole === 'secured_party',
      ),
    ).toBe(true);
    const mortgageRelease = view.buildMortgageInput({
      action: 'release',
      securedPartyId: null,
      applicantPartyId: 'p-1',
      subjectParcelId: 'parcel-001',
    });
    expect(
      mortgageRelease.parties.some(
        (p: { partyRole: string }) => p.partyRole === 'secured_party',
      ),
    ).toBe(false);
    const split = view.buildSplitMergeInput({
      operation: 'split',
      applicantPartyId: 'p-1',
      sourceParcelIds: ['parcel-src'],
      resultParcelIds: ['parcel-res'],
    });
    expect(split.changePayload).toMatchObject({ operation: 'split' });
    expect(
      split.parcels.some(
        (p: { parcelRole: string }) => p.parcelRole === 'source',
      ),
    ).toBe(true);
    expect(
      split.parcels.some(
        (p: { parcelRole: string }) => p.parcelRole === 'result',
      ),
    ).toBe(true);
  });

  it('rejects sensitive summary leaks and maps conflict message', async () => {
    const view = await import('@/components/land/application-view');
    expect(view.hasApplicationSensitiveLeak({ changePayload: { a: 1 } })).toBe(
      true,
    );
    expect(
      view.hasApplicationSensitiveLeak({
        id: 'a',
        applicationCode: 'APP-001',
        changeType: 'transfer',
        status: 'submitted',
      }),
    ).toBe(false);
    expect(
      view.mapCreateErrorToMessage('LAND_IDEMPOTENCY_CONFLICT', 409),
    ).toMatch(/trùng|khóa|thử lại/i);
    expect(view.generateIdempotencyKey().length).toBeGreaterThan(8);
  });
});

describe('LND-09 screen-01 queue renders locked summary only', () => {
  const queueSource = readSource('src/components/land/ApplicationQueue.tsx');
  const landPage = readSource('src/app/land/page.tsx');
  const applicationsPage = readSource('src/app/land/applications/page.tsx');

  it('fetches GET applications and renders summary fields without fabrication', () => {
    expect(queueSource).toContain('/api/land/applications');
    expect(queueSource).toContain('applicationCode');
    expect(queueSource).toContain('changeType');
    expect(queueSource).toContain('status');
    expect(queueSource).not.toContain('changePayload');
    expect(queueSource).not.toContain('identityNumberCiphertext');
    expect(queueSource).not.toContain('storageKey');
    expect(queueSource).not.toMatch(
      /parcelCode.*assignee|assignee.*parcelCode/,
    );
    expect(queueSource).not.toMatch(/fetch.*parcelDetail|fetchParcelDetail/);
  });

  it('keeps filters in URL with officer-only create CTA and states', () => {
    expect(queueSource).toContain('useSearchParams');
    expect(queueSource).toContain('Tạo hồ sơ');
    expect(queueSource).toContain('ngoại tuyến');
    expect(queueSource).toContain('Thử lại');
    expect(queueSource).toContain('role="status"');
    expect(queueSource).toContain('role="alert"');
    expect(queueSource).toContain('<table');
    expect(queueSource).toContain('<caption');
    expect(queueSource).toContain('scope=');
    expect(queueSource).toContain('font-mono');
    expect(queueSource).toContain('min-h-[44px]');
    expect(queueSource).not.toMatch(/Phê duyệt|Từ chối|Đồng bộ/);
  });

  it('gates both queue routes through ModuleShell without leaking denied data', () => {
    for (const page of [landPage, applicationsPage]) {
      expect(page).toContain('canEnterEntry');
      expect(page).toContain('land-application-queue');
      expect(page).toContain('ModuleShell');
      expect(page).toContain('module="land"');
      expect(page).toContain('AccessDenied');
      expect(page).toContain('Mô phỏng');
    }
    expect(landPage).toContain('Hồ sơ biến động');
  });
});

describe('LND-09 screen-02 create covers four change types safely', () => {
  const formSource = readSource('src/components/land/ApplicationForm.tsx');
  const newPage = readSource('src/app/land/applications/new/page.tsx');

  it('renders dynamic sections for transfer/info/mortgage/split-merge', () => {
    expect(formSource).toContain('transfer');
    expect(formSource).toContain('information_update');
    expect(formSource).toContain('mortgage');
    expect(formSource).toContain('parcel_split_merge');
    expect(formSource).toContain('100.00');
    expect(formSource).toContain('Idempotency-Key');
    expect(formSource).toContain('Gửi hồ sơ');
    expect(formSource).not.toMatch(/Phê duyệt|Từ chối|Đồng bộ/);
  });

  it('uses masked pickers, keeps input on error, blocks double submit and offline', () => {
    expect(formSource).toContain('identityNumberMasked');
    expect(formSource).toContain('referenceCode');
    expect(formSource).toContain('parcelCode');
    expect(formSource).not.toContain('identityNumberCiphertext');
    expect(formSource).toContain('sessionStorage');
    expect(formSource).toContain('LAND_IDEMPOTENCY_CONFLICT');
    expect(formSource).toContain('ngoại tuyến');
    expect(formSource).toMatch(/disabled.*submit|submit.*disabled/i);
    expect(formSource).toContain('/land/applications/');
    expect(formSource).toContain('201');
  });

  it('gates create to land_officer mutate via server feature entry', () => {
    expect(newPage).toContain('canEnterEntry');
    expect(newPage).toContain('land-application-create');
    expect(newPage).toContain('land_officer');
    expect(newPage).toContain('ModuleShell');
    expect(newPage).toContain('AccessDenied');
    expect(newPage).toContain('Tạo hồ sơ biến động');
    expect(newPage).not.toMatch(/Phê duyệt|Từ chối|Đồng bộ/);
    expect(newPage).not.toContain('land-application-queue');
    expect(newPage).not.toContain('phân công');
  });
});
