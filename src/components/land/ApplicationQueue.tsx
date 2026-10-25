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
import {
  type ParcelStatusTone,
  ParcelFeedback,
  ParcelStatusBadge,
  ParcelTableViewport,
} from '@/components/land/ParcelPilotUI';
import { mapLandApiStatus } from '@/components/land/workspace-view';

function readParam(params: URLSearchParams | null, key: string): string {
  if (!params) return '';
  return params.get(key) ?? '';
}

// Tone bổ trợ cho badge trạng thái; text vẫn giữ nguyên từ applicationStatusText.
function applicationStatusTone(status: string): ParcelStatusTone {
  if (status === 'sync_succeeded' || status === 'completed') return 'success';
  if (status === 'sync_failed' || status === 'rejected') return 'danger';
  if (status === 'sync_pending' || status === 'pending_approval') {
    return 'warning';
  }
  if (status === 'submitted' || status === 'in_review') return 'info';
  return 'neutral';
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
    return (
      <ParcelFeedback role="status" tone="neutral">
        Đang tải hàng đợi hồ sơ…
      </ParcelFeedback>
    );
  }
  if (banner === 'denied') {
    return (
      <ParcelFeedback role="alert" tone="danger">
        Tài khoản không có quyền xem hồ sơ biến động trong phạm vi này.
      </ParcelFeedback>
    );
  }
  if (banner === 'offline' && !items.length) {
    return (
      <div>
        <ParcelFeedback role="status" tone="info">
          Đang ngoại tuyến. Bộ lọc đã nhập được giữ lại; cần kết nối để tải hàng
          đợi mới.
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
  if (banner === 'error' && !items.length) {
    return (
      <ParcelFeedback role="alert" tone="danger" className="space-y-3">
        <p>Không tải được hàng đợi hồ sơ. Thử lại.</p>
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-[var(--civicos-text-muted)]">
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
                ? 'bg-[var(--civicos-accent)] text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)]'
                : 'cursor-not-allowed bg-[var(--civicos-surface-muted)] text-[var(--civicos-text-muted)]'
            }`}
          >
            Tạo hồ sơ
          </Link>
        ) : null}
      </div>
      {!online ? (
        <ParcelFeedback role="status" tone="info" className="px-4 py-3">
          Đang ngoại tuyến. Hàng đợi đang hiển thị dữ liệu đã tải; thao tác tạo
          hồ sơ tạm tắt.
        </ParcelFeedback>
      ) : null}
      <form
        className="grid gap-3 rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => event.preventDefault()}
        aria-label="Bộ lọc hàng đợi hồ sơ"
      >
        <label className="flex min-w-0 min-h-[44px] flex-col gap-1 text-sm font-medium text-[var(--civicos-text)]">
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
            className="min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
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
        <label className="flex min-w-0 min-h-[44px] flex-col gap-1 text-sm font-medium text-[var(--civicos-text)]">
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
            className="min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
          >
            <option value="">Tất cả</option>
            <option value="transfer">Chuyển nhượng</option>
            <option value="information_update">Cập nhật thông tin</option>
            <option value="mortgage">Thế chấp</option>
            <option value="parcel_split_merge">Tách/Gộp thửa</option>
          </select>
        </label>
        <label className="flex min-w-0 min-h-[44px] flex-col gap-1 text-sm font-medium text-[var(--civicos-text)]">
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
            className="min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]"
          />
        </label>
        <label className="flex min-w-0 min-h-[44px] flex-col gap-1 text-sm font-medium text-[var(--civicos-text)]">
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
            className="min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]"
          />
        </label>
      </form>
      {loading ? (
        <ParcelFeedback role="status" tone="neutral" className="px-4 py-3">
          Đang tải hàng đợi hồ sơ…
        </ParcelFeedback>
      ) : null}
      {banner === 'error' || banner === 'offline' ? (
        <ParcelFeedback role="alert" tone="warning">
          <p className="text-sm">
            Không làm mới được hàng đợi; đang hiển thị nội dung đã tải. Thử
            lại.
          </p>
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            className="civicos-control mt-3 min-h-[44px] border border-[var(--civicos-warning)] bg-[var(--civicos-surface)] px-3 py-2 text-sm font-medium text-[var(--civicos-warning)] hover:bg-[var(--civicos-surface-muted)]"
          >
            <span aria-hidden="true" className="mr-2">
              ↻
            </span>
            Thử lại
          </button>
        </ParcelFeedback>
      ) : null}
      {!visibleItems.length && !loading ? (
        <ParcelFeedback role="status" tone="neutral" className="px-4 py-5">
          Chưa có hồ sơ nào trong phạm vi này. Điều chỉnh bộ lọc hoặc tạo hồ sơ
          mới nếu có quyền.
        </ParcelFeedback>
      ) : null}
      {visibleItems.length ? (
        <ParcelTableViewport label="Bảng hàng đợi hồ sơ biến động">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <caption className="px-4 py-2 text-left text-[var(--civicos-text-muted)]">
              Hàng đợi hồ sơ biến động nội bộ theo phạm vi đơn vị
            </caption>
            <thead className="bg-[var(--civicos-surface-muted)]">
              <tr className="text-left text-xs font-semibold tracking-wide text-[var(--civicos-text-muted)]">
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Mã hồ sơ
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Loại biến động
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
                  Phiên bản
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Ngày nộp
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Ngày cập nhật
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--civicos-border)] transition-colors hover:bg-[var(--civicos-surface-muted)] motion-safe:duration-150"
                >
                  <td className="px-4 py-2.5 font-mono text-[var(--civicos-text)]">
                    <Link
                      href={`/land/applications/${item.id}`}
                      className="inline-flex min-h-[44px] items-center text-[var(--civicos-accent)] underline-offset-4 hover:underline"
                    >
                      {item.applicationCode}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--civicos-text)]">
                    {applicationChangeTypeText(item.changeType)}
                  </td>
                  <td className="px-4 py-2.5">
                    <ParcelStatusBadge
                      tone={applicationStatusTone(item.status)}
                    >
                      {applicationStatusText(item.status)}
                    </ParcelStatusBadge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[var(--civicos-text)]">
                    v{item.version}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[var(--civicos-text)]">
                    {item.submittedAt}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[var(--civicos-text)]">
                    {item.updatedAt}
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
