'use client';

import { useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

type Statistics = {
  monthlyFrequency: { month: string; count: number }[];
  locationFrequency: { cellId: string; count: number }[];
};

export function VehicleStatistics({ refreshKey = 0 }: { refreshKey?: number }) {
  const online = useOnlineStatus();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    fetch('/api/vehicles/statistics')
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            await readResponseError(response, 'STATISTICS_FAILED'),
          );
        return (await response.json()) as Statistics;
      })
      .then((result) => {
        if (!cancelled) {
          setStatistics(result);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Không thể tải thống kê.',
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [online, refreshKey]);

  return (
    <section
      aria-labelledby="vehicle-statistics-heading"
      className="space-y-4 rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5"
    >
      <div>
        <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
          Tổng hợp
        </p>
        <h2
          id="vehicle-statistics-heading"
          className="mt-2 text-xl font-semibold text-[var(--civicos-text)]"
        >
          Tần suất xe lạ
        </h2>
      </div>
      {!online ? (
        <FeedbackMessage message="Thống kê cần kết nối mạng." tone="warning" />
      ) : null}
      {online && loading ? (
        <p role="status" className="text-sm text-[var(--civicos-info)]">
          Đang tải thống kê…
        </p>
      ) : null}
      {error ? <FeedbackMessage message={error} tone="error" /> : null}
      {statistics ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--civicos-text)]">
              Theo tháng
            </h3>
            {statistics.monthlyFrequency.length ? (
              <table className="mt-2 w-full text-left text-sm">
                <caption className="sr-only">
                  Số ghi nhận theo tháng địa phương
                </caption>
                <thead>
                  <tr className="text-xs text-[var(--civicos-text-muted)]">
                    <th scope="col" className="py-2">
                      Tháng
                    </th>
                    <th scope="col" className="py-2">
                      Số ghi nhận
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.monthlyFrequency.map(({ month, count }) => (
                    <tr
                      key={month}
                      className="border-t border-[var(--civicos-border)]"
                    >
                      <th scope="row" className="py-2 font-medium">
                        {month}
                      </th>
                      <td className="py-2">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-2 text-sm text-[var(--civicos-text-muted)]">
                Chưa có ghi nhận.
              </p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--civicos-text)]">
              Điểm thường xuất hiện · ô xấp xỉ 100 m
            </h3>
            {statistics.locationFrequency.length ? (
              <table className="mt-2 w-full text-left text-sm">
                <caption className="sr-only">
                  Tần suất theo ô vị trí xấp xỉ 100 mét
                </caption>
                <thead>
                  <tr className="text-xs text-[var(--civicos-text-muted)]">
                    <th scope="col" className="py-2">
                      Ô vị trí
                    </th>
                    <th scope="col" className="py-2">
                      Số ghi nhận
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.locationFrequency.map(({ cellId, count }) => (
                    <tr
                      key={cellId}
                      className="border-t border-[var(--civicos-border)]"
                    >
                      <th scope="row" className="py-2 font-mono font-medium">
                        {cellId}
                      </th>
                      <td className="py-2">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-2 text-sm text-[var(--civicos-text-muted)]">
                Chưa có ghi nhận.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
