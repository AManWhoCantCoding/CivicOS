'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { EvidencePanel } from '@/components/land/EvidencePanel';
import { fetchParcelDetail, fetchPartyList } from '@/components/land/land-api';
import { focusMapUrl } from '@/components/map/land-parcel-focus';
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
        <div className="h-24 rounded-xl bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse" />
        <p className="text-sm text-[var(--civicos-text-muted)]">
          Đang tải chi tiết thửa đất…
        </p>
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
          className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
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
          className="mt-3 min-h-[44px] rounded-lg border border-[var(--civicos-info)] px-3 py-2 text-sm text-[var(--civicos-info)] hover:border-[var(--civicos-info)]"
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
          className="mt-3 min-h-[44px] rounded-lg border border-[var(--civicos-danger)] px-3 py-2 text-sm text-[var(--civicos-danger)] hover:border-[var(--civicos-danger)]"
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
          className="mt-3 min-h-[44px] rounded-lg border border-[var(--civicos-danger)] px-3 py-2 text-sm text-[var(--civicos-danger)] hover:border-[var(--civicos-danger)]"
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
          className="space-y-2 rounded-xl border border-[var(--civicos-warning)] bg-[var(--civicos-surface)] p-4"
        >
          <p className="text-sm text-[var(--civicos-warning)]">
            Không làm mới được dữ liệu; đang hiển thị nội dung đã tải. Thử lại.
          </p>
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            className="min-h-[44px] rounded-lg border border-[var(--civicos-warning)] px-3 py-2 text-sm text-[var(--civicos-warning)] hover:border-[var(--civicos-warning)]"
          >
            Thử lại
          </button>
        </div>
      ) : null}
      {loading ? <p role="status">Đang làm mới chi tiết thửa đất…</p> : null}
      <section
        aria-labelledby="land-parcel-heading"
        className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4"
      >
        <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
          Thửa đất nội bộ
        </p>
        <h2
          id="land-parcel-heading"
          className="mt-2 font-mono text-2xl font-semibold text-[var(--civicos-text)]"
        >
          {parcel.parcelCode}
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Tờ / Thửa</dt>
            <dd className="font-mono text-[var(--civicos-text)]">
              {parcel.mapSheetNumber} / {parcel.parcelNumber}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Trạng thái</dt>
            <dd>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--civicos-border)] px-3 py-1 text-xs text-[var(--civicos-text)]">
                <span aria-hidden="true">●</span>
                {parcelStatusText(parcel.status)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Đơn vị</dt>
            <dd className="font-mono text-[var(--civicos-text)]">
              {parcel.organizationId}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Phiên bản</dt>
            <dd className="font-mono text-[var(--civicos-text)]">
              v{parcel.version}
            </dd>
          </div>
        </dl>
        <Link
          href={focusMapUrl(parcel.id)}
          aria-label="Xem thửa đất trên bản đồ"
          className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
        >
          Xem trên bản đồ
        </Link>
        {readOnly ? (
          <p
            role="status"
            className="mt-3 text-sm text-[var(--civicos-text-muted)]"
          >
            Thửa đất ở trạng thái chỉ đọc; màn hình này không cung cấp thao tác
            thay đổi hay xóa.
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="land-parcel-overview-heading"
        className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4"
      >
        <h3
          id="land-parcel-overview-heading"
          className="text-xl font-semibold text-[var(--civicos-text)]"
        >
          Tổng quan
        </h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Diện tích (m²)</dt>
            <dd className="font-mono text-[var(--civicos-text)]">
              {parcel.areaSqm}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Loại đất</dt>
            <dd className="text-[var(--civicos-text)]">{parcel.landUseType}</dd>
          </div>
          <div>
            <dt className="text-[var(--civicos-text-muted)]">Mã xã</dt>
            <dd className="font-mono text-[var(--civicos-text)]">
              {parcel.communeCode}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--civicos-text-muted)]">
              Địa chỉ (nội bộ)
            </dt>
            <dd className="text-[var(--civicos-text)]">{parcel.address}</dd>
          </div>
        </dl>
        <p className="mt-3 font-mono text-xs leading-5 text-[var(--civicos-text-muted)]">
          {geometryPreviewText(parcel.geometry)}
        </p>
      </section>

      <section
        aria-labelledby="land-rights-heading"
        className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4"
      >
        <h3
          id="land-rights-heading"
          className="text-xl font-semibold text-[var(--civicos-text)]"
        >
          Quyền sử dụng đất
        </h3>
        {rights.length ? (
          <table className="mt-3 w-full border-collapse text-sm">
            <caption className="py-2 text-left text-[var(--civicos-text-muted)]">
              Bảng quyền sử dụng đất; danh tính chủ thể hiển thị dạng che
              (masked)
            </caption>
            <thead>
              <tr className="text-left text-[var(--civicos-text)]">
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-3 py-2"
                >
                  Chủ thể (masked)
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-3 py-2"
                >
                  Tỷ lệ (%)
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-3 py-2"
                >
                  Hiệu lực
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-3 py-2"
                >
                  Hiệu lực từ — đến
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-3 py-2"
                >
                  Hồ sơ nguồn
                </th>
              </tr>
            </thead>
            <tbody>
              {rights.map((right) => {
                const party = parties.get(right.partyId);
                return (
                  <tr
                    key={right.id}
                    className="border-b border-[var(--civicos-border)]"
                  >
                    <td className="px-3 py-2 font-mono text-[var(--civicos-text)]">
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
                    <td className="px-3 py-2 font-mono text-[var(--civicos-text)]">
                      {right.sharePercent}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--civicos-border)] px-3 py-1 text-xs text-[var(--civicos-text)]">
                        <span aria-hidden="true">●</span>
                        {rightStatusText(right.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[var(--civicos-text)]">
                      {formatDateTime(right.validFrom)} —{' '}
                      {formatDateTime(right.validTo)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[var(--civicos-text)]">
                      {right.sourceApplicationId ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p
            role="status"
            className="mt-2 text-sm text-[var(--civicos-text-muted)]"
          >
            Chưa có quyền sử dụng đất nào cho thửa này.
          </p>
        )}
      </section>

      <section
        aria-labelledby="land-encumbrances-heading"
        className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4"
      >
        <h3
          id="land-encumbrances-heading"
          className="text-xl font-semibold text-[var(--civicos-text)]"
        >
          Ràng buộc thế chấp
        </h3>
        {encumbrances.length ? (
          <table className="mt-3 w-full border-collapse text-sm">
            <caption className="py-2 text-left text-[var(--civicos-text-muted)]">
              Bảng ràng buộc thế chấp; bên được bảo đảm hiển thị dạng che
              (masked)
            </caption>
            <thead>
              <tr className="text-left text-[var(--civicos-text)]">
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-3 py-2"
                >
                  Loại
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-3 py-2"
                >
                  Bên được bảo đảm (masked)
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-3 py-2"
                >
                  Hiệu lực
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--civicos-border)] px-3 py-2"
                >
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
                  <tr
                    key={item.id}
                    className="border-b border-[var(--civicos-border)]"
                  >
                    <td className="px-3 py-2 font-mono text-[var(--civicos-text)]">
                      {item.encumbranceType}
                    </td>
                    <td className="px-3 py-2 font-mono text-[var(--civicos-text)]">
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
                      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--civicos-border)] px-3 py-1 text-xs text-[var(--civicos-text)]">
                        <span aria-hidden="true">●</span>
                        {encumbranceStatusText(item.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[var(--civicos-text)]">
                      {formatDateTime(item.registeredAt)} —{' '}
                      {formatDateTime(item.releasedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p
            role="status"
            className="mt-2 text-sm text-[var(--civicos-text-muted)]"
          >
            Chưa có ràng buộc thế chấp nào cho thửa này.
          </p>
        )}
      </section>

      <EvidencePanel resourceType="parcel" resourceId={parcelId} canList />
    </div>
  );
}
