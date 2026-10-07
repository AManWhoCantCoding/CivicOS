'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';
import { EvidenceList } from '@/components/field/EvidenceList';

import { VehicleEscalationForm } from './VehicleEscalationForm';
import { VehicleVerificationForm } from './VehicleVerificationForm';
import { describeVehicleCommandError } from './vehicle-status-text';

type Observation = {
  id: string;
  plate: string;
  status: string;
  version: number;
  description: string | null;
  latitude: string | number;
  longitude: string | number;
  observedAt?: string;
  evidenceIds?: unknown;
  matchedRegistryId?: string | null;
  matchConfirmedAt?: string | null;
  matchConfirmedById?: string | null;
  escalatedAt?: string | null;
};

type Verification = {
  id: string;
  result: string;
  notes: string;
  ownerLookup?: string | null;
  verifiedById?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  evidenceIds?: unknown;
  verifiedAt?: string;
};

type ObservationData = {
  observation: Observation | null;
  verifications: Verification[];
  permissions: {
    canConfirm: boolean;
    canVerify: boolean;
    canEscalate: boolean;
  };
};

function evidenceIdsFrom(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string');
}

function statusLabel(status: string) {
  return (
    {
      recorded: 'Đã ghi nhận',
      match_suggested: 'Chờ xác nhận match',
      match_confirmed: 'Đã xác nhận match',
      verified: 'Đã xác minh',
      escalated: 'Đã chuyển đơn vị',
    }[status] ?? status
  );
}

export function VehicleObservationDetail({
  observationId,
}: {
  observationId: string;
}) {
  const online = useOnlineStatus();
  const [data, setData] = useState<ObservationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    fetch(`/api/vehicles/observations/${observationId}`)
      .then(async (response) => {
        if (!cancelled) {
          setError(null);
          setDenied(false);
        }
        if (!response.ok) {
          const reason = await readResponseError(
            response,
            'OBSERVATION_FAILED',
          );
          throw Object.assign(new Error(reason), {
            denied: response.status === 401 || response.status === 403,
          });
        }
        return response.json() as Promise<ObservationData>;
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setDenied(
          reason instanceof Error &&
            'denied' in reason &&
            Boolean(reason.denied),
        );
        setError(
          reason instanceof Error ? reason.message : 'Không thể tải quan sát.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [observationId, online]);

  async function confirmMatch() {
    if (!online || !data?.observation) {
      setTone('warning');
      setMessage('Cần kết nối mạng để xác nhận match.');
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/vehicles/observations/${observationId}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            command: 'confirm_match',
            baseVersion: data.observation.version,
          }),
        },
      );
      if (!response.ok) {
        const reason = await readResponseError(
          response,
          'MATCH_CONFIRMATION_FAILED',
        );
        setTone(
          response.status === 401 || response.status === 403
            ? 'warning'
            : 'error',
        );
        setMessage(describeVehicleCommandError(reason, response.status));
        return;
      }
      const body = (await response.json()) as { observation?: Observation };
      if (!body.observation) {
        setTone('error');
        setMessage('Máy chủ không trả về quan sát đã cập nhật.');
        return;
      }
      setData((current) =>
        current
          ? { ...current, observation: body.observation ?? current.observation }
          : current,
      );
      setTone('success');
      setMessage('Đã xác nhận match. Có thể tiếp tục xác minh.');
    } catch {
      setTone('error');
      setMessage('Không thể kết nối để xác nhận match.');
    } finally {
      setActionLoading(false);
    }
  }

  if (!online && !data)
    return (
      <section className="space-y-5">
        <FeedbackMessage
          message="Offline: chi tiết quan sát cần kết nối để tải."
          tone="warning"
        />
      </section>
    );
  if (loading && !data)
    return (
      <section className="text-sm text-[var(--civicos-info)]" role="status">
        Đang tải quan sát…
      </section>
    );
  if (error || !data?.observation)
    return (
      <section className="space-y-5">
        <Link
          href="/field/vehicles"
          className="text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-accent)] hover:underline"
        >
          ← Hiện trường
        </Link>
        <FeedbackMessage
          message={
            denied
              ? `Không có quyền xem quan sát: ${error ?? 'FORBIDDEN'}`
              : (error ?? 'Quan sát không tồn tại.')
          }
          tone={denied ? 'warning' : 'error'}
        />
      </section>
    );

  const observation = data.observation;
  const observationEvidence = evidenceIdsFrom(observation.evidenceIds);

  function updateObservation(next: Record<string, unknown>) {
    setData((current) =>
      current
        ? {
            ...current,
            observation: current.observation
              ? { ...current.observation, ...next }
              : current.observation,
          }
        : current,
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/field/vehicles"
            className="text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-accent)] hover:underline"
          >
            ← Hiện trường
          </Link>
          <p className="mt-8 font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
            VehicleObservation
          </p>
          <h1 className="mt-3 font-mono text-3xl font-semibold text-[var(--civicos-text)]">
            {observation.plate}
          </h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--civicos-border)] px-3 py-1 text-xs text-[var(--civicos-text)]">
          {statusLabel(observation.status)}
        </span>
      </div>
      {!online ? (
        <FeedbackMessage
          message="Offline: đang hiển thị dữ liệu đã tải; thao tác trực tiếp sẽ chờ mạng."
          tone="warning"
        />
      ) : null}
      <div className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5">
        <p className="text-sm text-[var(--civicos-text)]">
          {observation.description ?? 'Không có mô tả.'}
        </p>
        <dl className="mt-5 grid gap-4 text-xs text-[var(--civicos-text-muted)] sm:grid-cols-2">
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Quan sát lúc</dt>
            <dd className="mt-1 text-[var(--civicos-text)]">
              {observation.observedAt
                ? new Date(observation.observedAt).toLocaleString('vi-VN')
                : 'Không có dữ liệu'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Vị trí</dt>
            <dd className="mt-1 text-[var(--civicos-text)]">
              {observation.latitude}, {observation.longitude}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Registry match</dt>
            <dd className="mt-1 break-all text-[var(--civicos-text)]">
              {observation.matchedRegistryId ?? 'Không có'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Xác nhận match</dt>
            <dd className="mt-1 text-[var(--civicos-text)]">
              {observation.matchConfirmedAt
                ? `${new Date(observation.matchConfirmedAt).toLocaleString('vi-VN')}${observation.matchConfirmedById ? ` · ${observation.matchConfirmedById}` : ''}`
                : 'Chưa xác nhận'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--civicos-text-muted)]">
              Chuyển đơn vị lúc
            </dt>
            <dd className="mt-1 text-[var(--civicos-text)]">
              {observation.escalatedAt
                ? new Date(observation.escalatedAt).toLocaleString('vi-VN')
                : 'Chưa chuyển'}
            </dd>
          </div>
        </dl>
        <EvidenceList evidenceIds={observationEvidence} />
        {data.permissions.canConfirm &&
        observation.status === 'match_suggested' ? (
          <div className="mt-5 border-t border-[var(--civicos-border)] pt-4">
            <p className="text-sm text-[var(--civicos-text)]">
              Hệ thống gợi ý match với registry. Cần xác nhận trước khi xác
              minh.
            </p>
            <button
              type="button"
              onClick={() => void confirmMatch()}
              disabled={actionLoading || !online}
              className="mt-3 min-h-[44px] rounded-lg bg-[var(--civicos-accent)] px-4 py-2 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)] disabled:opacity-50"
            >
              {actionLoading ? 'Đang xác nhận…' : 'Xác nhận match'}
            </button>
          </div>
        ) : null}
      </div>
      {data.permissions.canVerify ? (
        <VehicleVerificationForm
          observationId={observationId}
          status={observation.status}
          onSaved={({ observation: nextObservation, verification }) => {
            updateObservation(nextObservation);
            setData((current) =>
              current
                ? {
                    ...current,
                    verifications: [
                      ...current.verifications,
                      verification as Verification,
                    ],
                  }
                : current,
            );
          }}
        />
      ) : null}
      {data.permissions.canEscalate ? (
        <VehicleEscalationForm
          observationId={observationId}
          status={observation.status}
          onSaved={updateObservation}
        />
      ) : null}
      <section className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5">
        <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
          Lịch sử xác minh
        </h2>
        {data.verifications.length ? (
          <div className="mt-4 space-y-3">
            {data.verifications.map((verification) => (
              <article
                key={verification.id}
                className="rounded-lg border border-[var(--civicos-border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-sm text-[var(--civicos-text)]">
                    {verification.result}
                  </p>
                  {verification.verifiedAt ? (
                    <time className="text-xs text-[var(--civicos-text-muted)]">
                      {new Date(verification.verifiedAt).toLocaleString(
                        'vi-VN',
                      )}
                    </time>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--civicos-text-muted)]">
                  {verification.notes}
                </p>
                {verification.verifiedById ? (
                  <p className="mt-2 text-xs text-[var(--civicos-text-muted)]">
                    Người xác minh: {verification.verifiedById}
                  </p>
                ) : null}
                {verification.ownerLookup ? (
                  <p className="mt-2 text-xs text-[var(--civicos-text-muted)]">
                    Tra cứu chủ xe: {verification.ownerLookup}
                  </p>
                ) : null}
                {verification.latitude !== null &&
                verification.latitude !== undefined ? (
                  <p className="mt-2 text-xs text-[var(--civicos-text-muted)]">
                    Vị trí: {verification.latitude}, {verification.longitude}
                  </p>
                ) : null}
                <EvidenceList
                  evidenceIds={evidenceIdsFrom(verification.evidenceIds)}
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--civicos-text-muted)]">
            Chưa có lần xác minh nào.
          </p>
        )}
      </section>
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
    </section>
  );
}
