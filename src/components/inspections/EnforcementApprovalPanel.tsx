'use client';

import { useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

type OrganizationUnit = {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
};

// Presentation-only badge helpers: state keeps text + icon, color only
// reinforces the same meaning per the shared Light/Blue semantic contract.
function recommendationBadgeClass(status: string) {
  if (status === 'approved')
    return 'border-[var(--civicos-success)] text-[var(--civicos-success)]';
  if (status === 'rejected')
    return 'border-[var(--civicos-danger)] text-[var(--civicos-danger)]';
  if (status === 'pending_approval' || status === 'pending')
    return 'border-[var(--civicos-warning)] text-[var(--civicos-warning)]';
  return 'border-[var(--civicos-border)] text-[var(--civicos-text-muted)]';
}

function recommendationIcon(status: string) {
  if (status === 'approved') return '●';
  if (status === 'rejected') return '⚠';
  if (status === 'pending_approval' || status === 'pending') return '▲';
  return '○';
}

export function EnforcementApprovalPanel({
  inspectionId,
  recommendations,
  canApprove = true,
  onChanged,
}: {
  inspectionId: string;
  recommendations: Array<{
    id: string;
    action: string;
    reason?: string;
    status: string;
    sla?: { dueAt: string; status: string } | null;
  }>;
  canApprove?: boolean;
  onChanged?: (version?: number) => void;
}) {
  const online = useOnlineStatus();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');
  const [organizationUnits, setOrganizationUnits] = useState<
    OrganizationUnit[]
  >([]);
  const [transferTargets, setTransferTargets] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!online) return;
    fetch('/api/identity/organization-units', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as {
          organizationUnits?: OrganizationUnit[];
        };
        setOrganizationUnits(body.organizationUnits ?? []);
      })
      .catch(() => setOrganizationUnits([]));
  }, [online]);

  async function decide(
    recommendationId: string,
    command: 'approve' | 'reject',
  ) {
    const reason = rejectReasons[recommendationId]?.trim() ?? '';
    if (command === 'reject' && !reason) {
      setTone('error');
      setMessage('Cần ghi lý do khi từ chối đề xuất.');
      return;
    }
    if (!online) {
      setTone('warning');
      setMessage('Đang ngoại tuyến. Kết nối mạng để phê duyệt.');
      return;
    }
    setLoadingId(recommendationId);
    setMessage(null);
    try {
      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          command,
          recommendationId,
          ...(command === 'reject' ? { reason } : {}),
        }),
      });
      if (!response.ok) {
        const error = await readResponseError(response, 'APPROVAL_FAILED');
        setTone(
          response.status === 401 || response.status === 403
            ? 'warning'
            : 'error',
        );
        setMessage(
          response.status === 401 || response.status === 403
            ? `Không có quyền phê duyệt: ${error}`
            : `Không thể cập nhật đề xuất: ${error}`,
        );
        return;
      }
      const body = (await response.json()) as { inspectionVersion?: unknown };
      const inspectionVersion =
        typeof body.inspectionVersion === 'number'
          ? body.inspectionVersion
          : undefined;
      setTone('success');
      setMessage(
        command === 'approve' ? 'Đã duyệt đề xuất.' : 'Đã từ chối đề xuất.',
      );
      onChanged?.(inspectionVersion);
    } catch {
      setTone('error');
      setMessage('Không thể kết nối để cập nhật đề xuất.');
    } finally {
      setLoadingId(null);
    }
  }

  async function transfer(recommendationId: string) {
    const organizationId = transferTargets[recommendationId]?.trim() ?? '';
    if (!organizationId) {
      setTone('error');
      setMessage('Chọn OrganizationUnit đích để chuyển đề xuất.');
      return;
    }
    if (!online) {
      setTone('warning');
      setMessage('Đang ngoại tuyến. Kết nối mạng để chuyển đề xuất.');
      return;
    }
    setLoadingId(recommendationId);
    try {
      const response = await fetch(
        `/api/inspections/${inspectionId}/commands`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            command: 'transfer',
            recommendationId,
            organizationId,
          }),
        },
      );
      if (!response.ok) {
        setTone('error');
        setMessage(await readResponseError(response, 'TRANSFER_FAILED'));
        return;
      }
      const body = (await response.json()) as { inspectionVersion?: unknown };
      setTone('success');
      setMessage('Đã chuyển đề xuất đến OrganizationUnit đã chọn.');
      onChanged?.(
        typeof body.inspectionVersion === 'number'
          ? body.inspectionVersion
          : undefined,
      );
    } catch {
      setTone('error');
      setMessage('Không thể kết nối để chuyển đề xuất.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="civicos-surface rounded-xl p-5">
      <div>
        <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
          Phê duyệt đề xuất
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--civicos-text-muted)]">
          Duyệt hoặc từ chối với lý do rõ ràng. Quyền phê duyệt được máy chủ
          kiểm tra.
        </p>
      </div>
      {!online ? (
        <div className="mt-4">
          <FeedbackMessage
            message="Offline: quyết định phê duyệt chưa được gửi."
            tone="warning"
          />
        </div>
      ) : null}
      {recommendations.length ? (
        <div className="mt-4 space-y-3">
          {recommendations.map((recommendation) => {
            const actionable =
              recommendation.status === 'pending_approval' ||
              recommendation.status === 'pending';
            return (
              <div
                key={recommendation.id}
                className="rounded-lg border border-[var(--civicos-border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--civicos-text)]">
                      {recommendation.action}
                    </p>
                    {recommendation.reason ? (
                      <p className="mt-1 text-xs leading-5 text-[var(--civicos-text-muted)]">
                        {recommendation.reason}
                      </p>
                    ) : null}
                    {recommendation.sla ? (
                      <p className="mt-2 text-xs text-[var(--civicos-warning)]">
                        SLA 7 ngày · hạn{' '}
                        {new Date(recommendation.sla.dueAt).toLocaleString(
                          'vi-VN',
                        )}{' '}
                        ({recommendation.sla.status})
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${recommendationBadgeClass(recommendation.status)}`}
                  >
                    <span aria-hidden="true">
                      {recommendationIcon(recommendation.status)}
                    </span>
                    {recommendation.status}
                  </span>
                </div>
                {actionable && canApprove ? (
                  <div className="mt-4 space-y-3">
                    <label className="block text-xs text-[var(--civicos-text-muted)]">
                      Lý do từ chối
                      <textarea
                        rows={2}
                        value={rejectReasons[recommendation.id] ?? ''}
                        onChange={(event) =>
                          setRejectReasons((current) => ({
                            ...current,
                            [recommendation.id]: event.target.value,
                          }))
                        }
                        disabled={loadingId === recommendation.id}
                        className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] disabled:opacity-60"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void decide(recommendation.id, 'approve')
                        }
                        disabled={loadingId === recommendation.id || !online}
                        className="civicos-control bg-[var(--civicos-success)] px-3 py-2 text-xs font-semibold text-[var(--civicos-accent-contrast)] hover:opacity-90 disabled:opacity-50"
                      >
                        {loadingId === recommendation.id
                          ? 'Đang xử lý…'
                          : 'Duyệt'}
                      </button>
                      {organizationUnits.length ? (
                        <select
                          aria-label="OrganizationUnit đích"
                          value={transferTargets[recommendation.id] ?? ''}
                          onChange={(event) =>
                            setTransferTargets((current) => ({
                              ...current,
                              [recommendation.id]: event.target.value,
                            }))
                          }
                          disabled={loadingId === recommendation.id}
                          className="civicos-control min-h-[44px] min-w-48 border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2 text-xs text-[var(--civicos-text)]"
                        >
                          <option value="" disabled>
                            Chọn OrganizationUnit
                          </option>
                          {organizationUnits.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name} · {unit.level}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={transferTargets[recommendation.id] ?? ''}
                          onChange={(event) =>
                            setTransferTargets((current) => ({
                              ...current,
                              [recommendation.id]: event.target.value,
                            }))
                          }
                          placeholder="Mã OrganizationUnit đích"
                          disabled={loadingId === recommendation.id}
                          className="civicos-control min-h-[44px] min-w-48 border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2 text-xs text-[var(--civicos-text)]"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => void transfer(recommendation.id)}
                        disabled={loadingId === recommendation.id || !online}
                        className="civicos-control border-[var(--civicos-warning)] px-3 py-2 text-xs text-[var(--civicos-warning)] hover:opacity-80 disabled:opacity-50"
                      >
                        Chuyển đơn vị
                      </button>
                      <button
                        type="button"
                        onClick={() => void decide(recommendation.id, 'reject')}
                        disabled={loadingId === recommendation.id || !online}
                        className="civicos-control border-[var(--civicos-danger)] px-3 py-2 text-xs text-[var(--civicos-danger)] hover:opacity-80 disabled:opacity-50"
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--civicos-text-muted)]">
          <span aria-hidden="true">○ </span>
          Chưa có đề xuất.
        </p>
      )}
      {message ? (
        <div className="mt-4">
          <FeedbackMessage message={message} tone={tone} />
        </div>
      ) : null}
    </section>
  );
}
