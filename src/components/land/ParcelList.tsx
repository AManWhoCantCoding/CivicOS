'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { fetchParcelList } from '@/components/land/land-api';
import { focusMapUrl } from '@/components/map/land-parcel-focus';
import {
  mapLandApiStatus,
  parcelStatusText,
  type ParcelView,
} from '@/components/land/workspace-view';

function buildQuery(filters: {
  status: string;
  communeCode: string;
  parcelCode: string;
  cursor: string | null;
}): string {
  const params = new URLSearchParams();
  params.set('limit', '20');
  if (filters.status) params.set('status', filters.status);
  if (filters.communeCode) params.set('communeCode', filters.communeCode);
  if (filters.parcelCode) params.set('parcelCode', filters.parcelCode);
  if (filters.cursor) params.set('cursor', filters.cursor);
  return `?${params.toString()}`;
}

export function ParcelList() {
  const [items, setItems] = useState<ParcelView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<string | null>>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [communeFilter, setCommuneFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<
    'denied' | 'error' | 'not-found' | 'offline' | null
  >(null);
  const [online, setOnline] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    function sync() {
      setOnline(window.navigator.onLine);
    }
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  const load = useCallback(
    async (cursor: string | null) => {
      setLoading(true);
      const result = await fetchParcelList(
        buildQuery({
          status: statusFilter,
          communeCode: communeFilter,
          parcelCode: codeFilter,
          cursor,
        }),
      );
      const mapped = mapLandApiStatus(
        result.status === 0 ? null : result.status,
        window.navigator.onLine,
      );
      if (mapped === 'not-found') {
        setBanner('error');
      } else {
        setBanner(mapped);
      }
      if (!mapped) {
        setItems(result.items);
        setNextCursor(result.nextCursor);
      }
      setLoading(false);
    },
    [statusFilter, communeFilter, codeFilter],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHistory([]);
      setCurrentCursor(null);
      void load(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadToken]);

  if (loading && !items.length && !banner) {
    return <p role="status">Đang tải danh sách thửa đất…</p>;
  }
  if (banner === 'denied') {
    return (
      <p role="alert">
        Tài khoản không có quyền xem thửa đất trong phạm vi này.
      </p>
    );
  }
  if (banner === 'offline') {
    return (
      <div>
        <p role="status">
          Đang ngoại tuyến. Bộ lọc đã nhập được giữ lại; cần kết nối để tải danh
          sách mới.
        </p>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="mt-3 min-h-[44px] rounded-lg border border-[var(--civicos-info)] px-3 py-2 text-sm text-[var(--civicos-info)] hover:border-[var(--civicos-info)]"
        >
          Thử lại
        </button>
      </div>
    );
  }
  if (banner === 'error') {
    return (
      <div role="alert">
        <p>Không tải được danh sách thửa đất. Thử lại.</p>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="mt-3 min-h-[44px] rounded-lg border border-[var(--civicos-danger)] px-3 py-2 text-sm text-[var(--civicos-danger)] hover:border-[var(--civicos-danger)]"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
          Trạng thái
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
          >
            <option value="">Tất cả</option>
            <option value="active">Đang sử dụng</option>
            <option value="proposed">Đề xuất</option>
            <option value="retired">Đã ngừng</option>
          </select>
        </label>
        <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
          Mã xã
          <input
            value={communeFilter}
            onChange={(event) => setCommuneFilter(event.target.value)}
            placeholder="DEMO-COMMUNE"
            className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]"
          />
        </label>
        <label className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]">
          Mã thửa
          <input
            value={codeFilter}
            onChange={(event) => setCodeFilter(event.target.value)}
            placeholder="PARCEL-001"
            className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]"
          />
        </label>
      </form>
      {!online ? (
        <p role="status" className="text-sm text-[var(--civicos-info)]">
          Đang ngoại tuyến. Danh sách đang hiển thị dữ liệu đã tải, không thực
          hiện thay đổi.
        </p>
      ) : null}
      {loading ? <p role="status">Đang tải danh sách thửa đất…</p> : null}
      {!items.length && !loading ? (
        <p role="status">
          Chưa có thửa đất nào trong phạm vi này. Điều chỉnh bộ lọc và thử lại.
        </p>
      ) : null}
      {items.length ? (
        <table className="w-full border-collapse text-sm">
          <caption className="py-2 text-left text-[var(--civicos-text-muted)]">
            Danh sách thửa đất nội bộ theo phạm vi đơn vị
          </caption>
          <thead>
            <tr className="text-left text-[var(--civicos-text)]">
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2"
              >
                Mã thửa
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2"
              >
                Tờ / Thửa
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2"
              >
                Diện tích (m²)
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2"
              >
                Trạng thái
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2"
              >
                Bản đồ
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[var(--civicos-border)]"
              >
                <td className="px-3 py-2 font-mono text-[var(--civicos-text)]">
                  <Link
                    href={`/land/parcels/${item.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.parcelCode}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-[var(--civicos-text)]">
                  {item.mapSheetNumber} / {item.parcelNumber}
                </td>
                <td className="px-3 py-2 font-mono text-[var(--civicos-text)]">
                  {item.areaSqm}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--civicos-border)] px-3 py-1 text-xs text-[var(--civicos-text)]">
                    <span aria-hidden="true">●</span>
                    {parcelStatusText(item.status)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={focusMapUrl(item.id)}
                    aria-label={`Xem ${item.parcelCode} trên bản đồ`}
                    className="underline-offset-4 hover:underline"
                  >
                    Xem trên bản đồ
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {history.length ? (
          <button
            type="button"
            onClick={() => {
              const previous = history[history.length - 1] ?? null;
              setHistory((current) => current.slice(0, -1));
              setCurrentCursor(previous);
              void load(previous);
            }}
            className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
          >
            Trang trước
          </button>
        ) : null}
        {nextCursor ? (
          <button
            type="button"
            onClick={() => {
              setHistory((current) => [...current, currentCursor]);
              setCurrentCursor(nextCursor);
              void load(nextCursor);
            }}
            className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
          >
            Trang tiếp
          </button>
        ) : null}
      </div>
    </div>
  );
}
