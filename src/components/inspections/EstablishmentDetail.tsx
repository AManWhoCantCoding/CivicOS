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
  }, [establishmentId, online]);

  if (!online && !item)
    return (
      <main className="min-h-dvh bg-slate-950 p-8 text-slate-400">
        <FeedbackMessage
          message="Offline: cơ sở cần kết nối để tải dữ liệu."
          tone="warning"
        />
      </main>
    );
  if (loading)
    return (
      <main className="min-h-dvh bg-slate-950 p-8 text-slate-400" role="status">
        Đang tải cơ sở…
      </main>
    );
  if (error || !item)
    return (
      <main className="min-h-dvh bg-slate-950 p-8 text-slate-100">
        <div className="mx-auto max-w-4xl space-y-5">
          <Link
            className="text-sm text-slate-400 hover:text-white"
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
        </div>
      </main>
    );

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          className="text-sm text-slate-400 hover:text-white"
          href="/inspections/establishments"
        >
          ← Danh mục
        </Link>
        <div className="mt-10">
          <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
            Cơ sở
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            {item.name}
          </h1>
          <p className="mt-3 text-sm text-slate-400">
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
