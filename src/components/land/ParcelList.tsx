'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { fetchParcelList } from '@/components/land/land-api';
import {
  type ParcelStatusTone,
  ParcelFeedback,
  ParcelFilterToolbar,
  ParcelStatusBadge,
  ParcelTableViewport,
} from '@/components/land/ParcelPilotUI';
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

// Tone bổ trợ cho badge trạng thái; text vẫn giữ nguyên từ parcelStatusText.
function parcelStatusTone(status: string): ParcelStatusTone {
  if (status === 'active') return 'success';
  if (status === 'proposed') return 'info';
  return 'neutral';
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
    return (
      <ParcelFeedback role="status" tone="neutral">
        Đang tải danh sách thửa đất…
      </ParcelFeedback>
    );
  }
  if (banner === 'denied') {
    return (
      <ParcelFeedback role="alert" tone="danger">
        Tài khoản không có quyền xem thửa đất trong phạm vi này.
      </ParcelFeedback>
    );
  }
  if (banner === 'offline') {
    return (
      <div>
        <ParcelFeedback role="status" tone="info">
          Đang ngoại tuyến. Bộ lọc đã nhập được giữ lại; cần kết nối để tải danh
          sách mới.
        </ParcelFeedback>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="civicos-control mt-3 min-h-[44px] border border-[var(--civicos-info)] bg-[var(--civicos-surface)] px-3 py-2 text-sm font-medium text-[var(--civicos-info)] hover:bg-[var(--civicos-surface-muted)]"
        >
          <span aria-hidden="true" className="mr-2">
            ↻
          </span>
          Thử lại
        </button>
      </div>
    );
  }
  if (banner === 'error') {
    return (
      <ParcelFeedback role="alert" tone="danger" className="space-y-3">
        <p>Không tải được danh sách thửa đất. Thử lại.</p>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="civicos-control min-h-[44px] border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] px-3 py-2 text-sm font-medium text-[var(--civicos-danger)] hover:bg-[var(--civicos-surface-muted)]"
        >
          <span aria-hidden="true" className="mr-2">
            ↻
          </span>
          Thử lại
        </button>
      </ParcelFeedback>
    );
  }

  return (
    <div className="space-y-5">
      <ParcelFilterToolbar label="Bộ lọc danh sách thửa đất" columns={3}>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-[var(--civicos-text)]">
          Trạng thái
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
          >
            <option value="">Tất cả</option>
            <option value="active">Đang sử dụng</option>
            <option value="proposed">Đề xuất</option>
            <option value="retired">Đã ngừng</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-[var(--civicos-text)]">
          Mã xã
          <input
            value={communeFilter}
            onChange={(event) => setCommuneFilter(event.target.value)}
            placeholder="DEMO-COMMUNE"
            className="min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-[var(--civicos-text)]">
          Mã thửa
          <input
            value={codeFilter}
            onChange={(event) => setCodeFilter(event.target.value)}
            placeholder="PARCEL-001"
            className="min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]"
          />
        </label>
      </ParcelFilterToolbar>
      {!online ? (
        <ParcelFeedback role="status" tone="info" className="px-4 py-3">
          Đang ngoại tuyến. Danh sách đang hiển thị dữ liệu đã tải, không thực
          hiện thay đổi.
        </ParcelFeedback>
      ) : null}
      {loading ? (
        <ParcelFeedback role="status" tone="neutral">
          Đang tải danh sách thửa đất…
        </ParcelFeedback>
      ) : null}
      {!items.length && !loading ? (
        <ParcelFeedback role="status" tone="neutral" className="px-4 py-5">
          Chưa có thửa đất nào trong phạm vi này. Điều chỉnh bộ lọc và thử lại.
        </ParcelFeedback>
      ) : null}
      {items.length ? (
        <ParcelTableViewport label="Bảng danh sách thửa đất">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <caption className="px-4 py-3 text-left text-xs text-[var(--civicos-text-muted)]">
              Danh sách thửa đất nội bộ theo phạm vi đơn vị
            </caption>
            <thead className="bg-[var(--civicos-surface-muted)]">
              <tr className="text-left text-xs font-semibold tracking-wide text-[var(--civicos-text-muted)]">
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Mã thửa
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Tờ / Thửa
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Diện tích (m²)
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Trạng thái
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Bản đồ
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--civicos-border)] transition-colors hover:bg-[var(--civicos-surface-muted)] motion-safe:duration-150"
                >
                  <td className="px-4 py-2 font-mono text-[var(--civicos-text)]">
                    <Link
                      href={`/land/parcels/${item.id}`}
                      className="inline-flex min-h-[44px] items-center text-[var(--civicos-accent)] underline-offset-4 hover:underline"
                    >
                      {item.parcelCode}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-[var(--civicos-text)]">
                    {item.mapSheetNumber} / {item.parcelNumber}
                  </td>
                  <td className="px-4 py-2 font-mono text-[var(--civicos-text)]">
                    {item.areaSqm}
                  </td>
                  <td className="px-4 py-2">
                    <ParcelStatusBadge tone={parcelStatusTone(item.status)}>
                      {parcelStatusText(item.status)}
                    </ParcelStatusBadge>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={focusMapUrl(item.id)}
                      aria-label={`Xem ${item.parcelCode} trên bản đồ`}
                      className="inline-flex min-h-[44px] items-center text-[var(--civicos-accent)] underline-offset-4 hover:underline"
                    >
                      Xem trên bản đồ
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ParcelTableViewport>
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
            className="civicos-control motion-safe:transition-colors min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-4 py-2 text-sm font-medium text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
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
            className="civicos-control motion-safe:transition-colors min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-4 py-2 text-sm font-medium text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
          >
            Trang tiếp
          </button>
        ) : null}
      </div>
    </div>
  );
}
