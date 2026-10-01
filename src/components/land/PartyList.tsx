'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchPartyList } from '@/components/land/land-api';
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
    return <p role="status">Đang tải danh sách chủ thể…</p>;
  }
  if (banner === 'denied') {
    return (
      <p role="alert">
        Tài khoản không có quyền xem chủ thể đất đai trong phạm vi này.
      </p>
    );
  }
  if (banner === 'offline') {
    return (
      <div>
        <p role="status">
          Đang ngoại tuyến. Cần kết nối để tải danh sách chủ thể mới.
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
        <p>Không tải được danh sách chủ thể. Thử lại.</p>
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
            <option value="active">Đang hoạt động</option>
            <option value="archived">Đã lưu trữ</option>
          </select>
        </label>
        <label className="flex min-h-[44px] flex-col gap-1 text-sm text-slate-300">
          Loại chủ thể
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Tất cả</option>
            <option value="individual">Cá nhân</option>
            <option value="organization">Tổ chức</option>
          </select>
        </label>
      </form>
      {loading ? <p role="status">Đang tải danh sách chủ thể…</p> : null}
      {!items.length && !loading ? (
        <p role="status">
          Chưa có chủ thể nào trong phạm vi này. Điều chỉnh bộ lọc và thử lại.
        </p>
      ) : null}
      {items.length ? (
        <table className="w-full border-collapse text-sm">
          <caption className="py-2 text-left text-slate-400">
            Danh sách chủ thể nội bộ; số định danh luôn hiển thị dạng che
          </caption>
          <thead>
            <tr className="text-left text-slate-300">
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Mã tham chiếu
              </th>
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Tên hiển thị
              </th>
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Định danh (đã che)
              </th>
              <th scope="col" className="border-b border-slate-700 px-3 py-2">
                Loại
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-800">
                <td className="px-3 py-2 font-mono text-slate-100">
                  {item.referenceCode}
                </td>
                <td className="px-3 py-2 text-slate-200">{item.displayName}</td>
                <td className="px-3 py-2 font-mono text-slate-300">
                  {maskedPartyLabel(
                    {
                      referenceCode: item.referenceCode,
                      identityNumberMasked: item.identityNumberMasked,
                      displayName: item.displayName,
                    },
                    item.id,
                  )}
                </td>
                <td className="px-3 py-2 text-slate-300">
                  {partyTypeText(item.partyType)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {nextCursor ? (
        <button
          type="button"
          onClick={() => void load(nextCursor)}
          className="min-h-[44px] rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Trang tiếp
        </button>
      ) : null}
    </div>
  );
}
