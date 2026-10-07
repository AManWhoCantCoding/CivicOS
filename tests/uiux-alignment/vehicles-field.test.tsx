import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const pages = () => [
  readSource('src/app/vehicles/registry/page.tsx'),
  readSource('src/app/vehicles/layout.tsx'),
  readSource('src/app/field/layout.tsx'),
  readSource('src/app/field/vehicles/page.tsx'),
  readSource('src/app/field/offline/page.tsx'),
  readSource('src/app/field/vehicles/[observationId]/page.tsx'),
];

const styled = () => [
  readSource('src/app/vehicles/registry/page.tsx'),
  readSource('src/app/vehicles/layout.tsx'),
  readSource('src/app/field/layout.tsx'),
  readSource('src/app/field/vehicles/page.tsx'),
  readSource('src/app/field/offline/page.tsx'),
  readSource('src/components/vehicles/RegistryForm.tsx'),
  readSource('src/components/vehicles/RegistryList.tsx'),
  readSource('src/components/vehicles/VehicleObservationForm.tsx'),
  readSource('src/components/vehicles/VehicleObservationList.tsx'),
  readSource('src/components/vehicles/VehicleObservationDetail.tsx'),
  readSource('src/components/vehicles/VehicleVerificationForm.tsx'),
  readSource('src/components/vehicles/VehicleEscalationForm.tsx'),
  readSource('src/components/field/EvidenceList.tsx'),
  readSource('src/components/field/EvidenceCapture.tsx'),
  readSource('src/components/field/OfflineQueueStatus.tsx'),
];

const controls = () => [
  readSource('src/components/vehicles/RegistryForm.tsx'),
  readSource('src/components/vehicles/RegistryList.tsx'),
  readSource('src/components/vehicles/VehicleObservationForm.tsx'),
  readSource('src/components/vehicles/VehicleObservationDetail.tsx'),
  readSource('src/components/vehicles/VehicleVerificationForm.tsx'),
  readSource('src/components/vehicles/VehicleEscalationForm.tsx'),
  readSource('src/components/field/EvidenceList.tsx'),
  readSource('src/components/field/EvidenceCapture.tsx'),
  readSource('src/components/field/OfflineQueueStatus.tsx'),
];

const formControls = () => [
  readSource('src/components/vehicles/RegistryForm.tsx'),
  readSource('src/components/vehicles/VehicleObservationForm.tsx'),
  readSource('src/components/vehicles/VehicleVerificationForm.tsx'),
  readSource('src/components/vehicles/VehicleEscalationForm.tsx'),
];

const scoped = () => [
  ...pages(),
  readSource('src/components/vehicles/RegistryForm.tsx'),
  readSource('src/components/vehicles/RegistryList.tsx'),
  readSource('src/components/vehicles/VehicleObservationForm.tsx'),
  readSource('src/components/vehicles/VehicleObservationList.tsx'),
  readSource('src/components/vehicles/VehicleObservationDetail.tsx'),
  readSource('src/components/vehicles/VehicleVerificationForm.tsx'),
  readSource('src/components/vehicles/VehicleEscalationForm.tsx'),
  readSource('src/components/field/EvidenceList.tsx'),
  readSource('src/components/field/EvidenceCapture.tsx'),
  readSource('src/components/field/OfflineQueueStatus.tsx'),
];

describe('T-008 vehicles/field', () => {
  it('keeps scoped vehicle/field presentation on Light/Blue semantic tokens', () => {
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
      readSource('src/app/vehicles/registry/page.tsx'),
      readSource('src/app/vehicles/layout.tsx'),
      readSource('src/app/field/layout.tsx'),
    ]) {
      expect(source).toContain('bg-[var(--civicos-canvas)]');
      expect(source).toContain('text-[var(--civicos-text)]');
    }
    // Inner field sections render inside the field shell canvas.
    for (const source of [
      readSource('src/app/field/vehicles/page.tsx'),
      readSource('src/app/field/offline/page.tsx'),
    ]) {
      expect(source).toContain('text-[var(--civicos-text)]');
      expect(source).toContain('text-[var(--civicos-text-muted)]');
    }
    // Route detail wrapper carries no presentation; it delegates.
    expect(
      readSource('src/app/field/vehicles/[observationId]/page.tsx'),
    ).toContain('<VehicleObservationDetail observationId=');
  });

  it('keeps Registry distinct from VehicleObservation with explicit match confirmation', () => {
    const registryPage = readSource('src/app/vehicles/registry/page.tsx');
    expect(registryPage).toContain('Registry xe cần chú ý');

    const registryForm = readSource('src/components/vehicles/RegistryForm.tsx');
    expect(registryForm).toContain('Thêm vào registry');
    expect(registryForm).toContain('Cập nhật registry');
    expect(registryForm).toContain('RegistryEntry');
    expect(registryForm).toContain('validFrom');
    expect(registryForm).not.toContain('VehicleObservation');
    expect(registryForm).not.toContain('observationId');

    const registryList = readSource('src/components/vehicles/RegistryList.tsx');
    expect(registryList).toContain('body.registry');
    expect(registryForm).toContain('entryId: initial.id');
    expect(registryList).not.toContain('/api/vehicles/observations');

    const observationForm = readSource(
      'src/components/vehicles/VehicleObservationForm.tsx',
    );
    expect(observationForm).toContain('Ghi nhận phương tiện');
    expect(observationForm).toContain("resourceType: 'VehicleObservation'");
    expect(observationForm).toContain("'vehicle.record_observation'");
    expect(observationForm).toContain('Đã ghi nhận. Có match cần xác nhận.');
    expect(observationForm).not.toContain("command: 'confirm_match'");

    const observationList = readSource(
      'src/components/vehicles/VehicleObservationList.tsx',
    );
    expect(observationList).toContain('Chờ xác nhận match');
    expect(observationList).toContain('Đã xác nhận match');
    expect(observationList).toContain('matchedRegistryId');

    const detail = readSource(
      'src/components/vehicles/VehicleObservationDetail.tsx',
    );
    expect(detail).toContain('VehicleObservation');
    expect(detail).toContain('Registry match');
    expect(detail).toContain('Xác nhận match');
    expect(detail).toContain("command: 'confirm_match'");
    expect(detail).toContain('baseVersion: data.observation.version');
    expect(detail).toContain("observation.status === 'match_suggested'");
    expect(detail).toContain('data.permissions.canConfirm');
    expect(detail).toContain('Đã xác nhận match. Có thể tiếp tục xác minh.');
    expect(detail).toContain('matchConfirmedAt');

    // Verification and escalation stay gated behind explicit confirmation.
    expect(
      readSource('src/components/vehicles/VehicleVerificationForm.tsx'),
    ).toContain('Cần xác nhận match trước khi xác minh.');
    expect(
      readSource('src/components/vehicles/VehicleEscalationForm.tsx'),
    ).toContain('Cần xác nhận match trước khi chuyển đơn vị.');
  });

  it('preserves existing routes, endpoints, methods, payloads and evidence boundaries', () => {
    expect(readSource('src/app/vehicles/registry/page.tsx')).toContain(
      'href="/"',
    );
    expect(readSource('src/app/vehicles/registry/page.tsx')).toContain(
      'href="/field/vehicles"',
    );
    expect(readSource('src/app/vehicles/registry/page.tsx')).toContain(
      '<RegistryForm />',
    );
    expect(readSource('src/app/vehicles/registry/page.tsx')).toContain(
      '<RegistryList />',
    );
    expect(readSource('src/app/field/vehicles/page.tsx')).toContain(
      'href="/vehicles/registry"',
    );
    expect(readSource('src/app/field/vehicles/page.tsx')).toContain(
      '<VehicleObservationWorkspace />',
    );
    expect(
      readSource('src/app/field/vehicles/[observationId]/page.tsx'),
    ).toContain('<VehicleObservationDetail observationId=');
    expect(readSource('src/app/field/offline/page.tsx')).toContain(
      '<OfflineQueueStatus />',
    );
    expect(
      readSource('src/components/vehicles/VehicleObservationList.tsx'),
    ).toContain('href="/field/offline"');
    expect(
      readSource('src/components/vehicles/VehicleObservationList.tsx'),
    ).toContain('href={`/field/vehicles/${item.id}`}');
    expect(
      readSource('src/components/vehicles/VehicleObservationDetail.tsx'),
    ).toContain('href="/field/vehicles"');

    const registryForm = readSource('src/components/vehicles/RegistryForm.tsx');
    expect(registryForm).toContain("'/api/vehicles/registry'");
    expect(registryForm).toContain("method: initial ? 'PATCH' : 'POST'");
    expect(registryForm).toContain("'content-type': 'application/json'");
    expect(registryForm).toContain('JSON.stringify(payload)');
    expect(registryForm).toContain('plate: String(form.get(');
    expect(registryForm).toContain('source: String(form.get(');
    expect(registryForm).toContain('registryChangedEventName');

    const registryList = readSource('src/components/vehicles/RegistryList.tsx');
    expect(registryList).toContain("fetch('/api/vehicles/registry')");

    const observationForm = readSource(
      'src/components/vehicles/VehicleObservationForm.tsx',
    );
    expect(observationForm).toContain('submitOfflineCommand');
    expect(observationForm).toContain('payloadVersion: 1');
    expect(observationForm).toContain('observedAt: new Date().toISOString()');
    expect(observationForm).toContain('latitude: latitudeValue');
    expect(observationForm).toContain('longitude: longitudeValue');
    expect(observationForm).toContain('description: String(form.get(');
    expect(observationForm).toContain('result?.observationId');
    expect(observationForm).toContain('resourceType="VehicleObservation"');
    expect(observationForm).toContain('resourceId={observationId}');
    expect(observationForm).toContain('label="Ảnh quan sát đã gắn"');

    const observationList = readSource(
      'src/components/vehicles/VehicleObservationList.tsx',
    );
    expect(observationList).toContain("fetch('/api/vehicles/observations')");

    const detail = readSource(
      'src/components/vehicles/VehicleObservationDetail.tsx',
    );
    expect(detail).toContain('`/api/vehicles/observations/${observationId}`');
    expect(detail).toContain("method: 'POST'");

    const verification = readSource(
      'src/components/vehicles/VehicleVerificationForm.tsx',
    );
    expect(verification).toContain("command: 'verify'");
    expect(verification).toContain('evidenceIds');
    expect(verification).toContain('result: String(form.get(');
    expect(verification).toContain('notes: String(form.get(');
    expect(verification).toContain('resourceType="VehicleObservation"');
    expect(verification).toContain('resourceId={observationId}');

    const escalation = readSource(
      'src/components/vehicles/VehicleEscalationForm.tsx',
    );
    expect(escalation).toContain("command: 'escalate'");
    expect(escalation).toContain('organizationId: organizationId.trim()');
    expect(escalation).toContain("fetch('/api/identity/organization-units')");

    const evidenceList = readSource('src/components/field/EvidenceList.tsx');
    expect(evidenceList).toContain('/api/evidence?evidenceId=');
    expect(evidenceList).toContain('encodeURIComponent(evidenceId)');
    expect(evidenceList).toContain('download');
    expect(evidenceList).toContain('target="_blank"');
    expect(evidenceList).toContain('rel="noreferrer"');
    expect(evidenceList).toContain('if (!evidenceIds.length) return null;');

    const capture = readSource('src/components/field/EvidenceCapture.tsx');
    expect(capture).toContain("fetch('/api/evidence'");
    expect(capture).toContain("method: 'POST'");
    expect(capture).toContain("form.append('file'");
    expect(capture).toContain("form.append('resourceType'");
    expect(capture).toContain("form.append('resourceId'");
    expect(capture).toContain("form.append('capturedAt'");
    expect(capture).toContain('if (!navigator.onLine)');

    const queue = readSource('src/components/field/offline-queue.ts');
    expect(queue).toContain("'pending'");
    expect(queue).toContain("'syncing'");
    expect(queue).toContain("'failed'");
    expect(queue).toContain("'rejected'");
    expect(queue).toContain("'synced'");
  });

  it('keeps offline queue, evidence and access/assignment visibility safe with no fake success', () => {
    const statusText = readSource(
      'src/components/vehicles/vehicle-status-text.ts',
    );
    expect(statusText).toContain(
      'Đã lưu cục bộ, chờ đồng bộ (chưa gửi tới máy chủ).',
    );
    expect(statusText).toContain('Đang đồng bộ, chưa hoàn tất.');
    expect(statusText).toContain('Đồng bộ thất bại, chờ thử lại.');
    expect(statusText).toContain('Máy chủ từ chối, cần kiểm tra lại.');

    const observationForm = readSource(
      'src/components/vehicles/VehicleObservationForm.tsx',
    );
    expect(observationForm).toContain(
      'Offline: quan sát sẽ được lưu cục bộ và đồng bộ khi có mạng.',
    );
    expect(observationForm).toContain(
      'Khi offline, quan sát chỉ ở trạng thái chờ đồng bộ.',
    );
    expect(observationForm).toContain(
      'Quan sát chỉ được coi là hoàn tất sau khi ảnh bằng chứng được tải lên.',
    );
    expect(observationForm).toContain(
      'describeOfflineQueueStatus(item.status)',
    );

    const queueStatus = readSource(
      'src/components/field/OfflineQueueStatus.tsx',
    );
    expect(queueStatus).toContain("item.status === 'pending'");
    expect(queueStatus).toContain("item.status === 'syncing'");
    expect(queueStatus).toContain("item.status === 'failed'");
    expect(queueStatus).toContain("item.status === 'rejected'");
    expect(queueStatus).toContain("item.status === 'synced'");
    expect(queueStatus).toContain('Chờ gửi');
    expect(queueStatus).toContain('Lỗi/từ chối');
    expect(queueStatus).toContain('Đã xác nhận');
    expect(queueStatus).toContain(
      'Đang ngoại tuyến. Thao tác mới sẽ chờ đồng bộ.',
    );
    expect(queueStatus).toContain('Đồng bộ ngay');
    expect(queueStatus).toContain('data-testid="queue-pending-count"');
    expect(queueStatus).toContain('data-testid="queue-failed-count"');
    expect(queueStatus).toContain('data-testid="queue-synced-count"');
    expect(queueStatus).not.toContain('Đã gửi thành công');
    expect(queueStatus).not.toContain('Đồng bộ thành công');
    expect(observationForm).not.toContain('Đã gửi thành công');

    const capture = readSource('src/components/field/EvidenceCapture.tsx');
    expect(capture).toContain(
      'Đang ngoại tuyến. Giữ tệp này và thử tải lên khi có mạng.',
    );
    expect(capture).toContain(
      'Đã giữ tệp cục bộ. Kết nối mạng để tải bằng chứng lên.',
    );

    expect(readSource('src/app/vehicles/registry/page.tsx')).toContain(
      "canEnterEntry(current, ['vehicle-registry'])",
    );
    expect(readSource('src/app/vehicles/registry/page.tsx')).toContain(
      'Registry xe không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại.',
    );
    expect(readSource('src/app/field/vehicles/page.tsx')).toContain(
      "'vehicle-observation'",
    );
    expect(readSource('src/app/field/vehicles/page.tsx')).toContain(
      "'vehicle-verification'",
    );
    expect(readSource('src/app/field/vehicles/page.tsx')).toContain(
      'Quan sát hiện trường không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại.',
    );
    expect(readSource('src/app/vehicles/layout.tsx')).toContain(
      'hasBusinessCapability(current.roles)',
    );
    expect(readSource('src/app/vehicles/layout.tsx')).toContain(
      'Tài khoản hiện tại không có quyền nghiệp vụ trong phân hệ Phương tiện.',
    );
    expect(readSource('src/components/vehicles/RegistryList.tsx')).toContain(
      'Không có quyền xem registry',
    );
    expect(
      readSource('src/components/vehicles/VehicleObservationList.tsx'),
    ).toContain('Không có quyền xem danh sách quan sát');
    expect(
      readSource('src/components/vehicles/VehicleObservationDetail.tsx'),
    ).toContain('Không có quyền xem quan sát');
  });

  it('keeps masked/error/retry, accessible names, focus and 44px controls where represented', () => {
    const registryList = readSource('src/components/vehicles/RegistryList.tsx');
    expect(registryList).toContain('Đang tải registry…');
    expect(registryList).toContain('Chưa có biển số trong registry.');
    expect(registryList).toContain('Thử lại');
    expect(registryList).toContain('response.status === 401');
    expect(registryList).toContain('response.status === 403');
    expect(registryList).toContain('role="status"');

    const observationList = readSource(
      'src/components/vehicles/VehicleObservationList.tsx',
    );
    expect(observationList).toContain('Đang tải quan sát…');
    expect(observationList).toContain('Chưa có quan sát phương tiện.');
    expect(observationList).toContain('response.status === 401');
    expect(observationList).toContain('role="status"');

    const detail = readSource(
      'src/components/vehicles/VehicleObservationDetail.tsx',
    );
    expect(detail).toContain('Đang tải quan sát…');
    expect(detail).toContain('Quan sát không tồn tại.');
    expect(detail).toContain('describeVehicleCommandError');
    expect(
      readSource('src/components/vehicles/vehicle-status-text.ts'),
    ).toContain('STALE_OBSERVATION');
    expect(
      readSource('src/components/vehicles/vehicle-status-text.ts'),
    ).toContain('MATCH_NOT_PENDING');
    expect(
      readSource('src/components/vehicles/vehicle-status-text.ts'),
    ).toContain('Tải lại quan sát');
    expect(detail).toContain('role="status"');

    const verification = readSource(
      'src/components/vehicles/VehicleVerificationForm.tsx',
    );
    expect(verification).toContain('Không thể kết nối để gửi xác minh.');
    expect(verification).toContain('role="status"');

    const escalation = readSource(
      'src/components/vehicles/VehicleEscalationForm.tsx',
    );
    expect(escalation).toContain('Không thể kết nối để chuyển đơn vị.');
    expect(escalation).toContain('Chọn hoặc nhập OrganizationUnit đích.');
    expect(escalation).toContain('role="status"');

    const capture = readSource('src/components/field/EvidenceCapture.tsx');
    expect(capture).toContain('Không thể kết nối để tải bằng chứng.');
    expect(capture).toContain('aria-label="Chọn ảnh bằng chứng"');

    const queueStatus = readSource(
      'src/components/field/OfflineQueueStatus.tsx',
    );
    expect(queueStatus).toContain('aria-label="Trạng thái đồng bộ"');
    expect(queueStatus).toContain('aria-live="polite"');
    expect(queueStatus).toContain('role="alert"');
    expect(queueStatus).toContain('Lỗi đồng bộ:');

    const evidenceList = readSource('src/components/field/EvidenceList.tsx');
    expect(evidenceList).toContain('aria-hidden="true"');

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

    for (const source of controls()) {
      expect(source).toContain('min-h-[44px]');
    }
    for (const source of formControls()) {
      expect(source).toContain('<label');
      expect(source).toContain('focus:border-[var(--civicos-focus)]');
    }
    expect(readSource('src/app/globals.css')).toContain(':focus-visible');
    expect(readSource('src/app/globals.css')).toContain(
      'prefers-reduced-motion',
    );
    expect(readSource('src/components/field/client-state.tsx')).toContain(
      'aria-live="polite"',
    );
    for (const source of scoped()) {
      expect(source).not.toContain('truncate');
      expect(source).not.toContain('whitespace-nowrap');
      expect(source).not.toContain('text-ellipsis');
    }
  });
});
