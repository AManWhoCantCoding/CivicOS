import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const pages = () => [
  readSource('src/app/residents/page.tsx'),
  readSource('src/app/residents/[subjectId]/page.tsx'),
  readSource('src/app/residents/[subjectId]/records/[recordId]/page.tsx'),
  readSource('src/app/residents/reports/page.tsx'),
];

const components = () => [
  readSource('src/components/residents/ResidentList.tsx'),
  readSource('src/components/residents/ResidentDetail.tsx'),
  readSource('src/components/residents/ActivityForm.tsx'),
  readSource('src/components/residents/ReportPreview.tsx'),
];

const scoped = () => [...pages(), ...components()];

describe('T-005 residents', () => {
  it('keeps scoped residents presentation on Light/Blue semantic tokens', () => {
    for (const source of scoped()) {
      expect(source).toContain('var(--civicos-');
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/gradient|neon|glow/i);
      expect(source).not.toContain('bg-slate-950');
      expect(source).not.toContain('bg-slate-900');
      expect(source).not.toContain('text-slate-100');
      expect(source).not.toContain('text-slate-400');
      expect(source).not.toContain('hover:text-white');
      expect(source).not.toMatch(
        /(text|bg|border|accent)-(slate|cyan|rose|emerald)-\d+/,
      );
      expect(source).not.toMatch(/focus:(border|ring)-(cyan|rose|emerald)/);
    }
    for (const source of pages()) {
      expect(source).toContain('bg-[var(--civicos-canvas)]');
      expect(source).toContain('text-[var(--civicos-text)]');
      expect(source).toContain('text-[var(--civicos-text-muted)]');
    }
  });

  it('preserves Subject/User distinction and server-masked field boundaries', () => {
    const list = readSource('src/components/residents/ResidentList.tsx');
    expect(list).toContain('body.subjects');
    expect(list).toContain('subjectType');
    expect(list).toContain('displayName');
    expect(list).toContain('entry.subjectType === filter');

    const detail = readSource('src/components/residents/ResidentDetail.tsx');
    expect(detail).toContain('SubjectDetail');
    expect(detail).toContain('body.subject');
    expect(detail).toContain('displayName');
    expect(detail).toContain('subjectType');
    expect(detail).toContain('masked');
    expect(detail).toContain('sensitiveProfile');
    expect(detail).toContain('detail.masked');
    expect(detail).toContain('Danh tính đã che theo quyền.');
    expect(detail).toContain('Không có hồ sơ nhạy cảm.');

    const activity = readSource('src/components/residents/ActivityForm.tsx');
    expect(activity).toContain('subjectId');
    expect(activity).toContain('recordId');

    // Staff User session stays on the server pages; managed Subject stays in
    // client components. Neither side invents the other entity.
    expect(readSource('src/app/residents/page.tsx')).toContain(
      'await getCurrentUser()',
    );
    expect(readSource('src/app/residents/reports/page.tsx')).toContain(
      'await getCurrentUser()',
    );
    expect(list).not.toContain('getCurrentUser');
    expect(detail).not.toContain('getCurrentUser');

    // Masked stays masked: no raw identity/evidence expansion.
    for (const source of scoped()) {
      expect(source).not.toContain('JSON.stringify(body)');
      expect(source).not.toContain('dangerouslySetInnerHTML');
      expect(source).not.toContain('innerHTML');
      expect(source).not.toContain('console.');
    }
    const report = readSource('src/components/residents/ReportPreview.tsx');
    expect(report).toContain('snapshotHash.slice(0, 12)');
    expect(report).not.toContain('{report.aggregateCounts}');
    expect(report).not.toContain('{report.snapshotPayload}');
  });

  it('keeps no-assignment/forbidden/empty/loading/error states safe', () => {
    const residentsPage = readSource('src/app/residents/page.tsx');
    expect(residentsPage).toContain(
      "canEnterEntry(current, ['resident-list'])",
    );
    expect(residentsPage).toContain(
      'Danh sách cư dân không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại.',
    );

    const reportsPage = readSource('src/app/residents/reports/page.tsx');
    expect(reportsPage).toContain(
      "canEnterEntry(current, ['resident-reports'])",
    );
    expect(reportsPage).toContain(
      'Báo cáo tháng chỉ dành cho chỉ huy hoặc cán bộ văn phòng trong đơn vị.',
    );

    const list = readSource('src/components/residents/ResidentList.tsx');
    expect(list).toContain('response.status === 403');
    expect(list).toContain(
      'Tài khoản không có quyền xem hồ sơ cư dân trong phạm vi này.',
    );
    expect(list).toContain('Chưa có hồ sơ cư dân đặc biệt nào.');
    expect(list).toContain('Đang tải danh sách cư dân');
    expect(list).toContain('Không tải được danh sách cư dân. Thử lại.');
    expect(list).toContain('Thử lại');
    expect(list).toContain('role="status"');
    expect(list).toContain('role="alert"');

    const detail = readSource('src/components/residents/ResidentDetail.tsx');
    expect(detail).toContain('response.status === 403');
    expect(detail).toContain(
      'Hồ sơ ngoài phạm vi phân công của tài khoản hiện tại.',
    );
    expect(detail).toContain('Chưa có hoạt động theo dõi nào.');
    expect(detail).toContain('Đang tải hồ sơ cư dân');
    expect(detail).toContain('Không tải được hồ sơ. Thử lại.');
    expect(detail).toContain('role="status"');
    expect(detail).toContain('role="alert"');

    const activity = readSource('src/components/residents/ActivityForm.tsx');
    expect(activity).toContain('response.status === 403');
    expect(activity).toContain(
      'Tài khoản không thuộc phân công của hồ sơ này.',
    );
    expect(activity).toContain('Nội dung theo dõi là bắt buộc.');
    expect(activity).toContain('Không ghi nhận được hoạt động. Thử lại.');
    expect(activity).toContain('role="alert"');
    expect(activity).toContain('role="status"');

    const report = readSource('src/components/residents/ReportPreview.tsx');
    expect(report).toContain('response.status === 403');
    expect(report).toContain(
      'Tài khoản không có quyền phê duyệt báo cáo đơn vị này.',
    );
    expect(report).toContain('Chưa đủ dữ liệu nguồn cho báo cáo tháng.');
    expect(report).toContain('Đang tải báo cáo tháng');
    expect(report).toContain('Không tải được báo cáo. Thử lại.');
    expect(report).toContain('Không xử lý được báo cáo. Thử lại.');
    expect(report).toContain('role="status"');
    expect(report).toContain('role="alert"');
  });

  it('preserves monthly report approval/send/retry visibility and API boundaries', () => {
    const report = readSource('src/components/residents/ReportPreview.tsx');
    expect(report).toContain('/api/residents/reports/monthly?organizationId=');
    expect(report).toContain('encodeURIComponent(organizationId)');
    expect(report).toContain('/api/residents/reports/');
    expect(report).toContain('/approve');
    expect(report).toContain('/send');
    expect(report).toContain("method: 'POST'");
    expect(report).toContain("'content-type': 'application/json'");
    expect(report).toContain(
      'targetOrganizationId: targetOrganizationId.trim()',
    );
    expect(report).toContain('Nhập đơn vị cấp trên nhận báo cáo.');
    expect(report).toContain('Nhập ID đơn vị cấp trên');
    expect(report).toContain('Snapshot bất biến:');
    expect(report).toContain('Phê duyệt');
    expect(report).toContain('Gửi cấp trên');
    expect(report).toContain("report.status === 'draft'");
    expect(report).toContain("report.status === 'approved'");
    expect(report).toContain('await load()');
    expect(report).toContain('Thử lại');
  });

  it('keeps existing route destinations and back behavior', () => {
    expect(readSource('src/app/residents/page.tsx')).toContain('href="/"');
    expect(readSource('src/app/residents/page.tsx')).toContain(
      '<ResidentList />',
    );
    expect(readSource('src/app/residents/[subjectId]/page.tsx')).toContain(
      'href="/residents"',
    );
    expect(readSource('src/app/residents/[subjectId]/page.tsx')).toContain(
      '<ResidentDetail subjectId={subjectId} />',
    );

    const activityPage = readSource(
      'src/app/residents/[subjectId]/records/[recordId]/page.tsx',
    );
    expect(activityPage).toContain('href={`/residents/${subjectId}`}');
    expect(activityPage).toContain('← Hồ sơ cư dân');
    expect(activityPage).toContain(
      '<ActivityForm subjectId={subjectId} recordId={recordId} />',
    );

    const reportsPage = readSource('src/app/residents/reports/page.tsx');
    expect(reportsPage).toContain('href="/residents"');
    expect(reportsPage).toContain('← Danh sách cư dân');
    expect(reportsPage).toContain('<ReportPreview organizationId=');

    const list = readSource('src/components/residents/ResidentList.tsx');
    expect(list).toContain('href={`/residents/${entry.id}`}');

    const detail = readSource('src/components/residents/ResidentDetail.tsx');
    expect(detail).toContain(
      'href={`/residents/${detail.id}/records/${record.id}`}',
    );
    expect(detail).toContain('href="/residents/reports"');
    expect(detail).toContain('Tạo báo cáo tháng');

    const activity = readSource('src/components/residents/ActivityForm.tsx');
    expect(activity).toContain('/api/residents/');
    expect(activity).toContain('/management-records/');
    expect(activity).toContain('/activities');
    expect(activity).toContain("method: 'POST'");
    expect(activity).toContain("activityType: 'checkup'");
    expect(activity).toContain('idempotencyKey');
  });

  it('keeps 44px controls, focus, motion and long-label wrapping', () => {
    for (const source of components()) {
      expect(source).toContain('min-h-[44px]');
    }
    // Form controls keep an explicit token focus border; read-only detail
    // links/buttons rely on the shared global :focus-visible ring.
    for (const source of [
      readSource('src/components/residents/ResidentList.tsx'),
      readSource('src/components/residents/ActivityForm.tsx'),
      readSource('src/components/residents/ReportPreview.tsx'),
    ]) {
      expect(source).toContain('focus:border-[var(--civicos-focus)]');
    }
    expect(readSource('src/app/globals.css')).toContain(':focus-visible');
    expect(readSource('src/app/globals.css')).toContain(
      'prefers-reduced-motion',
    );
    for (const source of [
      readSource('src/components/residents/ResidentList.tsx'),
      readSource('src/components/residents/ResidentDetail.tsx'),
      readSource('src/components/residents/ReportPreview.tsx'),
    ]) {
      expect(source).toContain('motion-safe:animate-pulse');
    }
    // Decorative status icons are hidden from assistive tech where used.
    for (const source of [
      readSource('src/components/residents/ResidentList.tsx'),
      readSource('src/components/residents/ActivityForm.tsx'),
    ]) {
      expect(source).toContain('aria-hidden="true"');
    }
    // Narrow-viewport adaptation without clipping Vietnamese labels.
    const list = readSource('src/components/residents/ResidentList.tsx');
    expect(list).toContain('overflow-hidden');
    expect(list).toContain('w-full');
    expect(readSource('src/app/globals.css')).toContain('line-height: 1.5');
    for (const source of scoped()) {
      expect(source).not.toContain('truncate');
      expect(source).not.toContain('whitespace-nowrap');
      expect(source).not.toContain('text-ellipsis');
    }
    // Responsive page shells stay bounded with adaptive padding.
    expect(
      readSource('src/app/residents/[subjectId]/records/[recordId]/page.tsx'),
    ).toContain('max-w-3xl');
    expect(readSource('src/app/residents/reports/page.tsx')).toContain(
      'max-w-4xl',
    );
    for (const source of pages()) {
      expect(source).toContain('sm:px-6 lg:px-10');
    }
  });
});
