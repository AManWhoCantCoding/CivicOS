import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const queuePage = () => readSource('src/app/land/applications/page.tsx');
const createPage = () => readSource('src/app/land/applications/new/page.tsx');
const detailPage = () =>
  readSource('src/app/land/applications/[applicationId]/page.tsx');
const parcelsPage = () => readSource('src/app/land/parcels/page.tsx');
const parcelDetailPage = () =>
  readSource('src/app/land/parcels/[parcelId]/page.tsx');
const queue = () => readSource('src/components/land/ApplicationQueue.tsx');
const form = () => readSource('src/components/land/ApplicationForm.tsx');
const detail = () => readSource('src/components/land/ApplicationDetail.tsx');
const parcelList = () => readSource('src/components/land/ParcelList.tsx');
const parcelDetail = () => readSource('src/components/land/ParcelDetail.tsx');
const lookup = () => readSource('src/components/land/PublicLandLookup.tsx');

const pages = () => [
  queuePage(),
  createPage(),
  detailPage(),
  parcelsPage(),
  parcelDetailPage(),
];
const components = () => [
  queue(),
  form(),
  detail(),
  parcelList(),
  parcelDetail(),
  lookup(),
];

const driftPaint =
  /slate-(950|900|800|700|600|500|400)|cyan-(300|200|100)|teal-(800|700|600|500|400|300)|text-white|bg-white|bg-slate-|text-slate-/;

describe('T-009 land application/lookup', () => {
  it('keeps land queue/form/detail and parcel/lookup surfaces on Light/Blue semantic tokens', () => {
    for (const source of [...pages(), ...components()]) {
      expect(source).toContain('var(--civicos-');
      expect(source).not.toMatch(driftPaint);
      expect(source).not.toMatch(/gradient|neon|glow/i);
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toContain('official');
      expect(source).not.toContain('certified');
    }
    for (const source of pages()) {
      expect(source).toContain('bg-[var(--civicos-canvas)]');
      expect(source).toContain('text-[var(--civicos-text)]');
      expect(source).toContain('ModuleShell');
      expect(source).toContain('module="land"');
      expect(source).toContain('AccessDenied');
      expect(source).toContain('getCurrentUser');
      expect(source).toContain('canEnterEntry');
    }
    expect([...pages(), ...components()].join('\n')).toMatch(
      /(?:text-\[|color:\s*)var\(--civicos-accent\)/,
    );
    expect([...pages(), ...components()].join('\n')).toContain(
      'var(--civicos-text-muted)',
    );
  });

  it('checks change-type and version/conflict presentation', () => {
    for (const changeType of [
      'transfer',
      'information_update',
      'mortgage',
      'parcel_split_merge',
    ]) {
      expect(queue()).toContain(changeType);
      expect(form()).toContain(changeType);
    }
    expect(queue()).toContain('applicationChangeTypeText');
    expect(queue()).toContain('applicationStatusText');
    expect(queue()).toContain('Phiên bản');
    expect(queue()).toContain('v{item.version}');
    expect(queue()).toContain('updatedAt');
    expect(queue()).toContain('buildApplicationListQuery');
    expect(detail()).toContain('applicationStatusText');
    expect(detail()).toContain('detailVersion');
    expect(detail()).toContain('LAND_VERSION_CONFLICT');
    expect(detail()).toContain('Phiên bản hồ sơ đã thay đổi');
    expect(detail()).toContain('Tải lại chi tiết');
    expect(form()).toContain('Idempotency-Key');
    expect(form()).toContain('idempotencyKey');
  });

  it('checks Assignment land_review, retry, approval/rejection and online guards', () => {
    expect(detail()).toContain('land_review');
    expect(detail()).toContain('resolveProcessingActions');
    expect(detail()).toContain('isTerminalApplicationStatus');
    expect(detail()).toContain('postApplicationSync');
    expect(detail()).toContain('postApplicationSyncRetry');
    expect(detail()).toContain('postApplicationApprove');
    expect(detail()).toContain('postApplicationReject');
    expect(detail()).toContain('isRejectReasonValid');
    expect(detail()).toContain('Lý do từ chối');
    expect(detail()).toContain('Đồng bộ mô phỏng');
    expect(detail()).toContain('Duyệt');
    expect(detail()).toContain('Từ chối');
    expect(detail()).toContain('EvidencePanel');
    expect(detail()).toContain('canAccessScopedEvidence');
    for (const source of [queue(), form(), detail()]) {
      expect(source).toContain('Đang ngoại tuyến');
      expect(source).toContain('Thử lại');
      expect(source).toContain('role="status"');
      expect(source).toContain('role="alert"');
    }
    expect(queue()).toContain('/land/applications/new');
    expect(queue()).toContain('Tạo hồ sơ');
    expect(queue()).toContain('/land/applications/${item.id}');
    expect(parcelList()).toContain('/land/parcels/${item.id}');
    expect(parcelList()).toContain('focusMapUrl');
    expect(parcelList()).toContain('Xem trên bản đồ');
    expect(parcelDetail()).toContain('focusMapUrl');
  });

  it('checks masked party and simulated wording', () => {
    expect(form()).toContain('maskedOptionLabel');
    expect(form()).toContain('identityNumberMasked');
    expect(parcelDetail()).toContain('maskedPartyLabel');
    expect(parcelDetail()).toContain('identityNumberMasked');
    expect(parcelDetail()).toContain('(masked)');
    expect(parcelDetail()).toContain('geometryPreviewText');
    for (const source of [queuePage(), createPage(), detailPage()]) {
      expect(source).toContain('Mô phỏng:');
      expect(source).toContain('role="note"');
      expect(source).toContain('text-[var(--civicos-simulated-text)]');
    }
    expect(lookup()).toContain('Mô phỏng · simulated');
    expect(createPage()).toContain(
      'Chỉ land_officer trong phạm vi đơn vị mới được tạo hồ sơ biến động.',
    );
    expect(detailPage()).toContain(
      'Hồ sơ này không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại.',
    );
  });

  it('checks public lookup stays on current surface and does not expand projection', () => {
    expect(lookup()).toContain('fetchPublicLandLookup');
    expect(lookup()).toContain('mapPublicLookupError');
    expect(lookup()).toContain('publicLookupStatusText');
    expect(lookup()).toContain('Thông tin projection');
    expect(lookup()).toContain(
      'Nhập đúng một mã để xem thông tin projection tối thiểu.',
    );
    expect(lookup()).toContain(
      'Cần cung cấp chính xác một mã hồ sơ hoặc mã thửa.',
    );
    expect(lookup()).toContain('LAND_LOOKUP_QUERY_INVALID');
    expect(lookup()).toContain('LAND_LOOKUP_NOT_FOUND');
    for (const key of [
      'applicationCode',
      'parcelCode',
      'mapSheetNumber',
      'parcelNumber',
      'status',
      'submittedAt',
      'updatedAt',
      'completedAt',
    ]) {
      expect(lookup()).toContain(key);
    }
    // No new public field, authority claim, or raw identity/geometry disclosure.
    for (const forbidden of [
      'identityNumber',
      'displayName',
      'address',
      'geometry',
      'organizationId',
      'official',
      'certified',
    ]) {
      expect(lookup()).not.toContain(forbidden);
    }
    expect(lookup()).toContain('Thử lại');
    expect(lookup()).toContain('Đang ngoại tuyến');
  });

  it('renders no polygon in land application/parcel/lookup presentation', () => {
    for (const source of [...pages(), ...components()]) {
      expect(source.toLowerCase()).not.toContain('<polygon');
    }
  });
});
