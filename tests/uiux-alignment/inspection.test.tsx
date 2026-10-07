import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const pages = () => [
  readSource('src/app/inspections/establishments/page.tsx'),
  readSource('src/app/inspections/establishments/[establishmentId]/page.tsx'),
  readSource('src/app/inspections/[inspectionId]/page.tsx'),
  readSource('src/app/inspections/layout.tsx'),
];

const styled = () => [
  readSource('src/app/inspections/establishments/page.tsx'),
  readSource('src/app/inspections/layout.tsx'),
  readSource('src/components/inspections/EstablishmentList.tsx'),
  readSource('src/components/inspections/EstablishmentForm.tsx'),
  readSource('src/components/inspections/EstablishmentDetail.tsx'),
  readSource('src/components/inspections/InspectionScheduleBoard.tsx'),
  readSource('src/components/inspections/InspectionScheduleForm.tsx'),
  readSource('src/components/inspections/InspectionDetail.tsx'),
  readSource('src/components/inspections/ChecklistForm.tsx'),
  readSource('src/components/inspections/InspectionFindingForm.tsx'),
  readSource('src/components/inspections/RecommendationForm.tsx'),
  readSource('src/components/inspections/EnforcementApprovalPanel.tsx'),
  readSource('src/components/field/EvidenceList.tsx'),
  readSource('src/components/field/client-state.tsx'),
];

const controls44 = () => [
  readSource('src/components/inspections/EstablishmentList.tsx'),
  readSource('src/components/inspections/InspectionScheduleBoard.tsx'),
  readSource('src/components/inspections/InspectionDetail.tsx'),
  readSource('src/components/inspections/ChecklistForm.tsx'),
  readSource('src/components/inspections/EnforcementApprovalPanel.tsx'),
  readSource('src/components/field/EvidenceList.tsx'),
  readSource('src/components/field/EvidenceCapture.tsx'),
  readSource('src/components/field/OfflineQueueStatus.tsx'),
];

const formControls = () => [
  readSource('src/components/inspections/EstablishmentForm.tsx'),
  readSource('src/components/inspections/InspectionScheduleBoard.tsx'),
  readSource('src/components/inspections/InspectionScheduleForm.tsx'),
  readSource('src/components/inspections/ChecklistForm.tsx'),
  readSource('src/components/inspections/InspectionFindingForm.tsx'),
  readSource('src/components/inspections/RecommendationForm.tsx'),
  readSource('src/components/inspections/EnforcementApprovalPanel.tsx'),
];

const scoped = () => [
  ...pages(),
  readSource('src/components/inspections/EstablishmentList.tsx'),
  readSource('src/components/inspections/EstablishmentForm.tsx'),
  readSource('src/components/inspections/EstablishmentDetail.tsx'),
  readSource('src/components/inspections/InspectionScheduleBoard.tsx'),
  readSource('src/components/inspections/InspectionScheduleForm.tsx'),
  readSource('src/components/inspections/InspectionDetail.tsx'),
  readSource('src/components/inspections/ChecklistForm.tsx'),
  readSource('src/components/inspections/InspectionFindingForm.tsx'),
  readSource('src/components/inspections/RecommendationForm.tsx'),
  readSource('src/components/inspections/EnforcementApprovalPanel.tsx'),
  readSource('src/components/field/EvidenceList.tsx'),
  readSource('src/components/field/EvidenceCapture.tsx'),
  readSource('src/components/field/OfflineQueueStatus.tsx'),
  readSource('src/components/field/client-state.tsx'),
];

describe('T-007 inspection', () => {
  it('keeps scoped inspection presentation on Light/Blue semantic tokens', () => {
    for (const source of styled()) {
      expect(source).toContain('var(--civicos-');
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/gradient|neon|glow/i);
      expect(source).not.toContain('shadow-black');
      expect(source).not.toContain('dark:');
      expect(source).not.toContain('bg-slate-950');
      expect(source).not.toContain('bg-slate-900');
      expect(source).not.toContain('text-slate-100');
      expect(source).not.toContain('text-slate-400');
      expect(source).not.toContain('hover:text-white');
      expect(source).not.toMatch(
        /(text|bg|border|accent)-(slate|cyan|amber|rose|emerald)-\d+/,
      );
      expect(source).not.toMatch(/focus:(border|ring)-(cyan|rose|emerald)/);
    }
    for (const source of [
      readSource('src/app/inspections/establishments/page.tsx'),
      readSource('src/app/inspections/layout.tsx'),
    ]) {
      expect(source).toContain('bg-[var(--civicos-canvas)]');
      expect(source).toContain('text-[var(--civicos-text)]');
    }
    // Route detail wrappers carry no presentation; they delegate.
    expect(
      readSource(
        'src/app/inspections/establishments/[establishmentId]/page.tsx',
      ),
    ).toContain('<EstablishmentDetail establishmentId=');
    expect(readSource('src/app/inspections/[inspectionId]/page.tsx')).toContain(
      '<InspectionDetail inspectionId=',
    );
  });

  it('preserves establishment scope, access checks, routes and schedule composition', () => {
    const establishmentsPage = readSource(
      'src/app/inspections/establishments/page.tsx',
    );
    expect(establishmentsPage).toContain('canEnterEntry(current, [');
    expect(establishmentsPage).toContain("'inspection-catalogue'");
    expect(establishmentsPage).toContain("'inspection-schedule'");
    expect(establishmentsPage).toContain("'inspection-workqueue'");
    expect(establishmentsPage).toContain(
      'Danh mục và lịch kiểm tra không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại.',
    );
    expect(establishmentsPage).toContain('href="/"');
    expect(establishmentsPage).toContain('<EstablishmentForm />');
    expect(establishmentsPage).toContain('<EstablishmentList />');
    expect(establishmentsPage).toContain('<InspectionScheduleBoard />');

    const layout = readSource('src/app/inspections/layout.tsx');
    expect(layout).toContain('hasBusinessCapability(current.roles)');
    expect(layout).toContain('<ModuleShell module="inspections">');
    expect(layout).toContain(
      'Tài khoản hiện tại không có quyền nghiệp vụ trong phân hệ Inspection.',
    );

    const list = readSource('src/components/inspections/EstablishmentList.tsx');
    expect(list).toContain("fetch('/api/establishments')");
    expect(list).toContain("fetch('/api/inspections/stats')");
    expect(list).toContain('href={`/inspections/establishments/${item.id}`}');
    expect(list).toContain('response.status === 401');
    expect(list).toContain('response.status === 403');
    expect(list).toContain('Không có quyền xem danh mục cơ sở');

    const form = readSource('src/components/inspections/EstablishmentForm.tsx');
    expect(form).toContain("'/api/establishments'");
    expect(form).toContain("method: initial ? 'PATCH' : 'POST'");
    expect(form).toContain('/api/establishments/${initial.id}');
    expect(form).toContain("'content-type': 'application/json'");
    expect(form).toContain("name: String(form.get('name')");
    expect(form).toContain('Thêm cơ sở kinh doanh');
    expect(form).toContain('Chỉnh sửa cơ sở');
    expect(form).toContain('Đã tạo cơ sở.');
    expect(form).toContain('Đã cập nhật cơ sở.');

    const detail = readSource(
      'src/components/inspections/EstablishmentDetail.tsx',
    );
    expect(detail).toContain('/api/establishments/${establishmentId}');
    expect(detail).toContain('href="/inspections/establishments"');
    expect(detail).toContain('<EstablishmentForm initial={item}');
    expect(detail).toContain('<InspectionScheduleForm');

    const board = readSource(
      'src/components/inspections/InspectionScheduleBoard.tsx',
    );
    expect(board).toContain("fetch('/api/establishments')");
    expect(board).toContain("fetch('/api/inspections')");
    expect(board).toContain('href={`/inspections/${inspection.id}`}');
    expect(board).toContain('Lịch kiểm tra');
    expect(board).toContain("'overdue'");
    expect(board).toContain("'upcoming'");
    expect(board).toContain('Quá hạn');
    expect(board).toContain('Sắp tới');
    expect(board).toContain('Người được giao');
    expect(board).toContain("assignedUserId ?? 'Chưa giao'");
    expect(board).toContain('cadenceMonths');

    const scheduleForm = readSource(
      'src/components/inspections/InspectionScheduleForm.tsx',
    );
    expect(scheduleForm).toContain("fetch('/api/identity/users')");
    expect(scheduleForm).toContain("fetch('/api/inspections'");
    expect(scheduleForm).toContain("method: 'POST'");
    expect(scheduleForm).toContain('establishmentId: selectedEstablishmentId');
    expect(scheduleForm).toContain('scheduledAt: scheduledAt.toISOString()');
    expect(scheduleForm).toContain('cadenceMonths: Number(form.get(');
    expect(scheduleForm).toContain(
      'payload.assignedUserId = assigneeUserId.trim()',
    );
    expect(scheduleForm).toContain('Lập lịch kiểm tra');
    expect(scheduleForm).toContain('Đã lập lịch kiểm tra.');
    expect(scheduleForm).toContain(
      'Không có quyền tải danh sách người được giao; có thể nhập mã thủ công.',
    );
  });

  it('preserves checklist version/status, online-required guard, offline queue and unsaved warning', () => {
    const inspection = readSource(
      'src/components/inspections/InspectionDetail.tsx',
    );
    expect(inspection).toContain('`/api/inspections/${inspectionId}`');
    expect(inspection).toContain("fetch('/api/auth/session'");
    expect(inspection).toContain("'field_officer'");
    expect(inspection).toContain('canFieldwork');
    expect(inspection).toContain("'commander'");
    expect(inspection).toContain('canApprove');
    expect(inspection).toContain('inspection.version ?? 0');
    expect(inspection).toContain('initialVersion={version}');
    expect(inspection).toContain('initialResponses={initialResponses}');
    expect(inspection).toContain('items={data.template}');
    expect(inspection).toContain('status={inspection.status}');
    expect(inspection).toContain('onStateChange={updateInspection}');
    expect(inspection).toContain('function inspectionStage');
    expect(inspection).toContain('data-testid="inspection-status"');
    expect(inspection).toContain("assignedUserId ?? 'Chưa giao'");
    expect(inspection).toContain("inspection.result ?? 'Chưa có'");

    const checklist = readSource(
      'src/components/inspections/ChecklistForm.tsx',
    );
    expect(checklist).toContain('submitOfflineCommand');
    expect(checklist).toContain('inspection.${commandName}');
    expect(checklist).toContain("resourceType: 'Inspection'");
    expect(checklist).toContain('payloadVersion: 1');
    expect(checklist).toContain('baseVersion: initialVersion');
    expect(checklist).toContain('beforeunload');
    expect(checklist).toContain("status === 'in_progress'");
    expect(checklist).toContain(
      'Checklist chỉ có thể lưu khi inspection đang được kiểm tra.',
    );
    expect(checklist).toContain('Điền mục bắt buộc trước khi lưu:');
    expect(checklist).toContain(
      'Offline: bắt đầu, lưu và hoàn tất sẽ chờ đồng bộ.',
    );
    expect(checklist).toContain('Đã lưu cục bộ, chờ đồng bộ.');
    expect(checklist).toContain('Đã bắt đầu inspection.');
    expect(checklist).toContain('Đã hoàn tất inspection.');
    expect(checklist).toContain('Đã lưu checklist.');
    expect(checklist).toContain("'needs_action'");
    expect(checklist).toContain('Chọn kết quả hoàn tất');
    expect(checklist).toContain('Inspection đã hoàn tất; checklist chỉ đọc.');
    expect(checklist).toContain('mục đã trả lời');
    expect(checklist).toContain('Bắt đầu kiểm tra');
    expect(checklist).toContain('Lưu checklist');
    expect(checklist).toContain('cần Evidence');
    expect(checklist).toContain(
      'const nextVersion = result?.version ?? initialVersion + 1',
    );
    expect(checklist).toContain("commandName === 'start'");
    expect(checklist).toContain("commandName === 'complete'");
    expect(checklist).toContain(
      'onStateChange?.({ version: nextVersion, status: nextStatus })',
    );

    const finding = readSource(
      'src/components/inspections/InspectionFindingForm.tsx',
    );
    expect(finding).toContain('onVersionChange?.(initialVersion + 1)');

    // Online-required write guards stay online-gated with explicit copy.
    expect(
      readSource('src/components/inspections/EstablishmentForm.tsx'),
    ).toContain('Đang ngoại tuyến. Kết nối mạng để lưu cơ sở.');
    expect(
      readSource('src/components/inspections/InspectionScheduleForm.tsx'),
    ).toContain('Đang ngoại tuyến. Kết nối mạng để lập lịch kiểm tra.');
    expect(
      readSource('src/components/inspections/RecommendationForm.tsx'),
    ).toContain('Đang ngoại tuyến. Kết nối mạng để gửi đề xuất.');
    expect(
      readSource('src/components/inspections/EnforcementApprovalPanel.tsx'),
    ).toContain('Đang ngoại tuyến. Kết nối mạng để phê duyệt.');
    expect(
      readSource('src/components/inspections/EnforcementApprovalPanel.tsx'),
    ).toContain('Đang ngoại tuyến. Kết nối mạng để chuyển đề xuất.');
    expect(
      readSource('src/components/inspections/EstablishmentForm.tsx'),
    ).toContain('disabled={loading || !online}');
    expect(
      readSource('src/components/inspections/RecommendationForm.tsx'),
    ).toContain(
      'disabled={disabled || loading || !online || !findings.length}',
    );

    // Offline queue keeps pending/syncing/rejected semantics with no fake success.
    const queue = readSource('src/components/field/offline-queue.ts');
    expect(queue).toContain("'pending'");
    expect(queue).toContain("'syncing'");
    expect(queue).toContain("'failed'");
    expect(queue).toContain("'rejected'");
    expect(queue).toContain("'synced'");
    expect(queue).toContain('submitOfflineCommand');

    const queueStatus = readSource(
      'src/components/field/OfflineQueueStatus.tsx',
    );
    expect(queueStatus).toContain("item.status === 'pending'");
    expect(queueStatus).toContain("item.status === 'syncing'");
    expect(queueStatus).toContain("item.status === 'failed'");
    expect(queueStatus).toContain("item.status === 'rejected'");
    expect(queueStatus).toContain("item.status === 'synced'");
    expect(queueStatus).toContain('data-testid="queue-pending-count"');
    expect(queueStatus).toContain('data-testid="queue-failed-count"');
    expect(queueStatus).toContain('data-testid="queue-synced-count"');
    expect(queueStatus).toContain(
      'Đang ngoại tuyến. Thao tác mới sẽ chờ đồng bộ.',
    );
    expect(queueStatus).toContain('Đồng bộ ngay');
  });

  it('preserves finding, evidence, recommendation and approval boundaries', () => {
    const finding = readSource(
      'src/components/inspections/InspectionFindingForm.tsx',
    );
    expect(finding).toContain('submitOfflineCommand');
    expect(finding).toContain("'inspection.finding'");
    expect(finding).toContain('payloadVersion: 1');
    expect(finding).toContain('baseVersion: initialVersion');
    expect(finding).toContain("checklistKey: String(form.get('checklistKey')");
    expect(finding).toContain("description: String(form.get('description')");
    expect(finding).toContain("result: String(form.get('result')");
    expect(finding).toContain('evidenceIds,');
    expect(finding).toContain("status === 'in_progress'");
    expect(finding).toContain(
      'Chỉ có thể ghi phát hiện khi inspection đang được kiểm tra.',
    );
    expect(finding).toContain(
      'Offline: phát hiện sẽ được giữ trong hàng đợi trên thiết bị.',
    );
    expect(finding).toContain('Đã lưu phát hiện cục bộ, chờ đồng bộ.');
    expect(finding).toContain('Đã ghi phát hiện.');
    expect(finding).toContain('Ghi phát hiện');
    expect(finding).toContain('<EvidenceCapture');
    expect(finding).toContain('resourceType="Inspection"');
    expect(finding).toContain('bằng chứng vào phát hiện mới');
    expect(finding).toContain('Cần xử lý');

    const inspection = readSource(
      'src/components/inspections/InspectionDetail.tsx',
    );
    expect(inspection).toContain('Phát hiện đã ghi');
    expect(inspection).toContain('Chưa có phát hiện.');
    expect(inspection).toContain('<EvidenceList');
    expect(inspection).toContain('<ChecklistForm');
    expect(inspection).toContain('<InspectionFindingForm');
    expect(inspection).toContain('<RecommendationForm');
    expect(inspection).toContain('<EnforcementApprovalPanel');

    const capture = readSource('src/components/field/EvidenceCapture.tsx');
    expect(capture).toContain("fetch('/api/evidence'");
    expect(capture).toContain("method: 'POST'");
    expect(capture).toContain("form.append('file'");
    expect(capture).toContain("form.append('resourceType'");
    expect(capture).toContain("form.append('resourceId'");
    expect(capture).toContain("form.append('capturedAt'");
    expect(capture).toContain('if (!navigator.onLine)');
    expect(capture).toContain(
      'Đang ngoại tuyến. Giữ tệp này và thử tải lên khi có mạng.',
    );
    expect(capture).toContain(
      'Đã giữ tệp cục bộ. Kết nối mạng để tải bằng chứng lên.',
    );

    const evidenceList = readSource('src/components/field/EvidenceList.tsx');
    expect(evidenceList).toContain('/api/evidence?evidenceId=');
    expect(evidenceList).toContain('encodeURIComponent(evidenceId)');
    expect(evidenceList).toContain('download');
    expect(evidenceList).toContain('target="_blank"');
    expect(evidenceList).toContain('rel="noreferrer"');
    expect(evidenceList).toContain('if (!evidenceIds.length) return null;');

    const recommendation = readSource(
      'src/components/inspections/RecommendationForm.tsx',
    );
    expect(recommendation).toContain(
      '`/api/inspections/${inspectionId}/commands`',
    );
    expect(recommendation).toContain("method: 'POST'");
    expect(recommendation).toContain("'submit_recommendation'");
    expect(recommendation).toContain('findingIds,');
    expect(recommendation).toContain("action: String(form.get('action')");
    expect(recommendation).toContain("reason: String(form.get('reason')");
    expect(recommendation).toContain(
      'Offline: đề xuất không được gửi cho đến khi có mạng.',
    );
    expect(recommendation).toContain('Chưa có phát hiện để làm căn cứ.');
    expect(recommendation).toContain('Chọn ít nhất một phát hiện.');
    expect(recommendation).toContain('Đã gửi đề xuất, chờ phê duyệt.');
    expect(recommendation).toContain('Gửi đề xuất xử lý');

    const approval = readSource(
      'src/components/inspections/EnforcementApprovalPanel.tsx',
    );
    expect(approval).toContain('`/api/inspections/${inspectionId}`');
    expect(approval).toContain('`/api/inspections/${inspectionId}/commands`');
    expect(approval).toContain("fetch('/api/identity/organization-units'");
    expect(approval).toContain("'approve'");
    expect(approval).toContain("'reject'");
    expect(approval).toContain("'transfer'");
    expect(approval).toContain("'pending_approval'");
    expect(approval).toContain('Phê duyệt đề xuất');
    expect(approval).toContain('Duyệt');
    expect(approval).toContain('Từ chối');
    expect(approval).toContain('Chuyển đơn vị');
    expect(approval).toContain('SLA 7 ngày');
    expect(approval).toContain('Chưa có đề xuất.');
    expect(approval).toContain('Cần ghi lý do khi từ chối đề xuất.');
    expect(approval).toContain('Chọn OrganizationUnit đích để chuyển đề xuất.');
    expect(approval).toContain('Đã duyệt đề xuất.');
    expect(approval).toContain('Đã từ chối đề xuất.');
    expect(approval).toContain(
      'Đã chuyển đề xuất đến OrganizationUnit đã chọn.',
    );
    expect(approval).toContain('Offline: quyết định phê duyệt chưa được gửi.');
    expect(approval).toContain('inspectionVersion');
    expect(approval).toContain('onChanged?.(inspectionVersion)');
  });

  it('keeps loading/error/forbidden/retry, masked, legal and accessible states safe', () => {
    const list = readSource('src/components/inspections/EstablishmentList.tsx');
    expect(list).toContain('Đang tải danh mục cơ sở…');
    expect(list).toContain('Chưa có cơ sở kinh doanh trong danh mục.');
    expect(list).toContain('Thử lại');
    expect(list).toContain('role="status"');
    expect(list).toContain(
      'Offline: danh mục cơ sở cần kết nối để tải dữ liệu mới.',
    );

    const detail = readSource(
      'src/components/inspections/EstablishmentDetail.tsx',
    );
    expect(detail).toContain('Đang tải cơ sở…');
    expect(detail).toContain('Offline: cơ sở cần kết nối để tải dữ liệu.');
    expect(detail).toContain('Không có quyền xem cơ sở:');
    expect(detail).toContain('Thử lại');

    const board = readSource(
      'src/components/inspections/InspectionScheduleBoard.tsx',
    );
    expect(board).toContain('Đang tải lịch kiểm tra…');
    expect(board).toContain('Chưa có lịch kiểm tra.');
    expect(board).toContain('Không có quyền xem lịch kiểm tra');
    expect(board).toContain('Offline: lịch cần kết nối để tải dữ liệu mới.');
    expect(board).toContain('Thử lại');
    expect(board).toContain('role="status"');

    const inspection = readSource(
      'src/components/inspections/InspectionDetail.tsx',
    );
    expect(inspection).toContain('Đang tải inspection…');
    expect(inspection).toContain(
      'Offline: inspection cần kết nối để tải hồ sơ.',
    );
    expect(inspection).toContain('Không có quyền xem inspection:');
    expect(inspection).toContain('Inspection không tồn tại.');
    expect(inspection).toContain('Thử lại');
    expect(inspection).toContain('role="status"');

    const checklist = readSource(
      'src/components/inspections/ChecklistForm.tsx',
    );
    expect(checklist).toContain('role="status"');
    expect(checklist).toContain('Không thể lưu thao tác vào hàng đợi cục bộ.');

    expect(
      readSource('src/components/inspections/EstablishmentForm.tsx'),
    ).toContain('Không thể kết nối để lưu cơ sở.');
    expect(
      readSource('src/components/inspections/EstablishmentForm.tsx'),
    ).toContain('Không được phép lưu cơ sở:');
    expect(
      readSource('src/components/inspections/InspectionScheduleForm.tsx'),
    ).toContain('Không thể kết nối để lập lịch kiểm tra.');
    expect(
      readSource('src/components/inspections/InspectionScheduleForm.tsx'),
    ).toContain('Không được phép lập lịch:');
    expect(
      readSource('src/components/inspections/RecommendationForm.tsx'),
    ).toContain('Không thể kết nối để gửi đề xuất.');
    expect(
      readSource('src/components/inspections/RecommendationForm.tsx'),
    ).toContain('Không được phép gửi đề xuất:');
    expect(
      readSource('src/components/inspections/EnforcementApprovalPanel.tsx'),
    ).toContain('Không thể kết nối để cập nhật đề xuất.');
    expect(
      readSource('src/components/inspections/EnforcementApprovalPanel.tsx'),
    ).toContain('Không thể kết nối để chuyển đề xuất.');
    expect(
      readSource('src/components/inspections/EnforcementApprovalPanel.tsx'),
    ).toContain('Không có quyền phê duyệt:');
    expect(
      readSource('src/components/inspections/InspectionFindingForm.tsx'),
    ).toContain('Không thể lưu phát hiện vào hàng đợi cục bộ.');
    expect(readSource('src/components/field/EvidenceCapture.tsx')).toContain(
      'Không thể kết nối để tải bằng chứng.',
    );

    // Masked stays masked: structured safe fields only, no raw API body/PII.
    for (const source of scoped()) {
      expect(source).not.toContain('JSON.stringify(body)');
      expect(source).not.toContain('JSON.stringify(response');
      expect(source).not.toContain('dangerouslySetInnerHTML');
      expect(source).not.toContain('innerHTML');
      expect(source).not.toContain('console.');
      expect(source).not.toContain('official');
      expect(source).not.toContain('certified');
    }
    for (const source of scoped()) {
      expect(source).not.toContain('truncate');
      expect(source).not.toContain('whitespace-nowrap');
      expect(source).not.toContain('text-ellipsis');
    }

    for (const source of controls44()) {
      expect(source).toContain('min-h-[44px]');
    }
    for (const source of formControls()) {
      expect(source).toContain('<label');
      expect(source).toContain('focus:border-[var(--civicos-accent)]');
    }
    expect(readSource('src/app/globals.css')).toContain(':focus-visible');
    expect(readSource('src/app/globals.css')).toContain(
      'prefers-reduced-motion',
    );
    expect(readSource('src/components/field/EvidenceList.tsx')).toContain(
      'aria-hidden="true"',
    );
    expect(readSource('src/components/field/EvidenceCapture.tsx')).toContain(
      'aria-label="Chọn ảnh bằng chứng"',
    );
    expect(readSource('src/components/field/OfflineQueueStatus.tsx')).toContain(
      'aria-label="Trạng thái đồng bộ"',
    );
    expect(readSource('src/components/field/OfflineQueueStatus.tsx')).toContain(
      'aria-live="polite"',
    );
    expect(readSource('src/components/field/OfflineQueueStatus.tsx')).toContain(
      'role="alert"',
    );
    expect(readSource('src/components/field/OfflineQueueStatus.tsx')).toContain(
      'Lỗi đồng bộ:',
    );
    expect(readSource('src/components/field/client-state.tsx')).toContain(
      'aria-live="polite"',
    );
    expect(readSource('src/components/field/client-state.tsx')).toContain(
      'useOnlineStatus',
    );
    expect(readSource('src/components/field/client-state.tsx')).toContain(
      'FeedbackMessage',
    );
    expect(readSource('src/components/field/client-state.tsx')).toContain(
      'readResponseError',
    );
  });
});
