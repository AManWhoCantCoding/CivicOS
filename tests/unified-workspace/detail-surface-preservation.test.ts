import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('T-005 detail surface preservation', () => {
  it('preserves residents list/detail content, state and deep links', () => {
    // List keeps its API caller, forbidden boundary, retry and detail links.
    const list = readSource('src/components/residents/ResidentList.tsx');
    expect(list).toContain("fetch('/api/residents'");
    expect(list).toContain('response.status === 403');
    expect(list).toContain('Thử lại');
    expect(list).toContain('`/residents/${entry.id}`');

    // List page keeps its gate, content and center breadcrumb.
    const page = readSource('src/app/residents/page.tsx');
    expect(page).toContain("canEnterEntry(current, ['resident-list'])");
    expect(page).toContain('Danh sách cư dân đặc biệt');
    expect(page).toContain('ResidentList');
    expect(page).toContain('href="/"');

    // Detail keeps its API caller, record links and report handoff.
    const detail = readSource('src/components/residents/ResidentDetail.tsx');
    expect(detail).toContain('/api/residents/');
    expect(detail).toContain('`/residents/${detail.id}/records/${record.id}`');
    expect(detail).toContain('Tạo báo cáo tháng');
    expect(detail).toContain('href="/residents/reports"');
    expect(detail).toContain('Thử lại');
    const detailPage = readSource('src/app/residents/[subjectId]/page.tsx');
    expect(detailPage).toContain('Hồ sơ cư dân');
    expect(detailPage).toContain('href="/residents"');
    expect(detailPage).toContain('ResidentDetail');
  });

  it('preserves residents masking, PII and report actions', () => {
    const detail = readSource('src/components/residents/ResidentDetail.tsx');
    expect(detail).toContain('masked');
    expect(detail).toContain('sensitiveProfile');
    expect(detail).toContain('Danh tính đã che theo quyền.');

    // Monthly report keeps its gate, snapshot copy, API callers and actions.
    const reportsPage = readSource('src/app/residents/reports/page.tsx');
    expect(reportsPage).toContain(
      "canEnterEntry(current, ['resident-reports'])",
    );
    expect(reportsPage).toContain('Snapshot bất biến');
    expect(reportsPage).toContain('ReportPreview');
    expect(reportsPage).toContain('href="/residents"');
    const preview = readSource('src/components/residents/ReportPreview.tsx');
    expect(preview).toContain('/api/residents/reports/monthly');
    expect(preview).toContain('/approve');
    expect(preview).toContain('/send');
    expect(preview).toContain('Phê duyệt');
    expect(preview).toContain('Gửi cấp trên');
    expect(preview).toContain('Thử lại');
  });

  it('preserves intake queue/form content and masking', () => {
    const page = readSource('src/app/intake/page.tsx');
    expect(page).toContain('Ghi nhận tin báo');
    expect(page).toContain('IntakeReportForm');
    expect(page).toContain('IntakeReportQueue');
    expect(page).toContain('Danh tính nguồn tin đã che theo vai trò');
    expect(page).toContain('href="/"');

    const queue = readSource('src/components/incidents/IntakeReportQueue.tsx');
    expect(queue).toContain('/api/intake-reports');
    expect(queue).toContain('revealed');
    expect(queue).toContain('`/intake/${item.id}`');

    // Creation keeps its existing detail handoff (no new destination).
    const form = readSource('src/components/incidents/IntakeReportForm.tsx');
    expect(form).toContain('router.push');
    expect(form).toContain('/intake/');
  });

  it('preserves intake detail state, actions, masking and API callers', () => {
    const detail = readSource(
      'src/components/incidents/IntakeReportDetail.tsx',
    );
    expect(detail).toContain('/api/intake-reports/');
    expect(detail).toContain('/commands');
    expect(detail).toContain('FORBIDDEN');
    expect(detail).toContain('AccessDenied');
    // Status-gated actions stay exactly as specified.
    expect(detail).toContain('Lưu xác minh (không tạo Incident)');
    expect(detail).toContain('Lưu kết quả xử lý');
    expect(detail).toContain('Xác nhận hồ sơ');
    expect(detail).toContain('Tạo Incident');
    expect(detail).toContain('Từ chối');
    expect(detail).toContain('Đóng hồ sơ');
    expect(detail).toContain('Chuyển đơn vị (Trưởng CA)');
    // Masking, breadcrumbs and deep links are unchanged.
    expect(detail).toContain('revealed');
    expect(detail).toContain('Danh tính đã che theo vai trò');
    expect(detail).toContain('← Hàng đợi');
    expect(detail).toContain('href="/intake"');
    expect(detail).toContain('Về hàng đợi');
    expect(detail).toContain('`/incidents/${report.incidentId}`');
    expect(detail).toContain('Thử lại');
  });

  it('preserves incident list/detail content, actions and API callers', () => {
    const page = readSource('src/app/incidents/page.tsx');
    expect(page).toContain("canEnterEntry(current, ['incident-queue'])");
    expect(page).toContain('Hàng đợi Incident');
    expect(page).toContain('IncidentTable');
    expect(page).toContain('href="/intake"');
    expect(page).toContain('href="/assignments"');
    expect(page).toContain('Ghi nhận tin báo');

    const table = readSource('src/components/incidents/IncidentTable.tsx');
    expect(table).toContain("fetch('/api/incidents'");
    expect(table).toContain('FORBIDDEN');
    expect(table).toContain(
      'Danh sách Incident không thuộc phạm vi tài khoản hiện tại.',
    );
    expect(table).toContain('Thử tải lại');
    expect(table).toContain('`/incidents/${incident.id}`');

    const detail = readSource('src/components/incidents/IncidentDetail.tsx');
    expect(detail).toContain('/api/incidents/');
    expect(detail).toContain('FORBIDDEN');
    expect(detail).toContain(
      'Incident này không thuộc phạm vi tài khoản hiện tại.',
    );
    expect(detail).toContain('IncidentTimeline');
    expect(detail).toContain('IncidentStatusActions');
    expect(detail).toContain('IncidentAssignmentPanel');
    expect(detail).toContain('SessionControls');
    expect(detail).toContain('Thử lại');
  });

  it('preserves inspection catalogue/schedule content and deep links', () => {
    const page = readSource('src/app/inspections/establishments/page.tsx');
    expect(page).toContain('Cơ sở kinh doanh');
    expect(page).toContain('EstablishmentForm');
    expect(page).toContain('EstablishmentList');
    expect(page).toContain('InspectionScheduleBoard');
    expect(page).toContain('id="inspection-schedule"');
    expect(page).toContain('href="/"');

    const list = readSource('src/components/inspections/EstablishmentList.tsx');
    expect(list).toContain("fetch('/api/establishments'");
    expect(list).toContain('`/inspections/establishments/${item.id}`');

    const board = readSource(
      'src/components/inspections/InspectionScheduleBoard.tsx',
    );
    expect(board).toContain("fetch('/api/establishments'");
    expect(board).toContain("fetch('/api/inspections'");
    expect(board).toContain('`/inspections/${inspection.id}`');

    const detail = readSource(
      'src/components/inspections/InspectionDetail.tsx',
    );
    expect(detail).toContain('/api/inspections/');
    expect(detail).toContain('FORBIDDEN');
    expect(detail).toContain('ChecklistForm');
    expect(detail).toContain('InspectionFindingForm');
    expect(detail).toContain('RecommendationForm');
    expect(detail).toContain('EvidenceList');
    expect(detail).toContain('Đã lập lịch');
    expect(detail).toContain('Đang kiểm tra');
    expect(detail).toContain('Đã hoàn tất');
    expect(detail).toContain('href="/inspections/establishments"');
  });

  it('introduces no new route destinations or history rewrites', () => {
    for (const path of [
      'src/components/residents/ResidentList.tsx',
      'src/components/residents/ResidentDetail.tsx',
      'src/components/residents/ReportPreview.tsx',
      'src/components/incidents/IncidentTable.tsx',
      'src/components/incidents/IncidentDetail.tsx',
      'src/components/incidents/IntakeReportDetail.tsx',
      'src/components/incidents/IntakeReportQueue.tsx',
      'src/components/inspections/EstablishmentList.tsx',
      'src/components/inspections/InspectionScheduleBoard.tsx',
      'src/components/inspections/InspectionDetail.tsx',
    ] as const) {
      const source = readSource(path);
      expect(source).not.toContain('redirect(');
      expect(source).not.toContain('router.replace');
      expect(source).not.toContain('pushState');
      expect(source).not.toContain('replaceState');
      expect(source).not.toContain('window.location');
    }
  });
});
