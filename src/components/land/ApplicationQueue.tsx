'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

// LND-09 queue gọi GET /api/land/applications qua fetchApplicationList seam;
// chỉ render ApplicationSummary, không suy diễn parcel/assignee.
import {
  applicationChangeTypeText,
  applicationStatusText,
  buildApplicationListQuery,
  filterSummariesByCode,
  type ApplicationSummaryView,
} from '@/components/land/application-view';
import { fetchApplicationList } from '@/components/land/land-api';
import { mapLandApiStatus } from '@/components/land/workspace-view';

function readParam(params: URLSearchParams | null, key: string): string {
  if (!params) return '';
  return params.get(key) ?? '';
}

export function ApplicationQueue({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ApplicationSummaryView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<string | null>>([]);
  const [statusFilter, setStatusFilter] = useState(() =>
    readParam(searchParams, 'status'),
  );
  const [changeTypeFilter, setChangeTypeFilter] = useState(() =>
    readParam(searchParams, 'changeType'),
  );
  const [assignedFilter, setAssignedFilter] = useState(() =>
    readParam(searchParams, 'assignedTo'),
  );
  const [searchFilter, setSearchFilter] = useState(() =>
    readParam(searchParams, 'q'),
  );
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<'denied' | 'error' | 'offline' | null>(
    null,
  );
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

  const syncUrl = useCallback(
    (next: {
      status: string;
      changeType: string;
      assignedTo: string;
      q: string;
    }) => {
      const params = new URLSearchParams();
      if (next.status) params.set('status', next.status);
      if (next.changeType) params.set('changeType', next.changeType);
      if (next.assignedTo) params.set('assignedTo', next.assignedTo);
      if (next.q) params.set('q', next.q);
      const query = params.toString();
      router.replace(query ? `?${query}` : '?', { scroll: false });
    },
    [router],
  );

  const load = useCallback(
    async (cursor: string | null) => {
      setLoading(true);
      const result = await fetchApplicationList(
        buildApplicationListQuery({
          status: statusFilter,
          changeType: changeTypeFilter,
          assignedTo: assignedFilter,
          cursor,
        }),
      );
      const mapped = mapLandApiStatus(
        result.status === 0 ? null : result.status,
        window.navigator.onLine,
      );
      if (mapped === 'denied') {
        setBanner('denied');
      } else if (mapped === 'offline') {
        setBanner('offline');
      } else if (mapped) {
        setBanner('error');
      } else {
        setBanner(null);
        setItems(result.items);
        setNextCursor(result.nextCursor);
      }
      setLoading(false);
    },
    [statusFilter, changeTypeFilter, assignedFilter],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHistory([]);
      setCurrentCursor(null);
      void load(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadToken]);

  const visibleItems = filterSummariesByCode(items, searchFilter);

  function updateFilters(next: {
    status: string;
    changeType: string;
    assignedTo: string;
    q: string;
  }) {
    setStatusFilter(next.status);
    setChangeTypeFilter(next.changeType);
    setAssignedFilter(next.assignedTo);
    setSearchFilter(next.q);
    syncUrl(next);
  }

  if (loading && !items.length && !banner) {
    return <p role="status">Đang tải hàng đợi hồ sơ…</p>;
  }
  if (banner === 'denied') {
    return (
      <p role="alert">
        Tài khoản không có quyền xem hồ sơ biến động trong phạm vi này.
      </p>
    );
  }
  if (banner === 'offline' && !items.length) {
    return (
      <div>
        <p role="status">
          Đang ngoại tuyến. Bộ lọc đã nhập được giữ lại; cần kết nối để tải hàng
          đợi mới.
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
  if (banner === 'error' && !items.length) {
    return (
      <div role="alert">
        <p>Không tải được hàng đợi hồ sơ. Thử lại.</p>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-slate-400">
          {visibleItems.length} hồ sơ trong hàng đợi hiện tại.
        </p>
        {canCreate ? (
          <Link
            href="/land/applications/new"
            aria-disabled={!online}
            onClick={(event) => {
              if (!online) event.preventDefault();
            }}
            className={`inline-flex min-h-[44px] items-center rounded-lg px-4 py-2 text-sm font-semibold ${
              online
                ? 'bg-teal-700 text-white hover:bg-teal-600'
                : 'cursor-not-allowed bg-slate-800 text-slate-500'
            }`}
          >
            Tạo hồ sơ
          </Link>
        ) : null}
      </div>
      {!online ? (
        <p role="status" className="text-sm text-amber-200">
          Đang ngoại tuyến. Hàng đợi đang hiển thị dữ liệu đã tải; thao tác tạo
          hồ sơ tạm tắt.
        </p>
      ) : null}
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => event.preventDefault()}
        aria-label="Bộ lọc hàng đợi hồ sơ"
      >
        <label className="flex min-h-[44px] flex-col gap-1 text-sm text-slate-300">
          Trạng thái
          <select
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(event) =>
              updateFilters({
                status: event.target.value,
                changeType: changeTypeFilter,
                assignedTo: assignedFilter,
                q: searchFilter,
              })
            }
            className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Tất cả</option>
            <option value="submitted">Đã tiếp nhận</option>
            <option value="in_review">Đang thẩm tra</option>
            <option value="sync_pending">Chờ xử lý</option>
            <option value="sync_succeeded">Xử lý xong</option>
            <option value="sync_failed">Xử lý lỗi</option>
            <option value="pending_approval">Chờ xem xét</option>
            <option value="rejected">Đã trả lại</option>
            <option value="completed">Đã hoàn thành</option>
          </select>
        </label>
        <label className="flex min-h-[44px] flex-col gap-1 text-sm text-slate-300">
          Loại biến động
          <select
            aria-label="Lọc theo loại biến động"
            value={changeTypeFilter}
            onChange={(event) =>
              updateFilters({
                status: statusFilter,
                changeType: event.target.value,
                assignedTo: assignedFilter,
                q: searchFilter,
              })
            }
            className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Tất cả</option>
            <option value="transfer">Chuyển nhượng</option>
            <option value="information_update">Cập nhật thông tin</option>
            <option value="mortgage">Thế chấp</option>
            <option value="parcel_split_merge">Tách/Gộp thửa</option>
          </select>
        </label>
        <label className="flex min-h-[44px] flex-col gap-1 text-sm text-slate-300">
          Người được phân công
          <input
            aria-label="Lọc theo người được phân công"
            value={assignedFilter}
            onChange={(event) =>
              updateFilters({
                status: statusFilter,
                changeType: changeTypeFilter,
                assignedTo: event.target.value,
                q: searchFilter,
              })
            }
            placeholder="user-id"
            className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100"
          />
        </label>
        <label className="flex min-h-[44px] flex-col gap-1 text-sm text-slate-300">
          Tìm theo mã hồ sơ
          <input
            aria-label="Tìm theo mã hồ sơ"
            value={searchFilter}
            onChange={(event) =>
              updateFilters({
                status: statusFilter,
                changeType: changeTypeFilter,
                assignedTo: assignedFilter,
                q: event.target.value,
              })
            }
            placeholder="APP-001"
            className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100"
          />
        </label>
      </form>
      {loading ? <p role="status">Đang tải hàng đợi hồ sơ…</p> : null}
      {banner === 'error' || banner === 'offline' ? (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-amber-200">
            Không làm mới được hàng đợi; đang hiển thị nội dung đã tải. Thử lại.
          </p>
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            className="min-h-[44px] rounded-lg border border-amber-300/40 px-3 py-2 text-sm text-amber-100 hover:border-amber-200"
          >
            Thử lại
          </button>
        </div>
      ) : null}
      {!visibleItems.length && !loading ? (
        <p role="status">
          Chưa có hồ sơ nào trong phạm vi này. Điều chỉnh bộ lọc hoặc tạo hồ sơ
          mới nếu có quyền.
        </p>
      ) : null}
      {visibleItems.length ? (
        <table className="w-full border-collapse text-sm">
          <caption className="py-2 text-left text-slate-400">
            Hàng đợi hồ sơ biến động nội bộ theo phạm vi đơn vị
          </caption>
          <thead>
            <tr className="text-left text-slate-300">
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Mã hồ sơ
              </th>
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Loại biến động
              </th>
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Trạng thái
              </th>
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Phiên bản
              </th>
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Ngày nộp
              </th>
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Ngày cập nhật
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id} className="border-b border-slate-800">
                <td className="px-3 py-2 font-mono text-slate-100">
                  <Link
                    href={`/land/applications/${item.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.applicationCode}
                  </Link>
                </td>
                <td className="px-3 py-2 text-slate-200">
                  {applicationChangeTypeText(item.changeType)}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
                    <span aria-hidden="true">●</span>
                    {applicationStatusText(item.status)}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-slate-300">
                  v{item.version}
                </td>
                <td className="px-3 py-2 font-mono text-slate-300">
                  {item.submittedAt}
                </td>
                <td className="px-3 py-2 font-mono text-slate-300">
                  {item.updatedAt}
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
