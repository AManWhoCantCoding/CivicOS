'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';
import { EvidenceList } from '@/components/field/EvidenceList';

import { ChecklistForm, type ChecklistItem } from './ChecklistForm';
import { EnforcementApprovalPanel } from './EnforcementApprovalPanel';
import { InspectionFindingForm } from './InspectionFindingForm';
import { RecommendationForm } from './RecommendationForm';

type InspectionState = {
  id: string;
  establishmentId: string;
  assignedUserId: string | null;
  scheduledAt: string;
  cadenceMonths: number;
  status: string;
  result: string | null;
  version?: number;
  checklistResponses?: unknown;
};

type Finding = {
  id: string;
  checklistKey: string;
  description: string;
  result: string;
  severity?: string | null;
  category?: string | null;
  evidenceIds?: unknown;
};

type Recommendation = {
  id: string;
  action: string;
  reason?: string;
  status: string;
  sla?: { dueAt: string; status: string } | null;
};

type InspectionData = {
  inspection: InspectionState | null;
  permissions?: { canFieldwork?: boolean };
  template: ChecklistItem[];
  findings: Finding[];
  recommendations: Recommendation[];
};

function responsesFrom(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const response = entry as Record<string, unknown>;
    return typeof response.key === 'string' &&
      typeof response.value === 'string'
      ? [{ key: response.key, value: response.value }]
      : [];
  });
}

function evidenceIdsFrom(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string');
}

function inspectionStage(status: string) {
  if (status === 'completed') return 2;
  if (status === 'in_progress') return 1;
  return 0;
}

function statusLabel(status: string) {
  return (
    {
      scheduled: 'Đã lập lịch',
      in_progress: 'Đang kiểm tra',
      completed: 'Đã hoàn tất',
    }[status] ?? status
  );
}

export function InspectionDetail({ inspectionId }: { inspectionId: string }) {
  const online = useOnlineStatus();
  const [data, setData] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [sessionRoles, setSessionRoles] = useState<string[]>([]);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as {
          user?: { roles?: unknown };
        } | null;
        if (response.ok && Array.isArray(body?.user?.roles)) {
          setSessionRoles(
            body.user.roles.filter(
              (role): role is string => typeof role === 'string',
            ),
          );
        }
      })
      .finally(() => setSessionLoaded(true));
  }, []);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    fetch(`/api/inspections/${inspectionId}`)
      .then(async (response) => {
        if (!cancelled) {
          setError(null);
          setDenied(false);
        }
        if (!response.ok) {
          const message = await readResponseError(
            response,
            'INSPECTION_FAILED',
          );
          throw Object.assign(new Error(message), {
            denied: response.status === 401 || response.status === 403,
          });
        }
        return response.json() as Promise<InspectionData>;
      })
      .then((result) => {
        if (cancelled) return;
        setData((current) => {
          if (!current?.inspection || !result.inspection) return result;
          const currentVersion = current.inspection.version ?? 0;
          const nextVersion = result.inspection.version ?? 0;
          if (nextVersion >= currentVersion) return result;
          return {
            ...result,
            inspection: {
              ...result.inspection,
              version: currentVersion,
              status:
                inspectionStage(current.inspection.status) >=
                inspectionStage(result.inspection.status)
                  ? current.inspection.status
                  : result.inspection.status,
            },
          };
        });
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setDenied(
          reason instanceof Error &&
            'denied' in reason &&
            Boolean(reason.denied),
        );
        setError(
          reason instanceof Error
            ? reason.message
            : 'Không thể tải inspection.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inspectionId, online, reloadToken]);

  if (!online && !data)
    return (
      <main className="min-h-dvh bg-[var(--civicos-canvas)] p-8 text-[var(--civicos-text)]">
        <FeedbackMessage
          message="Offline: inspection cần kết nối để tải hồ sơ."
          tone="warning"
        />
      </main>
    );
  if (loading && !data)
    return (
      <main
        className="min-h-dvh bg-[var(--civicos-canvas)] p-8 text-[var(--civicos-text-muted)]"
        role="status"
      >
        Đang tải inspection…
      </main>
    );
  if (error || !data?.inspection)
    return (
      <main className="min-h-dvh bg-[var(--civicos-canvas)] p-8 text-[var(--civicos-text)]">
        <div className="mx-auto max-w-4xl space-y-5">
          <Link
            className="text-sm text-[var(--civicos-text-muted)] hover:text-[var(--civicos-accent)]"
            href="/inspections/establishments"
          >
            ← Cơ sở
          </Link>
          <FeedbackMessage
            message={
              denied
                ? `Không có quyền xem inspection: ${error ?? 'FORBIDDEN'}`
                : (error ?? 'Inspection không tồn tại.')
            }
            tone={denied ? 'warning' : 'error'}
          />
          {!denied ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setLoading(true);
                setReloadToken((value) => value + 1);
              }}
              className="civicos-control min-h-[44px] border-[var(--civicos-border)] px-3 py-2 text-xs text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
            >
              Thử lại
            </button>
          ) : null}
        </div>
      </main>
    );

  const inspection = data.inspection;
  const version = inspection.version ?? 0;
  const initialResponses = responsesFrom(inspection.checklistResponses);
  const canFieldwork =
    sessionLoaded &&
    sessionRoles.includes('field_officer') &&
    data.permissions?.canFieldwork === true;
  const canApprove = sessionLoaded && sessionRoles.includes('commander');

  function updateInspection(next: { version: number; status: string }) {
    setData((current) =>
      current
        ? {
            ...current,
            inspection: current.inspection
              ? { ...current.inspection, ...next }
              : current.inspection,
          }
        : current,
    );
  }

  return (
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/inspections/establishments"
          className="text-sm text-[var(--civicos-text-muted)] hover:text-[var(--civicos-accent)]"
        >
          ← Cơ sở
        </Link>
        <div className="mt-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
              Inspection
            </p>
            <h1 className="mt-3 text-3xl font-semibold break-all text-[var(--civicos-text)]">
              {inspection.id}
            </h1>
            <p className="mt-3 text-sm text-[var(--civicos-text-muted)]">
              Cơ sở: {inspection.establishmentId} · Lịch:{' '}
              {new Date(inspection.scheduledAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <span
            data-testid="inspection-status"
            className="rounded-full bg-[var(--civicos-surface-raised)] px-3 py-1 text-xs text-[var(--civicos-accent)]"
          >
            {statusLabel(inspection.status)}
          </span>
        </div>
        {!online ? (
          <div className="mt-5">
            <FeedbackMessage
              message="Offline: thao tác mới vẫn có thể xếp hàng trên thiết bị."
              tone="warning"
            />
          </div>
        ) : null}
        <dl className="civicos-surface mt-6 grid gap-4 rounded-xl p-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Chu kỳ</dt>
            <dd className="mt-1 text-[var(--civicos-text)]">
              {inspection.cadenceMonths} tháng
            </dd>
          </div>
          <div>
            <dt className="text-[var(--civicos-text-muted)]">
              Người được giao
            </dt>
            <dd className="mt-1 break-all text-[var(--civicos-text)]">
              {inspection.assignedUserId ?? 'Chưa giao'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Kết quả</dt>
            <dd className="mt-1 text-[var(--civicos-text)]">
              {inspection.result ?? 'Chưa có'}
            </dd>
          </div>
        </dl>
        <div className="mt-8 space-y-6">
          {canFieldwork ? (
            <>
              <ChecklistForm
                inspectionId={inspectionId}
                status={inspection.status}
                initialVersion={version}
                initialResponses={initialResponses}
                items={data.template}
                onStateChange={updateInspection}
              />
              <InspectionFindingForm
                inspectionId={inspectionId}
                initialVersion={version}
                status={inspection.status}
                items={data.template}
                onVersionChange={(nextVersion) =>
                  updateInspection({
                    version: nextVersion,
                    status: inspection.status,
                  })
                }
                onSaved={() => {
                  if (online) setReloadToken((value) => value + 1);
                }}
              />
            </>
          ) : null}
          <section className="civicos-surface rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
              Phát hiện đã ghi
            </h2>
            {data.findings.length ? (
              <div className="mt-4 space-y-3">
                {data.findings.map((finding) => (
                  <article
                    key={finding.id}
                    className="rounded-lg border border-[var(--civicos-border)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-[var(--civicos-accent)]">
                          {finding.checklistKey}
                        </p>
                        <p className="mt-2 text-sm text-[var(--civicos-text)]">
                          {finding.description}
                        </p>
                        <p className="mt-1 text-xs text-[var(--civicos-text-muted)]">
                          {finding.category ?? 'Chưa phân nhóm'} · mức độ{' '}
                          {finding.severity ?? 'medium'}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--civicos-surface-raised)] px-3 py-1 text-xs text-[var(--civicos-text)]">
                        {finding.result}
                      </span>
                    </div>
                    <EvidenceList
                      evidenceIds={evidenceIdsFrom(finding.evidenceIds)}
                    />
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--civicos-text-muted)]">
                Chưa có phát hiện.
              </p>
            )}
          </section>
          {canFieldwork ? (
            <RecommendationForm
              inspectionId={inspectionId}
              findings={data.findings}
              onSaved={() => setReloadToken((value) => value + 1)}
            />
          ) : null}
          <EnforcementApprovalPanel
            inspectionId={inspectionId}
            recommendations={data.recommendations}
            canApprove={canApprove}
            onChanged={(nextVersion) => {
              if (nextVersion !== undefined) {
                updateInspection({
                  version: nextVersion,
                  status: inspection.status,
                });
              }
              setReloadToken((value) => value + 1);
            }}
          />
        </div>
      </div>
    </main>
  );
}
