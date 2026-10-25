'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  EstablishmentForm,
  type EstablishmentRecord,
} from './EstablishmentForm';
import { InspectionScheduleForm } from './InspectionScheduleForm';
import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

export function EstablishmentDetail({
  establishmentId,
}: {
  establishmentId: string;
}) {
  const online = useOnlineStatus();
  const [item, setItem] = useState<EstablishmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    fetch(`/api/establishments/${establishmentId}`)
      .then(async (response) => {
        if (!cancelled) {
          setError(null);
          setDenied(false);
        }
        if (!response.ok) {
          const message = await readResponseError(
            response,
            'ESTABLISHMENT_FAILED',
          );
          throw Object.assign(new Error(message), {
            denied: response.status === 401 || response.status === 403,
          });
        }
        return response.json() as Promise<{
          establishment?: EstablishmentRecord;
        }>;
      })
      .then((result) => {
        if (!cancelled) setItem(result.establishment ?? null);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setDenied(
          reason instanceof Error &&
            'denied' in reason &&
            Boolean(reason.denied),
        );
        setError(
          reason instanceof Error ? reason.message : 'Không thể tải cơ sở.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [establishmentId, online, reloadToken]);

  if (!online && !item)
    return (
      <main className="min-h-dvh bg-[var(--civicos-canvas)] p-8 text-[var(--civicos-text-muted)]">
        <FeedbackMessage
          message="Offline: cơ sở cần kết nối để tải dữ liệu."
          tone="warning"
        />
      </main>
    );
  if (loading)
    return (
      <main
        className="min-h-dvh bg-[var(--civicos-canvas)] p-8 text-[var(--civicos-text-muted)]"
        role="status"
      >
        Đang tải cơ sở…
      </main>
    );
  if (error || !item)
    return (
      <main className="min-h-dvh bg-[var(--civicos-canvas)] p-8 text-[var(--civicos-text)]">
        <div className="mx-auto max-w-4xl space-y-5">
          <Link
            className="text-sm text-[var(--civicos-text-muted)] hover:text-[var(--civicos-accent)]"
            href="/inspections/establishments"
          >
            ← Danh mục
          </Link>
          <FeedbackMessage
            message={
              denied
                ? `Không có quyền xem cơ sở: ${error ?? 'FORBIDDEN'}`
                : (error ?? 'Cơ sở không tồn tại.')
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
              className="civicos-control border-[var(--civicos-border)] px-3 py-2 text-xs text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
            >
              Thử lại
            </button>
          ) : null}
        </div>
      </main>
    );

  return (
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          className="text-sm text-[var(--civicos-text-muted)] hover:text-[var(--civicos-accent)]"
          href="/inspections/establishments"
        >
          ← Danh mục
        </Link>
        <div className="mt-10">
          <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
            Cơ sở
          </p>
          <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-[var(--civicos-text)]">
            {item.name}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--civicos-text-muted)]">
            Chỉnh sửa hồ sơ hoặc lập lịch kiểm tra cho cơ sở này.
          </p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <EstablishmentForm initial={item} onSaved={setItem} />
          <InspectionScheduleForm
            establishments={[item]}
            establishmentId={item.id}
          />
        </div>
      </div>
    </main>
  );
}
