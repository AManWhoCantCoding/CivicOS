'use client';

import { useCallback, useEffect, useState } from 'react';

import { EvidencePanel } from '@/components/land/EvidencePanel';
import {
  fetchApplicationDetail,
  fetchApplicationTimeline,
  postApplicationApprove,
  postApplicationReject,
  postApplicationSync,
  postApplicationSyncRetry,
} from '@/components/land/land-api';
import {
  applicationChangeTypeText,
  applicationStatusText,
  isRejectReasonValid,
  isTerminalApplicationStatus,
  mapProcessingErrorToMessage,
  resolveProcessingActions,
  type ApplicationDetailView,
  type TimelineEventView,
} from '@/components/land/application-view';
import { mapLandApiStatus } from '@/components/land/workspace-view';

type DetailBanner = 'denied' | 'error' | 'not-found' | 'offline' | null;
type SessionView = {
  userId: string;
  roles: string[];
  organizationUnitId: string | null;
} | null;
type MutationKind = 'sync' | 'retry' | 'approve' | 'reject' | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readSessionUser(body: unknown): SessionView {
  if (!isRecord(body) || !isRecord(body.user)) return null;
  const user = body.user as {
    id: unknown;
    roles: unknown;
    organizationUnitId: unknown;
  };
  if (typeof user.id !== 'string' || !Array.isArray(user.roles)) return null;
  if (!user.roles.every((role) => typeof role === 'string')) return null;
  return {
    userId: user.id,
    roles: user.roles as string[],
    organizationUnitId:
      typeof user.organizationUnitId === 'string'
        ? user.organizationUnitId
        : null,
  };
}

function readAssignmentFlag(body: unknown, userId: string): boolean {
  if (!isRecord(body) || !Array.isArray(body.assignments)) return false;
  return body.assignments.some((entry) => {
    if (!isRecord(entry)) return false;
    return (
      entry['status'] === 'active' &&
      entry['task'] === 'land_review' &&
      entry['assigneeUserId'] === userId
    );
  });
}

function sortTimelineAscending(
  events: readonly TimelineEventView[],
): TimelineEventView[] {
  return [...events].sort((a, b) => {
    if (a.occurredAt < b.occurredAt) return -1;
    if (a.occurredAt > b.occurredAt) return 1;
    return a.aggregateVersion - b.aggregateVersion;
  });
}

// LND-13 screen-03 application detail: header/status/timeline/detail
// projection với role/state-gated sync/retry/approve/reject.
// Nguồn: .scratch/land-module/ui/screen-03.md, design-tokens.md
// (textual handoff). Hiển thị phản ánh API/policy; API là boundary thực thi:
// officer + Assignment land_review thấy Đồng bộ/Thử lại theo state,
// leader cùng đơn vị thấy Duyệt/Từ chối ở pending_approval,
// terminal/offline/stale/forbidden khóa controls kèm message/retry đúng.
export function ApplicationDetail({
  applicationId,
}: {
  applicationId: string;
}) {
  const [detail, setDetail] = useState<ApplicationDetailView | null>(null);
  const [events, setEvents] = useState<TimelineEventView[]>([]);
  const [session, setSession] = useState<SessionView>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [hasAssignment, setHasAssignment] = useState(false);
  const [banner, setBanner] = useState<DetailBanner>(null);
  const [deniedCode, setDeniedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [mutation, setMutation] = useState<MutationKind>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [syncFailureCode, setSyncFailureCode] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectInvalid, setRejectInvalid] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    function syncOnline() {
      setOnline(window.navigator.onLine);
    }
    syncOnline();
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    const [detailResult, timelineResult, sessionResult, assignmentResult] =
      await Promise.all([
        fetchApplicationDetail(applicationId),
        fetchApplicationTimeline(applicationId),
        fetch('/api/auth/session', { cache: 'no-store' })
          .then(async (response) => ({
            status: response.status,
            body: (await response.json().catch(() => null)) as unknown,
          }))
          .catch(() => ({ status: 0, body: null })),
        fetch(
          `/api/identity/assignments?resourceType=LandChangeApplication&resourceId=${encodeURIComponent(applicationId)}&includeRevoked=true`,
          { cache: 'no-store' },
        )
          .then(async (response) => ({
            status: response.status,
            body: (await response.json().catch(() => null)) as unknown,
          }))
          .catch(() => ({ status: 0, body: null })),
      ]);
    const mapped = mapLandApiStatus(
      detailResult.status === 0 ? null : detailResult.status,
      window.navigator.onLine,
    );
    setBanner(mapped);
    if (!mapped && detailResult.detail) {
      setDetail(detailResult.detail);
      setDeniedCode(null);
    } else {
      setDeniedCode(detailResult.error?.code ?? null);
    }
    if (timelineResult.events.length) {
      setEvents(sortTimelineAscending(timelineResult.events));
    }
    const nextSession = readSessionUser(sessionResult.body);
    setSession(nextSession);
    setSessionLoaded(true);
    setHasAssignment(
      nextSession
        ? readAssignmentFlag(assignmentResult.body, nextSession.userId)
        : false,
    );
    setLoading(false);
  }, [applicationId]);

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
        aria-label="Đang tải chi tiết hồ sơ"
      >
        <div className="h-24 rounded-xl bg-slate-900 motion-safe:animate-pulse" />
        <p className="text-sm text-slate-400">Đang tải chi tiết hồ sơ…</p>
      </div>
    );
  }
  if (banner === 'denied') {
    return (
      <div role="alert" className="space-y-3">
        <p>
          {deniedCode === 'LAND_ASSIGNMENT_REQUIRED'
            ? 'Bạn chưa được phân công xử lý hồ sơ này. Cần Assignment land_review còn hiệu lực trong phạm vi đơn vị.'
            : 'Hồ sơ này không thuộc nhiệm vụ hoặc phạm vi đơn vị của tài khoản hiện tại.'}
        </p>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="min-h-[44px] rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Thử lại
        </button>
      </div>
    );
  }
  if (banner === 'not-found') {
    return (
      <div role="alert" className="space-y-3">
        <p>Không tìm thấy hồ sơ biến động yêu cầu.</p>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="min-h-[44px] rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Thử lại
        </button>
      </div>
    );
  }
  if (banner === 'offline' && !detail) {
    return (
      <div>
        <p role="status">
          Đang ngoại tuyến. Cần kết nối để tải chi tiết hồ sơ; dữ liệu đã tải
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
        <p>Không tải được chi tiết hồ sơ. Thử lại.</p>
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
        <p>Không có dữ liệu hồ sơ để hiển thị.</p>
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

  // Chốt version sau null-guard để closures mutation giữ đúng If-Match-Version.
  const detailVersion: number = detail.version;
  const sameOrganizationUnit =
    session?.organizationUnitId !== null &&
    session?.organizationUnitId !== undefined &&
    session.organizationUnitId === detail.organizationId;
  const visibility = resolveProcessingActions({
    roles: sessionLoaded && session ? session.roles : [],
    hasAssignment,
    sameOrganizationUnit,
    status: detail.status,
  });
  const readOnly = isTerminalApplicationStatus(detail.status);
  const offlineLock = !online;
  const mutationBusy = mutation !== null;
  const controlsLocked = offlineLock || conflict || mutationBusy;

  function handleConflict() {
    setConflict(true);
    setActionError(
      'Phiên bản hồ sơ đã thay đổi, vui lòng tải lại rồi thử lại.',
    );
  }

  // Sau mutation thành công, tải lại detail + timeline để EventRecord/
  // approval/rejection/completed mới hiển thị ngay mà không cần reload tay.
  // Chỉ dùng GET, không gọi lại mutation nên không duplicate POST.
  async function refreshDetailTimeline() {
    const [detailResult, timelineResult] = await Promise.all([
      fetchApplicationDetail(applicationId),
      fetchApplicationTimeline(applicationId),
    ]);
    const mapped = mapLandApiStatus(
      detailResult.status === 0 ? null : detailResult.status,
      window.navigator.onLine,
    );
    setBanner(mapped);
    if (!mapped && detailResult.detail) {
      setDetail(detailResult.detail);
      setDeniedCode(null);
    } else if (detailResult.error) {
      setDeniedCode(detailResult.error.code);
    }
    if (timelineResult.events.length) {
      setEvents(sortTimelineAscending(timelineResult.events));
    }
    setConflict(false);
  }

  async function runSync() {
    if (!online) {
      setActionError(mapProcessingErrorToMessage(null, 0));
      return;
    }
    setMutation('sync');
    setActionError(null);
    setSyncFailureCode(null);
    const result = await postApplicationSync(applicationId, detailVersion);
    if (result.error) {
      if (result.error.code === 'LAND_VERSION_CONFLICT') handleConflict();
      else {
        setActionError(
          mapProcessingErrorToMessage(result.error.code, result.status),
        );
        if (result.error.code === 'LAND_SYNC_FAILED') {
          setSyncFailureCode(result.sync?.failureCode ?? null);
          if (result.application) await refreshDetailTimeline();
          else setReloadToken((value) => value + 1);
        }
      }
    } else if (result.application) {
      await refreshDetailTimeline();
      setActionError(null);
    }
    setMutation(null);
  }

  async function runRetry() {
    if (!online) {
      setActionError(mapProcessingErrorToMessage(null, 0));
      return;
    }
    setMutation('retry');
    setActionError(null);
    setSyncFailureCode(null);
    const result = await postApplicationSyncRetry(applicationId, detailVersion);
    if (result.error) {
      if (result.error.code === 'LAND_VERSION_CONFLICT') handleConflict();
      else {
        setActionError(
          mapProcessingErrorToMessage(result.error.code, result.status),
        );
        if (result.error.code === 'LAND_SYNC_FAILED') {
          setSyncFailureCode(result.sync?.failureCode ?? null);
          if (result.application) await refreshDetailTimeline();
          else setReloadToken((value) => value + 1);
        }
      }
    } else if (result.application) {
      await refreshDetailTimeline();
      setActionError(null);
    }
    setMutation(null);
  }

  async function runApprove() {
    if (!online) {
      setActionError(mapProcessingErrorToMessage(null, 0));
      return;
    }
    setMutation('approve');
    setActionError(null);
    const result = await postApplicationApprove(
      applicationId,
      detailVersion,
      null,
    );
    if (result.error) {
      if (result.error.code === 'LAND_VERSION_CONFLICT') handleConflict();
      else
        setActionError(
          mapProcessingErrorToMessage(result.error.code, result.status),
        );
    } else if (result.application) {
      await refreshDetailTimeline();
    }
    setMutation(null);
  }

  async function runReject() {
    if (!isRejectReasonValid(rejectReason)) {
      setRejectInvalid(true);
      return;
    }
    if (!online) {
      setActionError(mapProcessingErrorToMessage(null, 0));
      return;
    }
    setMutation('reject');
    setActionError(null);
    const result = await postApplicationReject(
      applicationId,
      detailVersion,
      rejectReason.trim(),
    );
    if (result.error) {
      if (result.error.code === 'LAND_VERSION_CONFLICT') {
        setRejectOpen(false);
        handleConflict();
      } else
        setActionError(
          mapProcessingErrorToMessage(result.error.code, result.status),
        );
    } else if (result.application) {
      await refreshDetailTimeline();
      setDetail((current) =>
        current
          ? { ...current, rejectionReason: rejectReason.trim() }
          : current,
      );
      setRejectOpen(false);
      setRejectReason('');
      setRejectInvalid(false);
    }
    setMutation(null);
  }

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
      {conflict ? (
        <div
          role="alert"
          className="space-y-2 rounded-xl border border-rose-400/30 bg-rose-400/[0.06] p-4"
        >
          <p className="text-sm text-rose-200">
            Phiên bản hồ sơ đã thay đổi, vui lòng tải lại rồi thử lại.
          </p>
          <button
            type="button"
            onClick={() => {
              setConflict(false);
              setReloadToken((value) => value + 1);
            }}
            className="min-h-[44px] rounded-lg border border-rose-300/40 px-3 py-2 text-sm text-rose-100 hover:border-rose-200"
          >
            Tải lại chi tiết
          </button>
        </div>
      ) : null}
      {!online ? (
        <p role="status" className="text-sm text-amber-200">
          Đang ngoại tuyến. Các thao tác xử lý tạm khóa; dữ liệu đã tải được giữ
          nguyên.
        </p>
      ) : null}
      {loading ? <p role="status">Đang làm mới chi tiết hồ sơ…</p> : null}

      <section
        aria-labelledby="land-application-heading"
        className="rounded-xl border border-slate-800 bg-slate-950 p-4"
      >
        <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
          Hồ sơ biến động nội bộ · Mô phỏng
        </p>
        <h2
          id="land-application-heading"
          className="mt-2 font-mono text-2xl font-semibold text-slate-100"
        >
          {detail.applicationCode}
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Loại biến động</dt>
            <dd className="text-slate-200">
              {applicationChangeTypeText(detail.changeType)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Trạng thái</dt>
            <dd>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
                <span aria-hidden="true">●</span>
                {applicationStatusText(detail.status)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Đơn vị</dt>
            <dd className="font-mono text-slate-200">
              {detail.organizationId}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Phiên bản</dt>
            <dd className="font-mono text-slate-200">v{detailVersion}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Người tạo</dt>
            <dd className="font-mono text-slate-200">{detail.createdById}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Ngày nộp</dt>
            <dd className="font-mono text-slate-200">{detail.submittedAt}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Ngày cập nhật</dt>
            <dd className="font-mono text-slate-200">{detail.updatedAt}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Ngày hoàn thành</dt>
            <dd className="font-mono text-slate-200">
              {detail.completedAt ?? '—'}
            </dd>
          </div>
        </dl>
        {detail.rejectionReason ? (
          <p className="mt-3 text-sm text-slate-300">
            Lý do từ chối:{' '}
            <span className="text-slate-100">{detail.rejectionReason}</span>
          </p>
        ) : null}
        {readOnly ? (
          <p role="status" className="mt-3 text-sm text-slate-400">
            Hồ sơ ở trạng thái chỉ đọc; màn hình này không cung cấp thao tác
            thay đổi hay xóa.
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="land-application-links-heading"
        className="rounded-xl border border-slate-800 bg-slate-950 p-4"
      >
        <h3
          id="land-application-links-heading"
          className="text-xl font-semibold text-slate-100"
        >
          Liên kết hồ sơ
        </h3>
        {detail.parties.length ? (
          <ul className="mt-3 space-y-1 text-sm">
            {detail.parties.map((link) => (
              <li
                key={`${link.partyId}-${link.partyRole}`}
                className="font-mono text-slate-300"
              >
                Chủ thể {link.partyId} · vai trò {link.partyRole}
                {link.sharePercent ? ` · ${link.sharePercent}%` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p role="status" className="mt-2 text-sm text-slate-400">
            Chưa có liên kết chủ thể nào.
          </p>
        )}
        {detail.parcels.length ? (
          <ul className="mt-3 space-y-1 text-sm">
            {detail.parcels.map((link) => (
              <li
                key={`${link.parcelId}-${link.parcelRole}`}
                className="font-mono text-slate-300"
              >
                Thửa {link.parcelId} · vai trò {link.parcelRole}
              </li>
            ))}
          </ul>
        ) : (
          <p role="status" className="mt-2 text-sm text-slate-400">
            Chưa có liên kết thửa đất nào.
          </p>
        )}
        <h4 className="mt-4 text-base font-semibold text-slate-100">
          Dữ liệu biến động (trích an toàn)
        </h4>
        <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-xs leading-5 text-slate-300">
          {JSON.stringify(detail.changePayload, null, 2)}
        </pre>
      </section>

      <section
        aria-labelledby="land-application-timeline-heading"
        className="rounded-xl border border-slate-800 bg-slate-950 p-4"
      >
        <h3
          id="land-application-timeline-heading"
          className="text-xl font-semibold text-slate-100"
        >
          Dòng thời gian (UTC)
        </h3>
        {events.length ? (
          <ol className="mt-3 space-y-2 text-sm">
            {events.map((event) => (
              <li
                key={event.eventId}
                className="rounded-lg border border-slate-800 p-3"
              >
                <p className="font-mono text-slate-200">
                  {event.eventType} · v{event.aggregateVersion}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  {event.occurredAt}
                </p>
                {event.actor ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {event.actor.name} ·{' '}
                    {event.actor.role ?? 'không rõ vai trò'}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p role="status" className="mt-2 text-sm text-slate-400">
            Chưa có sự kiện nào trong dòng thời gian.
          </p>
        )}
      </section>

      <EvidencePanel />

      <section
        aria-labelledby="land-application-actions-heading"
        className="rounded-xl border border-slate-800 bg-slate-950 p-4"
      >
        <h3
          id="land-application-actions-heading"
          className="text-xl font-semibold text-slate-100"
        >
          Xử lý hồ sơ
        </h3>
        {visibility.needsAssignment ? (
          <p role="status" className="mt-2 text-sm text-amber-200">
            Bạn chưa được phân công xử lý hồ sơ này. Cần Assignment land_review
            còn hiệu lực trong phạm vi đơn vị để thực hiện đồng bộ.
          </p>
        ) : null}
        {syncFailureCode ? (
          <p role="alert" className="mt-2 text-sm text-rose-200">
            Đồng bộ mô phỏng thất bại. Mã lỗi: {syncFailureCode}
          </p>
        ) : null}
        {actionError ? (
          <p role="alert" className="mt-2 text-sm text-rose-200">
            {actionError}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-3">
          {visibility.showSync ? (
            <button
              type="button"
              onClick={() => void runSync()}
              disabled={controlsLocked}
              className="min-h-[44px] rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation === 'sync' ? 'Đang đồng bộ…' : 'Đồng bộ mô phỏng'}
            </button>
          ) : null}
          {visibility.showRetry ? (
            <button
              type="button"
              onClick={() => void runRetry()}
              disabled={controlsLocked}
              className="min-h-[44px] rounded-lg border border-amber-300/40 px-4 py-2 text-sm font-semibold text-amber-100 hover:border-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation === 'retry' ? 'Đang thử lại…' : 'Thử lại'}
            </button>
          ) : null}
          {visibility.showApprove ? (
            <button
              type="button"
              onClick={() => void runApprove()}
              disabled={controlsLocked}
              className="min-h-[44px] rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation === 'approve' ? 'Đang duyệt…' : 'Duyệt'}
            </button>
          ) : null}
          {visibility.showReject && !rejectOpen ? (
            <button
              type="button"
              onClick={() => {
                setRejectOpen(true);
                setRejectInvalid(false);
              }}
              disabled={controlsLocked}
              className="min-h-[44px] rounded-lg border border-rose-300/40 px-4 py-2 text-sm font-semibold text-rose-100 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Từ chối
            </button>
          ) : null}
        </div>
        {rejectOpen && visibility.showReject ? (
          <div
            role="dialog"
            aria-label="Từ chối hồ sơ"
            className="mt-4 space-y-3 rounded-lg border border-slate-700 p-4"
          >
            <label
              htmlFor="land-reject-reason"
              className="block text-sm text-slate-300"
            >
              Lý do từ chối (bắt buộc)
            </label>
            <textarea
              id="land-reject-reason"
              aria-label="Lý do từ chối"
              value={rejectReason}
              onChange={(event) => {
                setRejectReason(event.target.value);
                if (isRejectReasonValid(event.target.value))
                  setRejectInvalid(false);
              }}
              rows={3}
              className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            />
            {rejectInvalid ? (
              <p role="alert" className="text-sm text-rose-200">
                Cần nhập lý do từ chối trước khi xác nhận.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void runReject()}
                disabled={controlsLocked}
                className="min-h-[44px] rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutation === 'reject' ? 'Đang từ chối…' : 'Xác nhận từ chối'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectInvalid(false);
                }}
                className="min-h-[44px] rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
