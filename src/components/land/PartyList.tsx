'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchPartyList } from '@/components/land/land-api';
import {
  ParcelFeedback,
  ParcelFilterToolbar,
  ParcelTableViewport,
} from '@/components/land/ParcelPilotUI';
import {
  mapLandApiStatus,
  maskedPartyLabel,
  type PartyView,
} from '@/components/land/workspace-view';

function buildQuery(filters: {
  status: string;
  partyType: string;
  cursor: string | null;
}): string {
  const params = new URLSearchParams();
  params.set('limit', '20');
  if (filters.status) params.set('status', filters.status);
  if (filters.partyType) params.set('partyType', filters.partyType);
  if (filters.cursor) params.set('cursor', filters.cursor);
  return `?${params.toString()}`;
}

function partyTypeText(partyType: string): string {
  if (partyType === 'individual') return 'Cá nhân';
  if (partyType === 'organization') return 'Tổ chức';
  return 'Không xác định';
}

export function PartyList() {
  const [items, setItems] = useState<PartyView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<
    'denied' | 'error' | 'not-found' | 'offline' | null
  >(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(
    async (cursor: string | null) => {
      setLoading(true);
      const result = await fetchPartyList(
        buildQuery({
          status: statusFilter,
          partyType: typeFilter,
          cursor,
        }),
      );
      const mapped = mapLandApiStatus(
        result.status === 0 ? null : result.status,
        window.navigator.onLine,
      );
      setBanner(mapped === 'not-found' ? 'error' : mapped);
      if (!mapped) {
        setItems(result.items);
        setNextCursor(result.nextCursor);
      }
      setLoading(false);
    },
    [statusFilter, typeFilter],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadToken]);

  if (loading && !items.length && !banner) {
    return (
      <ParcelFeedback role="status" tone="neutral">
        Đang tải danh sách chủ thể…
      </ParcelFeedback>
    );
  }
  if (banner === 'denied') {
    return (
      <ParcelFeedback role="alert" tone="danger">
        Tài khoản không có quyền xem chủ thể đất đai trong phạm vi này.
      </ParcelFeedback>
    );
  }
  if (banner === 'offline') {
    return (
      <div>
        <ParcelFeedback role="status" tone="info">
          Đang ngoại tuyến. Cần kết nối để tải danh sách chủ thể mới.
        </ParcelFeedback>
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
      <ParcelFeedback role="alert" tone="danger" className="space-y-3">
        <p>Không tải được danh sách chủ thể. Thử lại.</p>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="min-h-[44px] rounded-lg border border-[var(--civicos-danger)] px-3 py-2 text-sm text-[var(--civicos-danger)] hover:border-[var(--civicos-danger)]"
        >
          Thử lại
        </button>
      </ParcelFeedback>
    );
  }

  return (
    <div className="space-y-5">
      <ParcelFilterToolbar label="Bộ lọc danh sách chủ thể" columns={2}>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-[var(--civicos-text)]">
          Trạng thái
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
          >
            <option value="">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="archived">Đã lưu trữ</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-[var(--civicos-text)]">
          Loại chủ thể
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
          >
            <option value="">Tất cả</option>
            <option value="individual">Cá nhân</option>
            <option value="organization">Tổ chức</option>
          </select>
        </label>
      </ParcelFilterToolbar>
      {loading ? (
        <ParcelFeedback role="status" tone="neutral">
          Đang tải danh sách chủ thể…
        </ParcelFeedback>
      ) : null}
      {!items.length && !loading ? (
        <ParcelFeedback role="status" tone="neutral" className="px-4 py-5">
          Chưa có chủ thể nào trong phạm vi này. Điều chỉnh bộ lọc và thử lại.
        </ParcelFeedback>
      ) : null}
      {items.length ? (
        <ParcelTableViewport label="Bảng danh sách chủ thể">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <caption className="px-4 py-3 text-left text-xs text-[var(--civicos-text-muted)]">
              Danh sách chủ thể nội bộ; số định danh luôn hiển thị dạng che
            </caption>
            <thead className="bg-[var(--civicos-surface-muted)]">
              <tr className="text-left text-xs font-semibold tracking-wide text-[var(--civicos-text-muted)]">
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Mã tham chiếu
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Tên hiển thị
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Định danh (đã che)
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-4 py-3"
                >
                  Loại
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--civicos-border)] transition-colors hover:bg-[var(--civicos-surface-muted)]"
                >
                  <td className="px-4 py-3 font-mono text-[var(--civicos-text)]">
                    {item.referenceCode}
                  </td>
                  <td className="px-4 py-3 text-[var(--civicos-text)]">
                    {item.displayName}
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--civicos-text)]">
                    {maskedPartyLabel(
                      {
                        referenceCode: item.referenceCode,
                        identityNumberMasked: item.identityNumberMasked,
                        displayName: item.displayName,
                      },
                      item.id,
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--civicos-text)]">
                    {partyTypeText(item.partyType)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ParcelTableViewport>
      ) : null}
      {nextCursor ? (
        <button
          type="button"
          onClick={() => void load(nextCursor)}
          className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-4 py-2 text-sm font-medium text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
        >
          Trang tiếp
        </button>
      ) : null}
    </div>
  );
}
