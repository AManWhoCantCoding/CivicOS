'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { EvidencePanel } from '@/components/land/EvidencePanel';
import { fetchParcelDetail, fetchPartyList } from '@/components/land/land-api';
import {
  encumbranceStatusText,
  geometryPreviewText,
  mapLandApiStatus,
  maskedPartyLabel,
  parcelStatusText,
  rightStatusText,
  type ParcelDetailView,
  type PartyView,
} from '@/components/land/workspace-view';

type DetailBanner = 'denied' | 'error' | 'not-found' | 'offline' | null;

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return value;
}

export function ParcelDetail({ parcelId }: { parcelId: string }) {
  const [detail, setDetail] = useState<ParcelDetailView | null>(null);
  const [parties, setParties] = useState<Map<string, PartyView>>(new Map());
  const [banner, setBanner] = useState<DetailBanner>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [parcelResult, partyResult] = await Promise.all([
      fetchParcelDetail(parcelId),
      fetchPartyList('?limit=100'),
    ]);
    const online = window.navigator.onLine;
    const mapped = mapLandApiStatus(
      parcelResult.status === 0 ? null : parcelResult.status,
      online,
    );
    setBanner(mapped);
    if (!mapped && parcelResult.detail) {
      setDetail(parcelResult.detail);
    }
    if (partyResult.items.length) {
      setParties(new Map(partyResult.items.map((item) => [item.id, item])));
    }
    setLoading(false);
  }, [parcelId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadToken]);

  if (loading && !detail && !banner) {
    return (
      <div
        className="space-y-4"
        role="status"
        aria-label="Đang tải chi tiết thửa đất"
      >
        <div className="h-24 rounded-xl bg-slate-900 motion-safe:animate-pulse" />
        <p className="text-sm text-slate-400">Đang tải chi tiết thửa đất…</p>
      </div>
    );
  }
  if (banner === 'denied') {
    return (
      <p role="alert">
        Thửa đất này không thuộc nhiệm vụ hoặc phạm vi đơn vị của tài khoản hiện
        tại.
      </p>
    );
  }
  if (banner === 'not-found') {
    return (
      <div role="alert">
        <p>Không tìm thấy thửa đất yêu cầu.</p>
        <Link
          href="/land/parcels"
          className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Về danh sách thửa đất
        </Link>
      </div>
    );
  }
  if (banner === 'offline' && !detail) {
    return (
      <div>
        <p role="status">
          Đang ngoại tuyến. Cần kết nối để tải chi tiết thửa đất; dữ liệu đã tải
          trước đó được giữ nguyên.
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
  if ((banner === 'error' || banner === 'offline') && !detail) {
    return (
      <div role="alert">
        <p>Không tải được chi tiết thửa đất. Thử lại.</p>
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
  if (!detail) {
    return (
      <div role="alert">
        <p>Không có dữ liệu thửa đất để hiển thị.</p>
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

  const { parcel, rights, encumbrances } = detail;
  const readOnly = parcel.status === 'proposed' || parcel.status === 'retired';

  return (
    <div className="space-y-4">
      {banner === 'error' || banner === 'offline' ? (
        <div
          role="alert"
          className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4"
        >
          <p className="text-sm text-amber-200">
            Không làm mới được dữ liệu; đang hiển thị nội dung đã tải. Thử lại.
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
      {loading ? <p role="status">Đang làm mới chi tiết thửa đất…</p> : null}
      <section
        aria-labelledby="land-parcel-heading"
        className="rounded-xl border border-slate-800 bg-slate-950 p-4"
      >
        <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
          Thửa đất nội bộ
        </p>
        <h2
          id="land-parcel-heading"
          className="mt-2 font-mono text-2xl font-semibold text-slate-100"
        >
          {parcel.parcelCode}
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Tờ / Thửa</dt>
            <dd className="font-mono text-slate-200">
              {parcel.mapSheetNumber} / {parcel.parcelNumber}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Trạng thái</dt>
            <dd>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
                <span aria-hidden="true">●</span>
                {parcelStatusText(parcel.status)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Đơn vị</dt>
            <dd className="font-mono text-slate-200">
              {parcel.organizationId}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Phiên bản</dt>
            <dd className="font-mono text-slate-200">v{parcel.version}</dd>
          </div>
        </dl>
        {readOnly ? (
          <p role="status" className="mt-3 text-sm text-slate-400">
            Thửa đất ở trạng thái chỉ đọc; màn hình này không cung cấp thao tác
            thay đổi hay xóa.
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="land-parcel-overview-heading"
        className="rounded-xl border border-slate-800 bg-slate-950 p-4"
      >
        <h3
          id="land-parcel-overview-heading"
          className="text-xl font-semibold text-slate-100"
        >
          Tổng quan
        </h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Diện tích (m²)</dt>
            <dd className="font-mono text-slate-200">{parcel.areaSqm}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Loại đất</dt>
            <dd className="text-slate-200">{parcel.landUseType}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Mã xã</dt>
            <dd className="font-mono text-slate-200">{parcel.communeCode}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Địa chỉ (nội bộ)</dt>
            <dd className="text-slate-200">{parcel.address}</dd>
          </div>
        </dl>
        <p className="mt-3 font-mono text-xs leading-5 text-slate-400">
          {geometryPreviewText(parcel.geometry)}
        </p>
      </section>

      <section
        aria-labelledby="land-rights-heading"
        className="rounded-xl border border-slate-800 bg-slate-950 p-4"
      >
        <h3
          id="land-rights-heading"
          className="text-xl font-semibold text-slate-100"
        >
          Quyền sử dụng đất
        </h3>
        {rights.length ? (
          <table className="mt-3 w-full border-collapse text-sm">
            <caption className="py-2 text-left text-slate-400">
              Bảng quyền sử dụng đất; danh tính chủ thể hiển thị dạng che
              (masked)
            </caption>
            <thead>
              <tr className="text-left text-slate-300">
                <th scope="col" className="border-b border-slate-700 px-3 py-2">
                  Chủ thể (masked)
                </th>
                <th scope="col" className="border-b border-slate-700 px-3 py-2">
                  Tỷ lệ (%)
                </th>
                <th scope="col" className="border-b border-slate-700 px-3 py-2">
                  Hiệu lực
                </th>
                <th scope="col" className="border-b border-slate-700 px-3 py-2">
                  Hiệu lực từ — đến
                </th>
                <th scope="col" className="border-b border-slate-700 px-3 py-2">
                  Hồ sơ nguồn
                </th>
              </tr>
            </thead>
            <tbody>
              {rights.map((right) => {
                const party = parties.get(right.partyId);
                return (
                  <tr key={right.id} className="border-b border-slate-800">
                    <td className="px-3 py-2 font-mono text-slate-200">
                      {maskedPartyLabel(
                        party
                          ? {
                              referenceCode: party.referenceCode,
                              identityNumberMasked: party.identityNumberMasked,
                              displayName: party.displayName,
                            }
                          : null,
                        right.partyId,
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300">
                      {right.sharePercent}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
                        <span aria-hidden="true">●</span>
                        {rightStatusText(right.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300">
                      {formatDateTime(right.validFrom)} —{' '}
                      {formatDateTime(right.validTo)}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300">
                      {right.sourceApplicationId ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p role="status" className="mt-2 text-sm text-slate-400">
            Chưa có quyền sử dụng đất nào cho thửa này.
          </p>
        )}
      </section>

      <section
        aria-labelledby="land-encumbrances-heading"
        className="rounded-xl border border-slate-800 bg-slate-950 p-4"
      >
        <h3
          id="land-encumbrances-heading"
          className="text-xl font-semibold text-slate-100"
        >
          Ràng buộc thế chấp
        </h3>
        {encumbrances.length ? (
          <table className="mt-3 w-full border-collapse text-sm">
            <caption className="py-2 text-left text-slate-400">
              Bảng ràng buộc thế chấp; bên được bảo đảm hiển thị dạng che
              (masked)
            </caption>
            <thead>
              <tr className="text-left text-slate-300">
                <th scope="col" className="border-b border-slate-700 px-3 py-2">
                  Loại
                </th>
                <th scope="col" className="border-b border-slate-700 px-3 py-2">
                  Bên được bảo đảm (masked)
                </th>
                <th scope="col" className="border-b border-slate-700 px-3 py-2">
                  Hiệu lực
                </th>
                <th scope="col" className="border-b border-slate-700 px-3 py-2">
                  Đăng ký — Giải tỏa
                </th>
              </tr>
            </thead>
            <tbody>
              {encumbrances.map((item) => {
                const secured = item.securedPartyId
                  ? parties.get(item.securedPartyId)
                  : null;
                return (
                  <tr key={item.id} className="border-b border-slate-800">
                    <td className="px-3 py-2 font-mono text-slate-200">
                      {item.encumbranceType}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300">
                      {item.securedPartyId
                        ? maskedPartyLabel(
                            secured
                              ? {
                                  referenceCode: secured.referenceCode,
                                  identityNumberMasked:
                                    secured.identityNumberMasked,
                                  displayName: secured.displayName,
                                }
                              : null,
                            item.securedPartyId,
                          )
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
                        <span aria-hidden="true">●</span>
                        {encumbranceStatusText(item.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300">
                      {formatDateTime(item.registeredAt)} —{' '}
                      {formatDateTime(item.releasedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p role="status" className="mt-2 text-sm text-slate-400">
            Chưa có ràng buộc thế chấp nào cho thửa này.
          </p>
        )}
      </section>

      <EvidencePanel resourceType="parcel" resourceId={parcelId} canList />
    </div>
  );
}
