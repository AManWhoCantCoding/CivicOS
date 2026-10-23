'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { EvidencePanel } from '@/components/land/EvidencePanel';
import { fetchParcelDetail, fetchPartyList } from '@/components/land/land-api';
import {
  ParcelFeedback,
  ParcelSection,
  ParcelStatusBadge,
  ParcelTableViewport,
} from '@/components/land/ParcelPilotUI';
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
      <ParcelFeedback role="alert" tone="danger">
        Thửa đất này không thuộc nhiệm vụ hoặc phạm vi đơn vị của tài khoản hiện
        tại.
      </ParcelFeedback>
    );
  }
  if (banner === 'not-found') {
    return (
      <ParcelFeedback role="alert" tone="danger" className="space-y-3">
        <p>Không tìm thấy thửa đất yêu cầu.</p>
        <Link
          href="/land/parcels"
          className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-4 py-2 text-sm font-medium text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
        >
          Về danh sách thửa đất
        </Link>
      </ParcelFeedback>
    );
  }
  if (banner === 'offline' && !detail) {
    return (
      <div>
        <ParcelFeedback role="status" tone="info">
          Đang ngoại tuyến. Cần kết nối để tải chi tiết thửa đất; dữ liệu đã tải
          trước đó được giữ nguyên.
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
  if ((banner === 'error' || banner === 'offline') && !detail) {
    return (
      <ParcelFeedback role="alert" tone="danger" className="space-y-3">
        <p>Không tải được chi tiết thửa đất. Thử lại.</p>
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
  if (!detail) {
    return (
      <ParcelFeedback role="alert" tone="danger" className="space-y-3">
        <p>Không có dữ liệu thửa đất để hiển thị.</p>
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

  const { parcel, rights, encumbrances } = detail;
  const readOnly = parcel.status === 'proposed' || parcel.status === 'retired';

  return (
    <div className="space-y-5">
      {banner === 'error' || banner === 'offline' ? (
        <ParcelFeedback role="alert" tone="warning" className="space-y-3">
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
        </ParcelFeedback>
      ) : null}
      {loading ? (
        <ParcelFeedback role="status" tone="neutral">
          Đang làm mới chi tiết thửa đất…
        </ParcelFeedback>
      ) : null}
      <ParcelSection labelledBy="land-parcel-heading">
        <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
          Thửa đất nội bộ
        </p>
        <h2
          id="land-parcel-heading"
          className="mt-2 font-mono text-2xl font-semibold tracking-tight break-words text-[var(--civicos-text)] sm:text-3xl"
        >
          {parcel.parcelCode}
        </h2>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Tờ / Thửa</dt>
            <dd className="font-mono break-words text-[var(--civicos-text)]">
              {parcel.mapSheetNumber} / {parcel.parcelNumber}
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Trạng thái</dt>
            <dd>
              <ParcelStatusBadge>
                {parcelStatusText(parcel.status)}
              </ParcelStatusBadge>
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Đơn vị</dt>
            <dd className="font-mono break-words text-[var(--civicos-text)]">
              {parcel.organizationId}
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Phiên bản</dt>
            <dd className="font-mono break-words text-[var(--civicos-text)]">
              v{parcel.version}
            </dd>
          </div>
        </dl>
        <Link
          href={focusMapUrl(parcel.id)}
          aria-label="Xem thửa đất trên bản đồ"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-accent)] bg-[var(--civicos-accent)] px-4 py-2 text-sm font-medium text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)]"
        >
          Xem trên bản đồ
        </Link>
        {readOnly ? (
          <ParcelFeedback role="status" tone="neutral" className="mt-4 p-3">
            Thửa đất ở trạng thái chỉ đọc; màn hình này không cung cấp thao tác
            thay đổi hay xóa.
          </ParcelFeedback>
        ) : null}
      </ParcelSection>

      <ParcelSection labelledBy="land-parcel-overview-heading">
        <h3
          id="land-parcel-overview-heading"
          className="text-xl font-semibold text-[var(--civicos-text)]"
        >
          Tổng quan
        </h3>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Diện tích (m²)</dt>
            <dd className="font-mono break-words text-[var(--civicos-text)]">
              {parcel.areaSqm}
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Loại đất</dt>
            <dd className="text-[var(--civicos-text)]">{parcel.landUseType}</dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Mã xã</dt>
            <dd className="font-mono break-words text-[var(--civicos-text)]">
              {parcel.communeCode}
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">
              Địa chỉ (nội bộ)
            </dt>
            <dd className="break-words text-[var(--civicos-text)]">
              {parcel.address}
            </dd>
          </div>
        </dl>
        <p className="mt-4 border-t border-[var(--civicos-border)] pt-3 font-mono text-xs leading-5 text-[var(--civicos-text-muted)]">
          {geometryPreviewText(parcel.geometry)}
        </p>
      </ParcelSection>

      <ParcelSection labelledBy="land-rights-heading">
        <h3
          id="land-rights-heading"
          className="text-xl font-semibold text-[var(--civicos-text)]"
        >
          Quyền sử dụng đất
        </h3>
        {rights.length ? (
          <ParcelTableViewport label="Bảng quyền sử dụng đất" className="mt-4">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <caption className="px-4 py-3 text-left text-xs text-[var(--civicos-text-muted)]">
                Bảng quyền sử dụng đất; danh tính chủ thể hiển thị dạng che
                (masked)
              </caption>
              <thead className="bg-[var(--civicos-surface-muted)]">
                <tr className="text-left text-xs font-semibold tracking-wide text-[var(--civicos-text-muted)]">
                  <th
                    scope="col"
                    className="border-b border-[var(--civicos-border)] px-4 py-3"
                  >
                    Chủ thể (masked)
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--civicos-border)] px-4 py-3"
                  >
                    Tỷ lệ (%)
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--civicos-border)] px-4 py-3"
                  >
                    Hiệu lực
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--civicos-border)] px-4 py-3"
                  >
                    Hiệu lực từ — đến
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--civicos-border)] px-4 py-3"
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
                      className="border-b border-[var(--civicos-border)] transition-colors hover:bg-[var(--civicos-surface-muted)]"
                    >
                      <td className="px-4 py-3 font-mono text-[var(--civicos-text)]">
                        {maskedPartyLabel(
                          party
                            ? {
                                referenceCode: party.referenceCode,
                                identityNumberMasked:
                                  party.identityNumberMasked,
                                displayName: party.displayName,
                              }
                            : null,
                          right.partyId,
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--civicos-text)]">
                        {right.sharePercent}
                      </td>
                      <td className="px-4 py-3">
                        <ParcelStatusBadge>
                          {rightStatusText(right.status)}
                        </ParcelStatusBadge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--civicos-text)]">
                        {formatDateTime(right.validFrom)} —{' '}
                        {formatDateTime(right.validTo)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--civicos-text)]">
                        {right.sourceApplicationId ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ParcelTableViewport>
        ) : (
          <ParcelFeedback role="status" tone="neutral" className="mt-4">
            Chưa có quyền sử dụng đất nào cho thửa này.
          </ParcelFeedback>
        )}
      </ParcelSection>

      <ParcelSection labelledBy="land-encumbrances-heading">
        <h3
          id="land-encumbrances-heading"
          className="text-xl font-semibold text-[var(--civicos-text)]"
        >
          Ràng buộc thế chấp
        </h3>
        {encumbrances.length ? (
          <ParcelTableViewport label="Bảng ràng buộc thế chấp" className="mt-4">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <caption className="px-4 py-3 text-left text-xs text-[var(--civicos-text-muted)]">
                Bảng ràng buộc thế chấp; bên được bảo đảm hiển thị dạng che
                (masked)
              </caption>
              <thead className="bg-[var(--civicos-surface-muted)]">
                <tr className="text-left text-xs font-semibold tracking-wide text-[var(--civicos-text-muted)]">
                  <th
                    scope="col"
                    className="border-b border-[var(--civicos-border)] px-4 py-3"
                  >
                    Loại
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--civicos-border)] px-4 py-3"
                  >
                    Bên được bảo đảm (masked)
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--civicos-border)] px-4 py-3"
                  >
                    Hiệu lực
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--civicos-border)] px-4 py-3"
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
                      className="border-b border-[var(--civicos-border)] transition-colors hover:bg-[var(--civicos-surface-muted)]"
                    >
                      <td className="px-4 py-3 font-mono text-[var(--civicos-text)]">
                        {item.encumbranceType}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--civicos-text)]">
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
                      <td className="px-4 py-3">
                        <ParcelStatusBadge>
                          {encumbranceStatusText(item.status)}
                        </ParcelStatusBadge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--civicos-text)]">
                        {formatDateTime(item.registeredAt)} —{' '}
                        {formatDateTime(item.releasedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ParcelTableViewport>
        ) : (
          <ParcelFeedback role="status" tone="neutral" className="mt-4">
            Chưa có ràng buộc thế chấp nào cho thửa này.
          </ParcelFeedback>
        )}
      </ParcelSection>

      <EvidencePanel resourceType="parcel" resourceId={parcelId} canList />
    </div>
  );
}
