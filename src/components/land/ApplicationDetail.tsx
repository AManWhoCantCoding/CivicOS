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
  canAccessScopedEvidence,
  isRejectReasonValid,
  isTerminalApplicationStatus,
  mapProcessingErrorToMessage,
  resolveProcessingActions,
  type ApplicationDetailView,
  type TimelineEventView,
} from '@/components/land/application-view';
import { mapLandApiStatus } from '@/components/land/workspace-view';
import {
  type ParcelStatusTone,
  ParcelFeedback,
  ParcelSimulatedBadge,
  ParcelStatusBadge,
} from '@/components/land/ParcelPilotUI';

type DetailBanner = 'denied' | 'error' | 'not-found' | 'offline' | null;
type SessionView = {
  userId: string;
  roles: string[];
  organizationUnitId: string | null;
} | null;
type MutationKind = 'sync' | 'retry' | 'approve' | 'reject' | null;

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
        <div className="h-24 rounded-xl bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse" />
        <p className="text-sm text-[var(--civicos-text-muted)]">
          Đang tải chi tiết hồ sơ…
        </p>
      </div>
    );
  }
  if (banner === 'denied') {
    return (
      <ParcelFeedback role="alert" tone="danger" className="space-y-3">
        <p>
          {deniedCode === 'LAND_ASSIGNMENT_REQUIRED'
            ? 'Bạn chưa được phân công xử lý hồ sơ này. Cần Assignment land_review còn hiệu lực trong phạm vi đơn vị.'
            : 'Hồ sơ này không thuộc nhiệm vụ hoặc phạm vi đơn vị của tài khoản hiện tại.'}
        </p>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="civicos-control min-h-[44px] border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2 text-sm font-medium text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] motion-safe:transition-colors"
        >
          <span aria-hidden="true" className="mr-2">
            ↻
          </span>
          Thử lại
        </button>
      </ParcelFeedback>
    );
  }
  if (banner === 'not-found') {
    return (
      <ParcelFeedback role="alert" tone="danger" className="space-y-3">
        <p>Không tìm thấy hồ sơ biến động yêu cầu.</p>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="civicos-control min-h-[44px] border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2 text-sm font-medium text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] motion-safe:transition-colors"
        >
          <span aria-hidden="true" className="mr-2">
            ↻
          </span>
          Thử lại
        </button>
      </ParcelFeedback>
    );
  }
  if (banner === 'offline' && !detail) {
    return (
      <div>
        <ParcelFeedback role="status" tone="info">
          Đang ngoại tuyến. Cần kết nối để tải chi tiết hồ sơ; dữ liệu đã tải
          trước đó được giữ nguyên.
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
  if ((banner === 'error' || banner === 'offline') && !detail) {
    return (
      <ParcelFeedback role="alert" tone="danger" className="space-y-3">
        <p>Không tải được chi tiết hồ sơ. Thử lại.</p>
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
  if (!detail) {
    return (
      <ParcelFeedback role="alert" tone="danger" className="space-y-3">
        <p>Không có dữ liệu hồ sơ để hiển thị.</p>
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
  const canAccessEvidence = canAccessScopedEvidence({
    roles: sessionLoaded && session ? session.roles : [],
    hasAssignment,
    sameOrganizationUnit,
  });

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
        <ParcelFeedback role="alert" tone="warning" className="space-y-2">
          <p className="text-sm">
            Không làm mới được dữ liệu; đang hiển thị nội dung đã tải. Thử
            lại.
          </p>
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            className="civicos-control min-h-[44px] border border-[var(--civicos-warning)] bg-[var(--civicos-surface)] px-3 py-2 text-sm font-medium text-[var(--civicos-warning)] hover:bg-[var(--civicos-surface-muted)]"
          >
            <span aria-hidden="true" className="mr-2">
              ↻
            </span>
            Thử lại
          </button>
        </ParcelFeedback>
      ) : null}
      {conflict ? (
        <ParcelFeedback role="alert" tone="danger" className="space-y-2">
          <p className="text-sm">
            Phiên bản hồ sơ đã thay đổi, vui lòng tải lại rồi thử lại.
          </p>
          <button
            type="button"
            onClick={() => {
              setConflict(false);
              setReloadToken((value) => value + 1);
            }}
            className="civicos-control min-h-[44px] border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] px-3 py-2 text-sm font-medium text-[var(--civicos-danger)] hover:bg-[var(--civicos-surface-muted)]"
          >
            Tải lại chi tiết
          </button>
        </ParcelFeedback>
      ) : null}
      {!online ? (
        <ParcelFeedback role="status" tone="info" className="px-4 py-3">
          Đang ngoại tuyến. Các thao tác xử lý tạm khóa; dữ liệu đã tải được giữ
          nguyên.
        </ParcelFeedback>
      ) : null}
      {loading ? (
        <ParcelFeedback role="status" tone="neutral" className="px-4 py-3">
          Đang làm mới chi tiết hồ sơ…
        </ParcelFeedback>
      ) : null}

      <section
        aria-labelledby="land-application-heading"
        className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
            Hồ sơ biến động nội bộ
          </p>
          <ParcelSimulatedBadge />
        </div>
        <h2
          id="land-application-heading"
          className="mt-2 font-mono text-2xl font-semibold tracking-tight break-words text-[var(--civicos-text)] sm:text-3xl"
        >
          {detail.applicationCode}
        </h2>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Loại biến động</dt>
            <dd className="text-[var(--civicos-text)]">
              {applicationChangeTypeText(detail.changeType)}
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Trạng thái</dt>
            <dd>
              <ParcelStatusBadge tone={applicationStatusTone(detail.status)}>
                {applicationStatusText(detail.status)}
              </ParcelStatusBadge>
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Đơn vị</dt>
            <dd className="font-mono break-words text-[var(--civicos-text)]">
              {detail.organizationId}
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Phiên bản</dt>
            <dd className="font-mono break-words text-[var(--civicos-text)]">
              v{detailVersion}
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Người tạo</dt>
            <dd className="font-mono break-words text-[var(--civicos-text)]">
              {detail.createdById}
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Ngày nộp</dt>
            <dd className="font-mono break-words text-[var(--civicos-text)]">
              {detail.submittedAt}
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">Ngày cập nhật</dt>
            <dd className="font-mono break-words text-[var(--civicos-text)]">
              {detail.updatedAt}
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-[var(--civicos-surface-muted)] p-3">
            <dt className="text-[var(--civicos-text-muted)]">
              Ngày hoàn thành
            </dt>
            <dd className="font-mono break-words text-[var(--civicos-text)]">
              {detail.completedAt ?? '—'}
            </dd>
          </div>
        </dl>
        {detail.rejectionReason ? (
          <div className="mt-3">
            <ParcelFeedback role="status" tone="danger" className="p-3">
              Lý do từ chối:{' '}
              <span className="font-medium">
                {detail.rejectionReason}
              </span>
            </ParcelFeedback>
          </div>
        ) : null}
        {readOnly ? (
          <p
            role="status"
            className="mt-3 text-sm text-[var(--civicos-text-muted)]"
          >
            Hồ sơ ở trạng thái chỉ đọc; màn hình này không cung cấp thao tác
            thay đổi hay xóa.
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="land-application-links-heading"
        className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4 sm:p-5"
      >
        <h3
          id="land-application-links-heading"
          className="text-xl font-semibold text-[var(--civicos-text)]"
        >
          Liên kết hồ sơ
        </h3>
        {detail.parties.length ? (
          <ul className="mt-3 space-y-1 text-sm">
            {detail.parties.map((link) => (
              <li
                key={`${link.partyId}-${link.partyRole}`}
                className="font-mono text-[var(--civicos-text)]"
              >
                Chủ thể {link.partyId} · vai trò {link.partyRole}
                {link.sharePercent ? ` · ${link.sharePercent}%` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p
            role="status"
            className="mt-2 text-sm text-[var(--civicos-text-muted)]"
          >
            Chưa có liên kết chủ thể nào.
          </p>
        )}
        {detail.parcels.length ? (
          <ul className="mt-3 space-y-1 text-sm">
            {detail.parcels.map((link) => (
              <li
                key={`${link.parcelId}-${link.parcelRole}`}
                className="font-mono text-[var(--civicos-text)]"
              >
                Thửa {link.parcelId} · vai trò {link.parcelRole}
              </li>
            ))}
          </ul>
        ) : (
          <p
            role="status"
            className="mt-2 text-sm text-[var(--civicos-text-muted)]"
          >
            Chưa có liên kết thửa đất nào.
          </p>
        )}
        <h4 className="mt-4 text-base font-semibold text-[var(--civicos-text)]">
          Dữ liệu biến động (trích an toàn)
        </h4>
        <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] p-3 font-mono text-xs leading-5 text-[var(--civicos-text)]">
          {JSON.stringify(detail.changePayload, null, 2)}
        </pre>
      </section>

      <section
        aria-labelledby="land-application-timeline-heading"
        className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4 sm:p-5"
      >
        <h3
          id="land-application-timeline-heading"
          className="text-xl font-semibold text-[var(--civicos-text)]"
        >
          Dòng thời gian (UTC)
        </h3>
        {events.length ? (
          <ol className="mt-3 space-y-2 text-sm">
            {events.map((event) => (
              <li
                key={event.eventId}
                className="rounded-lg border border-[var(--civicos-border)] p-3"
              >
                <p className="font-mono text-[var(--civicos-text)]">
                  {event.eventType} · v{event.aggregateVersion}
                </p>
                <p className="mt-1 font-mono text-xs text-[var(--civicos-text-muted)]">
                  {event.occurredAt}
                </p>
                {event.actor ? (
                  <p className="mt-1 text-xs text-[var(--civicos-text-muted)]">
                    {event.actor.name} ·{' '}
                    {event.actor.role ?? 'không rõ vai trò'}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p
            role="status"
            className="mt-2 text-sm text-[var(--civicos-text-muted)]"
          >
            Chưa có sự kiện nào trong dòng thời gian.
          </p>
        )}
      </section>

      <EvidencePanel
        resourceType="application"
        resourceId={applicationId}
        canList={canAccessEvidence}
        canUpload={canAccessEvidence && !readOnly && !conflict && !mutationBusy}
        readOnly={readOnly}
      />

      <section
        aria-labelledby="land-application-actions-heading"
        className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4 sm:p-5"
      >
        <h3
          id="land-application-actions-heading"
          className="text-xl font-semibold text-[var(--civicos-text)]"
        >
          Xử lý hồ sơ
        </h3>
        {visibility.needsAssignment ? (
          <p
            role="status"
            className="mt-2 text-sm text-[var(--civicos-warning)]"
          >
            Bạn chưa được phân công xử lý hồ sơ này. Cần Assignment land_review
            còn hiệu lực trong phạm vi đơn vị để thực hiện đồng bộ.
          </p>
        ) : null}
        {syncFailureCode ? (
          <p role="alert" className="mt-2 text-sm text-[var(--civicos-danger)]">
            Đồng bộ mô phỏng thất bại. Mã lỗi: {syncFailureCode}
          </p>
        ) : null}
        {actionError ? (
          <p role="alert" className="mt-2 text-sm text-[var(--civicos-danger)]">
            {actionError}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-3">
          {visibility.showSync ? (
            <button
              type="button"
              onClick={() => void runSync()}
              disabled={controlsLocked}
              className="civicos-control min-h-[44px] bg-[var(--civicos-accent)] px-4 py-2 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)] motion-safe:duration-150 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation === 'sync' ? 'Đang đồng bộ…' : 'Đồng bộ mô phỏng'}
            </button>
          ) : null}
          {visibility.showRetry ? (
            <button
              type="button"
              onClick={() => void runRetry()}
              disabled={controlsLocked}
              className="civicos-control min-h-[44px] border border-[var(--civicos-warning)] bg-[var(--civicos-surface)] px-4 py-2 text-sm font-semibold text-[var(--civicos-warning)] hover:bg-[var(--civicos-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation === 'retry' ? 'Đang thử lại…' : 'Thử lại'}
            </button>
          ) : null}
          {visibility.showApprove ? (
            <button
              type="button"
              onClick={() => void runApprove()}
              disabled={controlsLocked}
              className="civicos-control min-h-[44px] bg-[var(--civicos-accent)] px-4 py-2 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)] motion-safe:duration-150 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="civicos-control min-h-[44px] border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] px-4 py-2 text-sm font-semibold text-[var(--civicos-danger)] hover:bg-[var(--civicos-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Từ chối
            </button>
          ) : null}
        </div>
        {rejectOpen && visibility.showReject ? (
          <div
            role="dialog"
            aria-label="Từ chối hồ sơ"
            className="mt-4 space-y-3 rounded-lg border border-[var(--civicos-border)] p-4"
          >
            <label
              htmlFor="land-reject-reason"
              className="block text-sm text-[var(--civicos-text)]"
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
              className="min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]"
            />
            {rejectInvalid ? (
              <p role="alert" className="text-sm text-[var(--civicos-danger)]">
                Cần nhập lý do từ chối trước khi xác nhận.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void runReject()}
                disabled={controlsLocked}
                className="civicos-control min-h-[44px] border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] px-4 py-2 text-sm font-semibold text-[var(--civicos-danger)] hover:bg-[var(--civicos-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutation === 'reject' ? 'Đang từ chối…' : 'Xác nhận từ chối'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectInvalid(false);
                }}
                className="civicos-control motion-safe:transition-colors min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-4 py-2 text-sm font-medium text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
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
