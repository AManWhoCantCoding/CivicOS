'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { OrganizationUnitPicker } from '@/components/identity/OrganizationUnitPicker';
import { SessionControls } from '@/components/identity/SessionControls';
import { EvidenceCapture } from '@/components/field/EvidenceCapture';
import { EvidenceList } from '@/components/field/EvidenceList';

type IntakeDetailReport = {
  id: string;
  sourceChannel: string | null;
  status: string;
  classification: string | null;
  verificationNote: string | null;
  verificationResult: string | null;
  processedNote: string | null;
  content: string;
  receivedAt: string;
  incidentId: string | null;
  confirmedAt: string | null;
  transferToId: string | null;
  version: number;
  sourceName: string | null;
  sourceContact: string | null;
  sensitiveRef: string | null;
  revealed: boolean;
  sla: {
    recordingDueAt: string;
    verificationDueAt: string;
    notificationDueAt: string;
    overdue: boolean;
    warning: boolean;
  };
};

type IntakeDetail = {
  report: IntakeDetailReport;
  events: Array<{
    eventId: string;
    eventType: string;
    aggregateVersion: number;
    occurredAt: string;
  }>;
  approvals: Array<{
    id: string;
    action: string;
    status: string;
    requestedAt: string;
  }>;
  evidence: Array<{ id: string; fileName: string; receivedAt: string }>;
  audits: Array<{ id: string; operation: string; occurredAt: string }>;
};

class IntakeDetailError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseList(
  value: unknown,
  pick: (entry: Record<string, unknown>) => unknown,
): unknown[] {
  if (!Array.isArray(value)) throw new Error('INVALID_INTAKE_RESPONSE');
  return value.map((entry) => {
    if (!isRecord(entry)) throw new Error('INVALID_INTAKE_RESPONSE');
    return pick(entry);
  });
}

function parseDetail(value: unknown): IntakeDetail {
  if (!isRecord(value) || !isRecord(value.report)) {
    throw new Error('INVALID_INTAKE_RESPONSE');
  }
  const report = value.report;
  if (
    typeof report.id !== 'string' ||
    typeof report.status !== 'string' ||
    typeof report.content !== 'string' ||
    typeof report.receivedAt !== 'string' ||
    typeof report.version !== 'number' ||
    !isRecord(report.sla)
  ) {
    throw new Error('INVALID_INTAKE_RESPONSE');
  }
  const sla = report.sla;
  if (
    typeof sla.recordingDueAt !== 'string' ||
    typeof sla.verificationDueAt !== 'string' ||
    typeof sla.notificationDueAt !== 'string' ||
    typeof sla.overdue !== 'boolean' ||
    typeof sla.warning !== 'boolean'
  ) {
    throw new Error('INVALID_INTAKE_RESPONSE');
  }
  return {
    report: {
      id: report.id,
      sourceChannel: optionalString(report.sourceChannel),
      status: report.status,
      classification: optionalString(report.classification),
      verificationNote: optionalString(report.verificationNote),
      verificationResult: optionalString(report.verificationResult),
      processedNote: optionalString(report.processedNote),
      content: report.content,
      receivedAt: report.receivedAt,
      incidentId: optionalString(report.incidentId),
      confirmedAt: optionalString(report.confirmedAt),
      transferToId: optionalString(report.transferToId),
      version: report.version,
      sourceName: optionalString(report.sourceName),
      sourceContact: optionalString(report.sourceContact),
      sensitiveRef: optionalString(report.sensitiveRef),
      revealed: report.revealed === true,
      sla: {
        recordingDueAt: sla.recordingDueAt,
        verificationDueAt: sla.verificationDueAt,
        notificationDueAt: sla.notificationDueAt,
        overdue: sla.overdue,
        warning: sla.warning,
      },
    },
    events: parseList(value.events, (entry) => {
      if (
        typeof entry.eventId !== 'string' ||
        typeof entry.eventType !== 'string' ||
        typeof entry.aggregateVersion !== 'number' ||
        typeof entry.occurredAt !== 'string'
      ) {
        throw new Error('INVALID_INTAKE_RESPONSE');
      }
      return {
        eventId: entry.eventId,
        eventType: entry.eventType,
        aggregateVersion: entry.aggregateVersion,
        occurredAt: entry.occurredAt,
      };
    }) as IntakeDetail['events'],
    approvals: parseList(value.approvals, (entry) => {
      if (
        typeof entry.id !== 'string' ||
        typeof entry.action !== 'string' ||
        typeof entry.status !== 'string'
      ) {
        throw new Error('INVALID_INTAKE_RESPONSE');
      }
      return {
        id: entry.id,
        action: entry.action,
        status: entry.status,
        requestedAt:
          typeof entry.requestedAt === 'string' ? entry.requestedAt : '',
      };
    }) as IntakeDetail['approvals'],
    evidence: parseList(value.evidence, (entry) => ({
      id: typeof entry.id === 'string' ? entry.id : '',
      fileName: typeof entry.fileName === 'string' ? entry.fileName : '',
      receivedAt: typeof entry.receivedAt === 'string' ? entry.receivedAt : '',
    })) as IntakeDetail['evidence'],
    audits: parseList(value.audits, (entry) => ({
      id: typeof entry.id === 'string' ? entry.id : '',
      operation: typeof entry.operation === 'string' ? entry.operation : '',
      occurredAt: typeof entry.occurredAt === 'string' ? entry.occurredAt : '',
    })) as IntakeDetail['audits'],
  };
}

async function fetchIntakeDetail(reportId: string): Promise<IntakeDetail> {
  const response = await fetch(`/api/intake-reports/${reportId}`, {
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new IntakeDetailError(
      isRecord(body) && typeof body.error === 'string'
        ? body.error
        : 'INTAKE_FAILED',
      response.status,
    );
  }
  return parseDetail(body);
}

async function sendCommand(
  reportId: string,
  command: string,
  payload: Record<string, string> = {},
): Promise<void> {
  const response = await fetch(`/api/intake-reports/${reportId}/commands`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ command, ...payload }),
  });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new IntakeDetailError(
      isRecord(body) && typeof body.error === 'string'
        ? body.error
        : 'COMMAND_FAILED',
      response.status,
    );
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Không rõ thời điểm'
    : date.toLocaleString('vi-VN');
}

function commandMessage(code: string) {
  const messages: Record<string, string> = {
    CLASSIFICATION_REQUIRED: 'Cần chọn phân loại đủ cơ sở hoặc cần xác minh.',
    FORBIDDEN: 'Tài khoản hiện tại không có quyền thực hiện thao tác này.',
    INVALID_INTAKE_TRANSITION: 'Hồ sơ không ở trạng thái phù hợp.',
    ORGANIZATION_REQUIRED: 'Cần chọn OrganizationUnit nhận.',
    RECEIVING_ORGANIZATION_INVALID:
      'Đơn vị nhận không hợp lệ hoặc trùng đơn vị hiện tại.',
    REJECTION_REASON_REQUIRED: 'Cần nhập lý do từ chối hồ sơ.',
  };
  return messages[code] ?? 'Thao tác chưa hoàn tất. Vui lòng thử lại.';
}

export function IntakeReportDetail({ reportId }: { reportId: string }) {
  const [detail, setDetail] = useState<IntakeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [classification, setClassification] = useState('sufficient');
  const [verificationNote, setVerificationNote] = useState('');
  const [processedNote, setProcessedNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [transferOrganizationId, setTransferOrganizationId] =
    useState('unit-cap-tren');

  const refresh = useCallback(async () => {
    try {
      setDetail(await fetchIntakeDetail(reportId));
      setError(null);
      setErrorStatus(null);
    } catch (reason: unknown) {
      setErrorStatus(
        reason instanceof IntakeDetailError ? reason.status : null,
      );
      setError(
        reason instanceof IntakeDetailError && reason.message === 'FORBIDDEN'
          ? 'Hồ sơ này không thuộc phạm vi tài khoản hiện tại.'
          : 'Không thể mở hồ sơ IntakeReport.',
      );
    }
  }, [reportId]);

  useEffect(() => {
    let active = true;
    async function fetchCurrent() {
      try {
        const data = await fetchIntakeDetail(reportId);
        if (!active) return;
        setDetail(data);
        setError(null);
        setErrorStatus(null);
      } catch (reason: unknown) {
        if (!active) return;
        setErrorStatus(
          reason instanceof IntakeDetailError ? reason.status : null,
        );
        setError(
          reason instanceof IntakeDetailError && reason.message === 'FORBIDDEN'
            ? 'Hồ sơ này không thuộc phạm vi tài khoản hiện tại.'
            : 'Không thể mở hồ sơ IntakeReport.',
        );
      }
    }
    void fetchCurrent();
    return () => {
      active = false;
    };
  }, [reportId]);

  async function run(command: string, payload: Record<string, string> = {}) {
    setPending(command);
    setMessage(null);
    setError(null);
    setErrorStatus(null);
    try {
      await sendCommand(reportId, command, payload);
      setMessage(
        command === 'convert_to_incident'
          ? 'Đã tạo Incident từ tin báo.'
          : 'Đã ghi nhận thao tác.',
      );
      await refresh();
    } catch (reason: unknown) {
      const code = reason instanceof Error ? reason.message : 'COMMAND_FAILED';
      if (reason instanceof IntakeDetailError && reason.status === 403) {
        setErrorStatus(403);
      }
      setError(commandMessage(code));
    } finally {
      setPending(null);
    }
  }

  if (!detail && !error) {
    return (
      <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex justify-end">
            <SessionControls />
          </div>
          <p
            className="mt-10 text-sm text-[var(--civicos-text-muted)]"
            role="status"
          >
            Đang tải hồ sơ IntakeReport…
          </p>
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex justify-end">
            <SessionControls />
          </div>
          <div className="mt-10 space-y-4">
            {errorStatus === 403 ? (
              <AccessDenied message={error ?? undefined} />
            ) : (
              <p className="text-[var(--civicos-danger)]" role="alert">
                {error ?? 'Không thể mở hồ sơ IntakeReport.'}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void refresh()}
                className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]"
              >
                Thử lại
              </button>
              <Link
                href="/intake"
                className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]"
              >
                Về hàng đợi
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const report = detail.report;
  const canVerify = report.status === 'RECEIVED';
  const canProcess = report.status === 'VERIFIED';
  const canConfirm = report.status === 'VERIFIED' && !report.confirmedAt;
  const canConvert =
    report.status === 'VERIFIED' && !!report.confirmedAt && !report.incidentId;

  return (
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--civicos-border)] pb-6">
          <Link
            className="text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-accent)] hover:underline"
            href="/intake"
          >
            ← Hàng đợi
          </Link>
          <SessionControls />
        </header>
        <div className="mt-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
              IntakeReport · {report.sourceChannel ?? '—'}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--civicos-text)]">
              {report.id}
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-[var(--civicos-text)]">
              {report.content}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {report.sla.overdue ? (
              <span className="rounded-full border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] px-3 py-2 text-sm font-medium text-[var(--civicos-danger)]">
                <span aria-hidden="true">⚠ </span>Quá hạn SLA
              </span>
            ) : null}
            {report.sla.warning && !report.sla.overdue ? (
              <span className="rounded-full border border-[var(--civicos-warning)] bg-[var(--civicos-surface)] px-3 py-2 text-sm font-medium text-[var(--civicos-warning)]">
                <span aria-hidden="true">◷ </span>Sắp hạn SLA
              </span>
            ) : null}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium ${
                report.status === 'REJECTED'
                  ? 'border-[var(--civicos-danger)] text-[var(--civicos-danger)]'
                  : report.status === 'CLOSED'
                    ? 'border-[var(--civicos-success)] text-[var(--civicos-success)]'
                    : 'border-[var(--civicos-info)] text-[var(--civicos-info)]'
              }`}
            >
              <span aria-hidden="true">
                {report.status === 'REJECTED'
                  ? '⚠ '
                  : report.status === 'CLOSED'
                    ? '● '
                    : '○ '}
              </span>
              {report.status}
            </span>
          </div>
        </div>
        <section
          className="mt-8 rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5"
          aria-label="Nguồn tin"
          style={{
            borderLeftWidth: '3px',
            borderLeftColor: 'var(--civicos-warning)',
          }}
        >
          <h2 className="text-sm font-semibold text-[var(--civicos-warning)]">
            Nguồn tin
          </h2>
          <p className="mt-2 text-xs leading-5 text-[var(--civicos-text-muted)]">
            {report.revealed
              ? 'Danh tính thật hiển thị theo quyền Trưởng CA.'
              : 'Danh tính đã che theo vai trò; chỉ Trưởng CA xem được giá trị thật.'}
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-[var(--civicos-text-muted)]">
                Tên nguồn tin
              </dt>
              <dd className="mt-1 text-sm text-[var(--civicos-text)]">
                {report.sourceName ?? 'Không ghi nhận'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--civicos-text-muted)]">
                Liên hệ
              </dt>
              <dd className="mt-1 text-sm text-[var(--civicos-text)]">
                {report.sourceContact ?? 'Không ghi nhận'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--civicos-text-muted)]">
                Mã tham chiếu
              </dt>
              <dd className="mt-1 text-sm text-[var(--civicos-text)]">
                {report.sensitiveRef ?? 'Không ghi nhận'}
              </dd>
            </div>
          </dl>
        </section>
        <section
          className="mt-6 grid gap-3 sm:grid-cols-3"
          aria-label="Hạn xử lý"
        >
          <div className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4">
            <p className="text-xs text-[var(--civicos-text-muted)]">
              Ghi nhận trong 24 giờ
            </p>
            <p className="mt-2 text-sm text-[var(--civicos-text)]">
              {formatDate(report.sla.recordingDueAt)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4">
            <p className="text-xs text-[var(--civicos-text-muted)]">
              Xác minh trong 48 giờ
            </p>
            <p className="mt-2 text-sm text-[var(--civicos-text)]">
              {formatDate(report.sla.verificationDueAt)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4">
            <p className="text-xs text-[var(--civicos-text-muted)]">
              Thông báo trong 20 ngày
            </p>
            <p className="mt-2 text-sm text-[var(--civicos-text)]">
              {formatDate(report.sla.notificationDueAt)}
            </p>
          </div>
        </section>
        {errorStatus === 403 ? (
          <AccessDenied message={error ?? undefined} />
        ) : null}
        {error && errorStatus !== 403 ? (
          <p className="mt-5 text-sm text-[var(--civicos-danger)]" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p
            className="mt-5 text-sm text-[var(--civicos-success)]"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="space-y-6">
            <div className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
                Xác minh và xử lý
              </h2>
              <p className="mt-2 text-xs leading-5 text-[var(--civicos-text-muted)]">
                Xác minh chỉ đổi trạng thái tin báo. Tạo Incident là thao tác
                riêng sau khi đã xác minh.
              </p>
              <div className="mt-5 space-y-5">
                {canVerify ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run('verify', {
                        classification,
                        verificationNote: verificationNote.trim(),
                      });
                    }}
                    className="space-y-4 border-t border-[var(--civicos-border)] pt-5"
                  >
                    <h3 className="text-sm font-medium text-[var(--civicos-text)]">
                      Phân loại và xác minh
                    </h3>
                    <label className="block text-sm text-[var(--civicos-text)]">
                      Phân loại
                      <select
                        value={classification}
                        onChange={(event) =>
                          setClassification(event.target.value)
                        }
                        className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
                      >
                        <option value="sufficient">Đủ cơ sở điều tra</option>
                        <option value="needs_verification">
                          Cần xác minh thêm
                        </option>
                      </select>
                    </label>
                    <label className="block text-sm text-[var(--civicos-text)]">
                      Ghi chú xác minh
                      <textarea
                        value={verificationNote}
                        onChange={(event) =>
                          setVerificationNote(event.target.value)
                        }
                        rows={4}
                        className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={pending !== null}
                      className="min-h-[44px] rounded-lg bg-[var(--civicos-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)] disabled:opacity-50"
                    >
                      {pending === 'verify'
                        ? 'Đang lưu…'
                        : 'Lưu xác minh (không tạo Incident)'}
                    </button>
                  </form>
                ) : null}
                {canProcess ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run('process', {
                        processedNote: processedNote.trim(),
                      });
                    }}
                    className="space-y-4 border-t border-[var(--civicos-border)] pt-5"
                  >
                    <h3 className="text-sm font-medium text-[var(--civicos-text)]">
                      Ghi nhận xử lý
                    </h3>
                    <label className="block text-sm text-[var(--civicos-text)]">
                      Kết quả xử lý
                      <textarea
                        value={processedNote}
                        onChange={(event) =>
                          setProcessedNote(event.target.value)
                        }
                        rows={4}
                        className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={pending !== null}
                      className="min-h-[44px] rounded-lg bg-[var(--civicos-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)] disabled:opacity-50"
                    >
                      {pending === 'process'
                        ? 'Đang lưu…'
                        : 'Lưu kết quả xử lý'}
                    </button>
                  </form>
                ) : null}
                {canConfirm ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run('confirm');
                    }}
                    className="border-t border-[var(--civicos-border)] pt-5"
                  >
                    <h3 className="text-sm font-medium text-[var(--civicos-text)]">
                      Xác nhận hồ sơ
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-[var(--civicos-text-muted)]">
                      Xác nhận chỉ ghi nhận quyết định; chưa tạo Incident.
                    </p>
                    <button
                      type="submit"
                      disabled={pending !== null}
                      className="mt-4 min-h-[44px] rounded-lg bg-[var(--civicos-success)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:opacity-90 disabled:opacity-50"
                    >
                      {pending === 'confirm' ? 'Đang lưu…' : 'Xác nhận hồ sơ'}
                    </button>
                  </form>
                ) : null}
                {canConvert ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run('convert_to_incident');
                    }}
                    className="border-t border-[var(--civicos-border)] pt-5"
                  >
                    <h3 className="text-sm font-medium text-[var(--civicos-text)]">
                      Chuyển thành Incident
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-[var(--civicos-text-muted)]">
                      Chỉ sau khi xác nhận, thao tác này tạo đúng một Incident.
                    </p>
                    <button
                      type="submit"
                      disabled={pending !== null}
                      className="mt-4 min-h-[44px] rounded-lg bg-[var(--civicos-success)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:opacity-90"
                    >
                      {pending === 'convert_to_incident'
                        ? 'Đang tạo…'
                        : 'Tạo Incident'}
                    </button>
                  </form>
                ) : null}
                {report.incidentId ? (
                  <p className="border-t border-[var(--civicos-border)] pt-5 text-sm text-[var(--civicos-text)]">
                    Đã liên kết Incident{' '}
                    <Link
                      href={`/incidents/${report.incidentId}`}
                      className="text-[var(--civicos-accent)] underline underline-offset-4 hover:text-[var(--civicos-accent-hover)]"
                    >
                      {report.incidentId.slice(0, 8)}
                    </Link>
                    .
                  </p>
                ) : null}
                {report.status === 'RECEIVED' ||
                report.status === 'VERIFIED' ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run('reject', { reason: rejectReason.trim() });
                    }}
                    className="space-y-4 border-t border-[var(--civicos-border)] pt-5"
                  >
                    <h3 className="text-sm font-medium text-[var(--civicos-text)]">
                      Từ chối hồ sơ
                    </h3>
                    <label className="block text-sm text-[var(--civicos-text)]">
                      Lý do từ chối
                      <textarea
                        value={rejectReason}
                        onChange={(event) =>
                          setRejectReason(event.target.value)
                        }
                        rows={3}
                        className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={pending !== null}
                      className="min-h-[44px] rounded-lg border border-[var(--civicos-danger)] px-4 py-2.5 text-sm text-[var(--civicos-danger)] hover:border-[var(--civicos-danger)] disabled:opacity-50"
                    >
                      {pending === 'reject' ? 'Đang gửi…' : 'Từ chối'}
                    </button>
                  </form>
                ) : null}
                {report.status === 'PROCESSED' && !report.incidentId ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run('close');
                    }}
                    className="border-t border-[var(--civicos-border)] pt-5"
                  >
                    <button
                      type="submit"
                      disabled={pending !== null}
                      className="min-h-[44px] rounded-lg bg-[var(--civicos-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)] disabled:opacity-50"
                    >
                      {pending === 'close' ? 'Đang gửi…' : 'Đóng hồ sơ'}
                    </button>
                  </form>
                ) : null}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run('transfer', {
                      organizationId: transferOrganizationId,
                    });
                  }}
                  className="space-y-4 border-t border-[var(--civicos-border)] pt-5"
                >
                  <h3 className="text-sm font-medium text-[var(--civicos-text)]">
                    Chuyển vượt thẩm quyền
                  </h3>
                  <OrganizationUnitPicker
                    value={transferOrganizationId}
                    onChange={setTransferOrganizationId}
                    label="Đơn vị nhận / OrganizationUnit"
                  />
                  <button
                    type="submit"
                    disabled={pending !== null}
                    className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] disabled:opacity-50"
                  >
                    {pending === 'transfer'
                      ? 'Đang gửi…'
                      : 'Chuyển đơn vị (Trưởng CA)'}
                  </button>
                </form>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
                Lịch sử và truy vết
              </h2>
              {detail.events.length ? (
                <ol className="mt-4 space-y-3">
                  {detail.events.map((event) => (
                    <li
                      key={event.eventId}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-[var(--civicos-text)]">
                        {event.eventType}
                      </span>
                      <span className="text-xs text-[var(--civicos-text-muted)]">
                        v{event.aggregateVersion} ·{' '}
                        {formatDate(event.occurredAt)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-[var(--civicos-text-muted)]">
                  Chưa có sự kiện nào ngoài tiếp nhận.
                </p>
              )}
              {detail.approvals.length ? (
                <div className="mt-5 border-t border-[var(--civicos-border)] pt-4">
                  <h3 className="text-sm font-medium text-[var(--civicos-text)]">
                    Approval chuyển giao
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--civicos-text)]">
                    {detail.approvals.map((approval) => (
                      <li key={approval.id}>
                        {approval.action} · {approval.status} ·{' '}
                        {approval.id.slice(0, 8)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-5 border-t border-[var(--civicos-border)] pt-4">
                <h3 className="text-sm font-medium text-[var(--civicos-text)]">
                  Nhật ký truy cập
                </h3>
                {detail.audits.length ? (
                  <ul className="mt-3 space-y-2 text-xs text-[var(--civicos-text-muted)]">
                    {detail.audits.map((audit) => (
                      <li key={audit.id}>
                        {audit.operation} · {formatDate(audit.occurredAt)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-[var(--civicos-text-muted)]">
                    Chưa có nhật ký hiển thị.
                  </p>
                )}
              </div>
            </div>
          </section>
          <aside className="space-y-6">
            <div className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
                Bằng chứng
              </h2>
              <div className="mt-4">
                <EvidenceCapture
                  resourceType="IntakeReport"
                  resourceId={report.id}
                  onUploaded={() => void refresh()}
                  disabled={pending !== null}
                />
              </div>
              {detail.evidence.length ? (
                <EvidenceList
                  evidenceIds={detail.evidence.map((item) => item.id)}
                  label="Đã gắn với IntakeReport"
                />
              ) : (
                <p className="mt-4 text-sm text-[var(--civicos-text-muted)]">
                  Chưa gắn bằng chứng nào cho tin báo này.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
                Phân loại
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-[var(--civicos-text-muted)]">
                    Mức phân loại
                  </dt>
                  <dd className="mt-1 text-[var(--civicos-text)]">
                    {report.classification ?? 'Chưa phân loại'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--civicos-text-muted)]">
                    Ghi chú xác minh
                  </dt>
                  <dd className="mt-1 text-[var(--civicos-text)]">
                    {report.verificationNote ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--civicos-text-muted)]">
                    Kết quả
                  </dt>
                  <dd className="mt-1 text-[var(--civicos-text)]">
                    {report.verificationResult ?? report.processedNote ?? '—'}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
