import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const pages = () => [
  readSource('src/app/intake/page.tsx'),
  readSource('src/app/intake/[reportId]/page.tsx'),
  readSource('src/app/incidents/page.tsx'),
  readSource('src/app/incidents/[incidentId]/page.tsx'),
  readSource('src/app/incidents/layout.tsx'),
];

const styled = () => [
  readSource('src/app/intake/page.tsx'),
  readSource('src/app/incidents/page.tsx'),
  readSource('src/app/incidents/layout.tsx'),
  readSource('src/components/incidents/IntakeReportForm.tsx'),
  readSource('src/components/incidents/IntakeReportQueue.tsx'),
  readSource('src/components/incidents/IntakeReportDetail.tsx'),
  readSource('src/components/incidents/IncidentTable.tsx'),
  readSource('src/components/incidents/IncidentDetail.tsx'),
  readSource('src/components/incidents/IncidentStatusActions.tsx'),
  readSource('src/components/incidents/IncidentAssignmentPanel.tsx'),
  readSource('src/components/incidents/IncidentTimeline.tsx'),
];

const controls = () => [
  readSource('src/components/incidents/IntakeReportForm.tsx'),
  readSource('src/components/incidents/IntakeReportQueue.tsx'),
  readSource('src/components/incidents/IntakeReportDetail.tsx'),
  readSource('src/components/incidents/IncidentTable.tsx'),
  readSource('src/components/incidents/IncidentDetail.tsx'),
  readSource('src/components/incidents/IncidentStatusActions.tsx'),
  readSource('src/components/incidents/IncidentAssignmentPanel.tsx'),
];

const formControls = () => [
  readSource('src/components/incidents/IntakeReportForm.tsx'),
  readSource('src/components/incidents/IntakeReportQueue.tsx'),
  readSource('src/components/incidents/IntakeReportDetail.tsx'),
  readSource('src/components/incidents/IncidentStatusActions.tsx'),
];

const scoped = () => [
  ...pages(),
  ...styled().slice(3),
  readSource('src/components/incidents/useIncidentSession.ts'),
];

describe('T-006 intake/incident', () => {
  it('keeps scoped intake/incident presentation on Light/Blue semantic tokens', () => {
    for (const source of styled()) {
      expect(source).toContain('var(--civicos-');
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/gradient|neon|glow/i);
      expect(source).not.toContain('shadow-black');
      expect(source).not.toContain('dark:');
      expect(source).not.toMatch(
        /(text|bg|border|accent)-(slate|cyan|rose|emerald)-\d+/,
      );
      expect(source).not.toMatch(/focus:(border|ring)-(cyan|rose|emerald)/);
    }
    // Route wrappers carry no presentation; they delegate to the components.
    expect(readSource('src/app/intake/[reportId]/page.tsx')).toContain(
      '<IntakeReportDetail reportId={reportId} />',
    );
    expect(readSource('src/app/incidents/[incidentId]/page.tsx')).toContain(
      '<IncidentDetail incidentId={incidentId} />',
    );
    for (const source of [
      readSource('src/app/intake/page.tsx'),
      readSource('src/app/incidents/page.tsx'),
      readSource('src/app/incidents/layout.tsx'),
    ]) {
      expect(source).toContain('bg-[var(--civicos-canvas)]');
      expect(source).toContain('text-[var(--civicos-text)]');
    }
  });

  it('keeps IntakeReport distinct from Incident with explicit conversion only', () => {
    expect(readSource('src/app/intake/page.tsx')).toContain(
      'Tạo IntakeReport chờ phân loại. Incident chỉ tạo khi cán bộ xác nhận',
    );
    expect(readSource('src/app/intake/page.tsx')).toContain(
      'không tạo tự động khi nhập tin.',
    );

    const form = readSource('src/components/incidents/IntakeReportForm.tsx');
    expect(form).toContain('Tin mới chỉ tạo');
    expect(form).toContain(
      'IntakeReport chờ phân loại; Incident chỉ tạo khi cán bộ xác nhận chuyển.',
    );
    expect(form).toContain(
      'Đã ghi nhận tin báo. Hồ sơ chờ phân loại, chưa tạo Incident.',
    );
    expect(form).toContain('router.push(`/intake/${result.reportId}`)');

    const detail = readSource(
      'src/components/incidents/IntakeReportDetail.tsx',
    );
    expect(detail).toContain('Xác minh chỉ đổi trạng thái tin báo.');
    expect(detail).toContain('Tạo Incident là thao tác');
    expect(detail).toContain('Lưu xác minh (không tạo Incident)');
    expect(detail).toContain(
      'Xác nhận chỉ ghi nhận quyết định; chưa tạo Incident.',
    );
    expect(detail).toContain(
      'Chỉ sau khi xác nhận, thao tác này tạo đúng một Incident.',
    );
    expect(detail).toContain('Đã tạo Incident từ tin báo.');
    expect(detail).toContain("void run('verify', {");
    expect(detail).toContain("void run('convert_to_incident')");
    // Verify/process/confirm stay conversion-free; conversion stays gated on
    // VERIFIED + confirmed + no linked incident yet.
    expect(detail).toContain("const canVerify = report.status === 'RECEIVED'");
    expect(detail).toContain(
      "report.status === 'VERIFIED' && !!report.confirmedAt && !report.incidentId",
    );

    const queue = readSource('src/components/incidents/IntakeReportQueue.tsx');
    expect(queue).toContain('Chưa tạo Incident');
    expect(queue).toContain('Đã chuyển Incident');
    expect(queue).toContain('href={`/intake/${item.id}`}');
    expect(detail).toContain('href={`/incidents/${report.incidentId}`}');
    expect(detail).toContain('Đã liên kết Incident');
  });

  it('preserves existing routes, endpoints, command methods and payloads', () => {
    const form = readSource('src/components/incidents/IntakeReportForm.tsx');
    expect(form).toContain("fetch('/api/intake-reports'");
    expect(form).toContain("method: 'POST'");
    expect(form).toContain("'content-type': 'application/json'");
    expect(form).toContain("'Idempotency-Key'");
    expect(form).toContain('sourceChannel: form.get(');
    // receivedAt is assigned server-side by the route, not supplied by the form.
    expect(form).not.toContain('receivedAt');
    expect(readSource('src/app/api/intake-reports/route.ts')).toContain(
      'receivedAt: new Date().toISOString(),',
    );
    expect(form).toContain('content: form.get(');
    expect(form).toContain('sensitiveRef: form.get(');

    const queue = readSource('src/components/incidents/IntakeReportQueue.tsx');
    expect(queue).toContain('`/api/intake-reports${query}`');
    expect(queue).toContain("params.set('status', statusFilter)");
    expect(queue).toContain("params.set('sourceChannel', channelFilter)");
    expect(queue).toContain("params.set('sla', slaFilter)");

    const detail = readSource(
      'src/components/incidents/IntakeReportDetail.tsx',
    );
    expect(detail).toContain('`/api/intake-reports/${reportId}`');
    expect(detail).toContain('`/api/intake-reports/${reportId}/commands`');
    expect(detail).toContain("method: 'POST'");
    expect(detail).toContain("'content-type': 'application/json'");
    expect(detail).toContain('JSON.stringify({ command, ...payload })');
    for (const command of [
      "'verify'",
      "'process'",
      "'confirm'",
      "'convert_to_incident'",
      "'reject'",
      "'close'",
      "'transfer'",
    ]) {
      expect(detail).toContain(command);
    }
    expect(detail).toContain('classification,');
    expect(detail).toContain('verificationNote: verificationNote.trim()');
    expect(detail).toContain('processedNote: processedNote.trim()');
    expect(detail).toContain('reason: rejectReason.trim()');
    expect(detail).toContain('organizationId: transferOrganizationId');

    const table = readSource('src/components/incidents/IncidentTable.tsx');
    expect(table).toContain("fetch('/api/incidents'");

    const incident = readSource('src/components/incidents/IncidentDetail.tsx');
    expect(incident).toContain('`/api/incidents/${incidentId}`');

    const actions = readSource(
      'src/components/incidents/IncidentStatusActions.tsx',
    );
    expect(actions).toContain('`/api/incidents/${incidentId}/commands`');
    expect(actions).toContain("method: 'POST'");
    expect(actions).toContain("'content-type': 'application/json'");
    for (const command of [
      "'classify'",
      "'verify'",
      "'transfer'",
      "'resolve'",
      "'close'",
      "'approve'",
      "'reject'",
    ]) {
      expect(actions).toContain(command);
    }
    expect(actions).toContain('{ category, severity }');
    expect(actions).toContain('{ note: verificationNote.trim() }');
    expect(actions).toContain('{ resolution: resolution.trim() }');
    expect(actions).toContain('approvalId: selectedApprovalId');

    const assignment = readSource(
      'src/components/incidents/IncidentAssignmentPanel.tsx',
    );
    expect(assignment).toContain('`/api/incidents/${incidentId}/commands`');
    expect(assignment).toContain("command: 'assign'");
    expect(assignment).toContain('assigneeUserIds,');
  });

  it('keeps route destinations and back behavior unchanged', () => {
    expect(readSource('src/app/intake/page.tsx')).toContain('href="/"');
    expect(readSource('src/app/intake/page.tsx')).toContain(
      '<IntakeReportForm />',
    );
    expect(readSource('src/app/intake/page.tsx')).toContain(
      '<IntakeReportQueue />',
    );

    expect(readSource('src/app/incidents/page.tsx')).toContain('href="/"');
    expect(readSource('src/app/incidents/page.tsx')).toContain(
      'href="/assignments"',
    );
    expect(readSource('src/app/incidents/page.tsx')).toContain(
      'href="/intake"',
    );
    expect(readSource('src/app/incidents/page.tsx')).toContain(
      '<IncidentTable />',
    );

    const detail = readSource(
      'src/components/incidents/IntakeReportDetail.tsx',
    );
    expect(detail).toContain('href="/intake"');
    expect(detail).toContain('← Hàng đợi');
    expect(detail).toContain('Về hàng đợi');

    const incident = readSource('src/components/incidents/IncidentDetail.tsx');
    expect(incident).toContain('href="/incidents"');
    expect(incident).toContain('href="/assignments"');
    expect(incident).toContain('← Hàng đợi');
    expect(incident).toContain('Về hàng đợi');

    const table = readSource('src/components/incidents/IncidentTable.tsx');
    expect(table).toContain('href={`/incidents/${incident.id}`}');
  });

  it('preserves existing status/assignment/permission action gating', () => {
    expect(readSource('src/app/incidents/page.tsx')).toContain(
      'await getCurrentUser()',
    );
    expect(readSource('src/app/incidents/page.tsx')).toContain(
      "canEnterEntry(current, ['incident-queue'])",
    );
    expect(readSource('src/app/incidents/page.tsx')).toContain(
      'Hàng đợi Incident không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại.',
    );

    const layout = readSource('src/app/incidents/layout.tsx');
    expect(layout).toContain('hasBusinessCapability(current.roles)');
    expect(layout).toContain('<ModuleShell module="incidents">');
    expect(layout).toContain(
      'Tài khoản hiện tại không có quyền nghiệp vụ trong phân hệ Incident.',
    );

    const session = readSource(
      'src/components/incidents/useIncidentSession.ts',
    );
    expect(session).toContain("fetch('/api/auth/session'");
    expect(session).toContain('holdsCommandRole');

    const actions = readSource(
      'src/components/incidents/IncidentStatusActions.tsx',
    );
    expect(actions).toContain('useIncidentSession()');
    expect(actions).toContain('holdsCommandRole(session.roles)');
    expect(actions).toContain('hasActiveAssignment');
    expect(actions).toContain('canMutate');
    expect(actions).toContain('canDecide');
    expect(actions).toContain("status === 'received'");
    expect(actions).toContain("status === 'classified'");
    expect(actions).toContain("status === 'verifying'");
    expect(actions).toContain("status === 'transferred'");
    expect(actions).toContain("status === 'resolved'");
    expect(actions).toContain('pendingApprovals.length');
    expect(actions).toContain(
      '/api/identity/assignments?resourceType=Incident&resourceId=',
    );
    expect(actions).toContain(
      'Tài khoản hiện tại không có thao tác khả dụng trên Incident này.',
    );
    expect(actions).toContain(
      'Tài khoản hiện tại không có quyền quyết định Approval này.',
    );
    expect(actions).toContain(
      'Tài khoản hiện tại không có quyền thực hiện thao tác này.',
    );
    expect(actions).toContain(
      'Người tạo yêu cầu Approval không thể tự phê duyệt.',
    );

    const assignment = readSource(
      'src/components/incidents/IncidentAssignmentPanel.tsx',
    );
    expect(assignment).toContain('useIncidentSession()');
    expect(assignment).toContain('holdsCommandRole(session.roles)');
    expect(assignment).toContain('canAssign');
    expect(assignment).toContain(
      '/api/identity/assignments?resourceType=Incident&resourceId=',
    );
    expect(assignment).toContain('&includeRevoked=true');
    expect(assignment).toContain(
      'Chỉ Commander trong cùng OrganizationUnit được tạo hoặc thu hồi',
    );
    expect(assignment).toContain(
      'Tài khoản hiện tại không có quyền phân công Incident.',
    );
  });

  it('keeps loading/empty/forbidden/error/retry/masked states safe', () => {
    const queue = readSource('src/components/incidents/IntakeReportQueue.tsx');
    expect(queue).toContain('Đang tải hàng đợi IntakeReport');
    expect(queue).toContain('Không thể tải hàng đợi IntakeReport.');
    expect(queue).toContain(
      'Hàng đợi IntakeReport không thuộc phạm vi tài khoản hiện tại.',
    );
    expect(queue).toContain('Chưa có IntakeReport trong phạm vi hiển thị.');
    expect(queue).toContain('Thử tải lại');
    expect(queue).toContain('role="status"');
    expect(queue).toContain('role="alert"');

    const detail = readSource(
      'src/components/incidents/IntakeReportDetail.tsx',
    );
    expect(detail).toContain('Đang tải hồ sơ IntakeReport…');
    expect(detail).toContain('Không thể mở hồ sơ IntakeReport.');
    expect(detail).toContain(
      'Hồ sơ này không thuộc phạm vi tài khoản hiện tại.',
    );
    expect(detail).toContain('Thử lại');
    expect(detail).toContain('Về hàng đợi');
    expect(detail).toContain('role="status"');
    expect(detail).toContain('role="alert"');

    const table = readSource('src/components/incidents/IncidentTable.tsx');
    expect(table).toContain('Đang tải hàng đợi Incident');
    expect(table).toContain('Không thể tải hàng đợi Incident.');
    expect(table).toContain(
      'Danh sách Incident không thuộc phạm vi tài khoản hiện tại.',
    );
    expect(table).toContain('Chưa có Incident trong phạm vi hiển thị.');
    expect(table).toContain('Thử tải lại');
    expect(table).toContain('role="status"');
    expect(table).toContain('role="alert"');

    const incident = readSource('src/components/incidents/IncidentDetail.tsx');
    expect(incident).toContain('Đang tải hồ sơ Incident…');
    expect(incident).toContain('Không thể mở hồ sơ Incident.');
    expect(incident).toContain('Không thể làm mới hồ sơ Incident.');
    expect(incident).toContain(
      'Incident này không thuộc phạm vi tài khoản hiện tại.',
    );
    expect(incident).toContain('Thử lại');
    expect(incident).toContain('Làm mới');
    expect(incident).toContain('role="status"');
    expect(incident).toContain('role="alert"');

    const assignment = readSource(
      'src/components/incidents/IncidentAssignmentPanel.tsx',
    );
    expect(assignment).toContain('Đang tải Assignment…');
    expect(assignment).toContain('Không thể tải Assignment của Incident.');
    expect(assignment).toContain(
      'Assignment này không thuộc phạm vi tài khoản hiện tại.',
    );
    expect(assignment).toContain('Chưa có Assignment cho Incident này.');
    expect(assignment).toContain('Thử tải lại');
    expect(assignment).toContain('role="status"');
    expect(assignment).toContain('role="alert"');

    const form = readSource('src/components/incidents/IntakeReportForm.tsx');
    expect(form).toContain('Không thể ghi nhận tin báo.');
    expect(form).toContain('Cần nhập nội dung tin báo.');
    expect(form).toContain('role="alert"');
    expect(form).toContain('role="status"');

    // Masked stays masked: structured safe fields only, no raw API body/PII.
    expect(detail).toContain('revealed');
    expect(detail).toContain(
      'Danh tính đã che theo vai trò; chỉ Trưởng CA xem được giá trị thật.',
    );
    expect(detail).toContain('Danh tính thật hiển thị theo quyền Trưởng CA.');
    expect(incident).toContain(
      'Danh tính thật chỉ hiển thị trong phạm vi được phân quyền.',
    );
    expect(incident).toContain('Không ghi nhận');
    for (const source of scoped()) {
      expect(source).not.toContain('JSON.stringify(body)');
      expect(source).not.toContain('JSON.stringify(response');
      expect(source).not.toContain('dangerouslySetInnerHTML');
      expect(source).not.toContain('innerHTML');
      expect(source).not.toContain('console.');
    }
  });

  it('keeps 44px controls, accessibility and focus where represented', () => {
    for (const source of controls()) {
      expect(source).toContain('min-h-[44px]');
    }
    // Form controls keep an explicit token focus border; read-only detail
    // links/buttons rely on the shared global :focus-visible ring.
    for (const source of formControls()) {
      expect(source).toContain('<label');
      expect(source).toContain('focus:border-[var(--civicos-focus)]');
      expect(source).toContain('focus:ring-[var(--civicos-focus)]');
    }
    expect(readSource('src/app/globals.css')).toContain(':focus-visible');
    expect(readSource('src/app/globals.css')).toContain(
      'prefers-reduced-motion',
    );
    for (const source of [
      readSource('src/components/incidents/IntakeReportQueue.tsx'),
      readSource('src/components/incidents/IncidentTable.tsx'),
    ]) {
      expect(source).toContain('motion-safe:animate-pulse');
    }
    // Decorative SLA icons are hidden from assistive tech where used.
    for (const source of [
      readSource('src/components/incidents/IntakeReportQueue.tsx'),
      readSource('src/components/incidents/IntakeReportDetail.tsx'),
    ]) {
      expect(source).toContain('aria-hidden="true"');
    }
    for (const source of [
      readSource('src/components/incidents/IntakeReportForm.tsx'),
      readSource('src/components/incidents/IntakeReportDetail.tsx'),
      readSource('src/components/incidents/IncidentStatusActions.tsx'),
      readSource('src/components/incidents/IncidentAssignmentPanel.tsx'),
    ]) {
      expect(source).toContain('aria-live="polite"');
    }
  });
});
