'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { fetchParcelList } from '@/components/land/land-api';
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
          className="mt-3 min-h-[44px] rounded-lg border border-amber-300/40 px-3 py-2 text-sm text-amber-100 hover:border-amber-200"
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
          className="mt-3 min-h-[44px] rounded-lg border border-rose-300/40 px-3 py-2 text-sm text-rose-100 hover:border-rose-200"
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
        <label className="flex min-h-[44px] flex-col gap-1 text-sm text-slate-300">
          Trạng thái
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Tất cả</option>
            <option value="active">Đang sử dụng</option>
            <option value="proposed">Đề xuất</option>
            <option value="retired">Đã ngừng</option>
          </select>
        </label>
        <label className="flex min-h-[44px] flex-col gap-1 text-sm text-slate-300">
          Mã xã
          <input
            value={communeFilter}
            onChange={(event) => setCommuneFilter(event.target.value)}
            placeholder="DEMO-COMMUNE"
            className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100"
          />
        </label>
        <label className="flex min-h-[44px] flex-col gap-1 text-sm text-slate-300">
          Mã thửa
          <input
            value={codeFilter}
            onChange={(event) => setCodeFilter(event.target.value)}
            placeholder="PARCEL-001"
            className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100"
          />
        </label>
      </form>
      {!online ? (
        <p role="status" className="text-sm text-amber-200">
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
          <caption className="py-2 text-left text-slate-400">
            Danh sách thửa đất nội bộ theo phạm vi đơn vị
          </caption>
          <thead>
            <tr className="text-left text-slate-300">
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Mã thửa
              </th>
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Tờ / Thửa
              </th>
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Diện tích (m²)
              </th>
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-800">
                <td className="px-3 py-2 font-mono text-slate-100">
                  <Link
                    href={`/land/parcels/${item.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.parcelCode}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-slate-300">
                  {item.mapSheetNumber} / {item.parcelNumber}
                </td>
                <td className="px-3 py-2 font-mono text-slate-300">
                  {item.areaSqm}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
                    <span aria-hidden="true">●</span>
                    {parcelStatusText(item.status)}
                  </span>
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
            className="min-h-[44px] rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
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
            className="min-h-[44px] rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            Trang tiếp
          </button>
        ) : null}
      </div>
    </div>
  );
}
