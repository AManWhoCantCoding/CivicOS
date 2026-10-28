import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

// T-002: /land shares the approved Light/Blue presentation of
// /land/applications and /land/parcels; no behavior/state/API delta.
const landSource = () => readSource('src/app/land/page.tsx');
const applicationsSource = () =>
  readSource('src/app/land/applications/page.tsx');
const parcelsSource = () => readSource('src/app/land/parcels/page.tsx');
const queueSource = () =>
  readSource('src/components/land/ApplicationQueue.tsx');
const parcelListSource = () => readSource('src/components/land/ParcelList.tsx');
const partyListSource = () => readSource('src/components/land/PartyList.tsx');
const workspaceViewSource = () =>
  readSource('src/components/land/workspace-view.ts');

const driftPaint =
  /slate-(950|900|800|700|600|500|400)|cyan-(300|200|100)|teal-(800|700|600|500|400|300)|text-white|bg-white|bg-slate-|text-slate-/;

describe('T-002 land anchor', () => {
  it('shares the canonical Light/Blue wrapper tokens across the three land entries', () => {
    for (const source of [landSource(), applicationsSource()]) {
      expect(source).toContain('bg-[var(--civicos-canvas)]');
      expect(source).toContain('text-[var(--civicos-text)]');
      expect(source).toContain('text-[var(--civicos-accent)]');
      expect(source).toContain('text-[var(--civicos-text-muted)]');
      expect(source).toContain('var(--civicos-');
    }
    const parcels = parcelsSource();
    expect(parcels).toContain('bg-[var(--civicos-canvas)]');
    expect(parcels).toContain('text-[var(--civicos-text)]');
    expect(parcels).toContain('var(--civicos-');
    const parcelHeader = readSource('src/components/land/ParcelPilotUI.tsx');
    expect(parcelHeader).toContain('text-[var(--civicos-accent)]');
    expect(parcelHeader).toContain('text-[var(--civicos-text-muted)]');
    expect(landSource()).toContain('text-[var(--civicos-simulated-text)]');
    expect(applicationsSource()).toContain(
      'text-[var(--civicos-simulated-text)]',
    );
  });

  it('keeps /land free of dark/cyan drift and textual teal baseline', () => {
    for (const source of [
      landSource(),
      applicationsSource(),
      parcelsSource(),
    ]) {
      expect(source).not.toMatch(driftPaint);
      expect(source).not.toMatch(/gradient|neon|glow/i);
      expect(source).not.toContain('#000000');
      expect(source).not.toContain('official');
      expect(source).not.toContain('certified');
    }
    expect(landSource()).not.toContain('text-cyan-');
    expect(landSource()).not.toContain('bg-slate-');
  });

  it('preserves existing route destinations, gates, and action seams', () => {
    for (const source of [landSource(), applicationsSource()]) {
      expect(source).toContain('canEnterEntry');
      expect(source).toContain('getCurrentUser');
      expect(source).toContain('land-application-queue');
      expect(source).toContain('land-application-create');
      expect(source).toContain('land_officer');
      expect(source).toContain('ModuleShell');
      expect(source).toContain('module="land"');
      expect(source).toContain('AccessDenied');
      expect(source).toContain(
        'Hàng đợi hồ sơ không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại.',
      );
      expect(source).toContain('Suspense');
      expect(source).toContain('Đang tải hàng đợi hồ sơ…');
      expect(source).toContain('<ApplicationQueue canCreate={canCreate} />');
    }
    expect(parcelsSource()).toContain('canEnterEntry');
    expect(parcelsSource()).toContain('getCurrentUser');
    expect(parcelsSource()).toContain('land-parcel-workspace');
    expect(parcelsSource()).toContain('ModuleShell');
    expect(parcelsSource()).toContain('module="land"');
    expect(parcelsSource()).toContain('AccessDenied');
    expect(parcelsSource()).toContain(
      'Danh sách thửa đất không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại.',
    );
    expect(parcelsSource()).toContain('<ParcelList />');
    expect(parcelsSource()).toContain('<PartyList />');
    expect(queueSource()).toContain('/land/applications/${item.id}');
    expect(queueSource()).toContain('/land/applications/new');
    expect(queueSource()).toContain('Tạo hồ sơ');
    expect(parcelListSource()).toContain('/land/parcels/${item.id}');
    expect(parcelListSource()).toContain('focusMapUrl');
    expect(parcelListSource()).toContain('Xem trên bản đồ');
  });

  it('preserves queue filters, four change types, and version safe-state copy', () => {
    const queue = queueSource();
    for (const changeType of [
      'transfer',
      'information_update',
      'mortgage',
      'parcel_split_merge',
    ]) {
      expect(queue).toContain(changeType);
    }
    expect(queue).toContain('applicationChangeTypeText');
    expect(queue).toContain('applicationStatusText');
    expect(queue).toContain('Phiên bản');
    expect(queue).toContain('v{item.version}');
    expect(queue).toContain('updatedAt');
    expect(queue).toContain('buildApplicationListQuery');
    expect(queue).toContain('mapLandApiStatus');
    expect(queue).toContain('Trang trước');
    expect(queue).toContain('Trang tiếp');
    expect(queue).toContain('Thử lại');
    expect(queue).toContain('Đang ngoại tuyến');
  });

  it('preserves masked party, simulated, and offline safe-state copy', () => {
    expect(landSource()).toContain('Mô phỏng:');
    expect(applicationsSource()).toContain('Mô phỏng:');
    expect(landSource()).toContain('role="note"');
    for (const source of [
      queueSource(),
      parcelListSource(),
      partyListSource(),
    ]) {
      expect(source).toContain('role="status"');
      expect(source).toContain('role="alert"');
      expect(source).toContain('Thử lại');
      expect(source).toContain('Đang ngoại tuyến');
      expect(source).toContain('mapLandApiStatus');
    }
    expect(partyListSource()).toContain('maskedPartyLabel');
    expect(partyListSource()).toContain('identityNumberMasked');
    expect(workspaceViewSource()).toContain('maskedPartyLabel');
    expect(workspaceViewSource()).toContain('(đã che)');
    expect(workspaceViewSource()).toContain('không dùng cho tra cứu công khai');
  });

  it('renders no polygon in entry wrappers and list safe states', () => {
    for (const source of [
      landSource(),
      applicationsSource(),
      parcelsSource(),
      queueSource(),
      parcelListSource(),
      partyListSource(),
    ]) {
      expect(source.toLowerCase()).not.toContain('<polygon');
    }
  });
});
