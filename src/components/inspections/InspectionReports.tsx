'use client';

import { useEffect, useState } from 'react';

import { INSPECTION_CATEGORIES } from '@/modules/inspections/checklist-catalog';

type Stats = {
  totalEstablishments: number;
  totalInspections: number;
  results: Record<string, number>;
  recommendations: Record<string, number>;
  recommendationSla: { active: number; overdue: number; completed: number };
  ratesByType: Record<string, { completed: number; passRate: number }>;
};

export function passRateLabel(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

export function InspectionReports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('');
  const [result, setResult] = useState<{
    key: string;
    stats?: Stats;
    error?: string;
  } | null>(null);
  const [refresh, setRefresh] = useState(0);

  const params = new URLSearchParams();
  if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
  if (to) params.set('to', new Date(`${to}T23:59:59.999`).toISOString());
  if (type) params.set('establishmentType', type);
  const query = params.toString();
  const requestKey = `${query}:${refresh}`;
  const loading = result?.key !== requestKey;
  const stats = result?.key === requestKey ? result.stats : null;
  const error = result?.key === requestKey ? result.error : undefined;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/inspections/stats?${query}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? 'Không tải được báo cáo.');
        setResult({ key: requestKey, stats: body.stats });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            key: requestKey,
            error:
              cause instanceof Error
                ? cause.message
                : 'Không tải được báo cáo.',
          });
        }
      });
    return () => controller.abort();
  }, [query, requestKey]);

  return (
    <section className="space-y-6">
      <p className="rounded-lg bg-[var(--civicos-surface-raised)] p-3 text-sm">
        Báo cáo chính sách LOCAL/DEMO, dữ liệu giả lập. Pass rate = kết quả Đạt
        / inspections đã hoàn tất. SLA 168 giờ là mục tiêu sản phẩm, không phải
        thời hạn pháp luật.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          Từ ngày
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="civicos-control mt-1 block w-full p-2"
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="civicos-control mt-1 block w-full p-2"
          />
        </label>
        <label>
          Loại hình
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="civicos-control mt-1 block w-full p-2"
          >
            <option value="">Tất cả</option>
            {INSPECTION_CATEGORIES.map((category) => (
              <option key={category.id} value={category.label}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={() => setRefresh((value) => value + 1)}
        className="civicos-control px-4 py-2"
      >
        Làm mới báo cáo
      </button>
      {loading ? <p role="status">Đang tải báo cáo…</p> : null}
      {error ? <p role="alert">Không thể tải báo cáo: {error}</p> : null}
      {!loading && !error && stats ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="civicos-surface p-4">
              Cơ sở đang hoạt động: {stats.totalEstablishments}
            </div>
            <div className="civicos-surface p-4">
              Tổng inspections: {stats.totalInspections}
            </div>
          </dl>
          <div className="civicos-surface p-4">
            <h2 className="font-semibold">Kết quả</h2>
            {Object.entries(stats.results).map(([key, value]) => (
              <p key={key}>
                {key}: {value}
              </p>
            ))}
          </div>
          <div className="civicos-surface p-4">
            <h2 className="font-semibold">Pass rate theo loại hình</h2>
            {Object.entries(stats.ratesByType).length ? (
              Object.entries(stats.ratesByType).map(([key, value]) => (
                <p key={key}>
                  {key}: {passRateLabel(value.passRate)} ({value.completed}{' '}
                  inspections đã hoàn tất)
                </p>
              ))
            ) : (
              <p>Chưa có inspection phù hợp bộ lọc.</p>
            )}
          </div>
          <div className="civicos-surface p-4">
            <h2 className="font-semibold">
              Đề xuất xử lý (không phải quyết định xử phạt)
            </h2>
            {Object.entries(stats.recommendations).map(([key, value]) => (
              <p key={key}>
                {key}: {value}
              </p>
            ))}
            <h3 className="mt-3 font-medium">
              SLA sản phẩm — 7 ngày lịch / 168 giờ
            </h3>
            <p>
              Đang chạy: {stats.recommendationSla.active}; quá hạn sản phẩm:{' '}
              {stats.recommendationSla.overdue}; hoàn tất:{' '}
              {stats.recommendationSla.completed}
            </p>
          </div>
        </>
      ) : null}
      {!loading && !error && stats?.totalInspections === 0 ? (
        <p>Không có dữ liệu trong khoảng thời gian/loại hình đã chọn.</p>
      ) : null}
    </section>
  );
}
