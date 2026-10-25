'use client';

import { AccessDenied } from '@/components/identity/AccessDenied';

// Shared notice chrome: a 3px state-accent bar on the leading edge plus the
// token border, so every state stays readable as text/icon + color, with the
// approved Light/Blue surfaces. Presentation only.
function noticeStyle(color: string): React.CSSProperties {
  return {
    borderRadius: 'var(--civicos-radius-md)',
    borderLeftWidth: '3px',
    borderLeftColor: color,
  };
}

export function ModuleLoadingState({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[44px] items-center gap-2 rounded-xl border p-4 motion-safe:animate-pulse"
      style={{
        background: 'var(--civicos-surface-muted)',
        borderColor: 'var(--civicos-border)',
        color: 'var(--civicos-info)',
        ...noticeStyle('var(--civicos-info)'),
      }}
      aria-label={`Đang tải ${label}`}
      aria-busy="true"
      role="status"
    >
      <span aria-hidden="true">◌</span>
      <span className="text-sm">Đang tải {label}…</span>
    </div>
  );
}

export function ModuleErrorState({
  message,
  onRetry,
  retryLabel = 'Thử tải lại',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      className="space-y-3 rounded-xl border p-4"
      style={{
        borderColor: 'var(--civicos-border)',
        background: 'var(--civicos-surface)',
        ...noticeStyle('var(--civicos-danger)'),
      }}
    >
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--civicos-danger)' }}
        role="alert"
      >
        <span aria-hidden="true">⚠ </span>
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="civicos-nav-tab min-h-[44px] px-3 py-2 text-sm"
          style={{ color: 'var(--civicos-danger)' }}
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ModuleEmptyState({ message }: { message: string }) {
  return (
    <div
      className="min-h-[44px] rounded-xl border border-dashed p-5 text-sm"
      style={{
        borderColor: 'var(--civicos-border)',
        color: 'var(--civicos-text-muted)',
        background: 'var(--civicos-surface)',
        borderRadius: 'var(--civicos-radius-md)',
      }}
    >
      <span aria-hidden="true">○ </span>
      {message}
    </div>
  );
}

export function ModuleReadyState({ message }: { message: string }) {
  return (
    <p
      className="rounded-xl border p-4 text-sm"
      style={{
        borderColor: 'var(--civicos-border)',
        color: 'var(--civicos-success)',
        background: 'var(--civicos-surface)',
        ...noticeStyle('var(--civicos-success)'),
      }}
      role="status"
    >
      <span aria-hidden="true">● </span>
      {message}
    </p>
  );
}

export function ModuleWarningState({
  message,
  onRetry,
  retryLabel = 'Tải lại dữ liệu',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      className="space-y-3 rounded-xl border p-4"
      style={{
        borderColor: 'var(--civicos-border)',
        background: 'var(--civicos-surface)',
        ...noticeStyle('var(--civicos-warning)'),
      }}
    >
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--civicos-warning)' }}
        role="status"
      >
        <span aria-hidden="true">▲ </span>
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="civicos-nav-tab min-h-[44px] px-3 py-2 text-sm"
          style={{ color: 'var(--civicos-warning)' }}
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ModuleSimulatedNotice() {
  return (
    <p
      className="rounded-xl border p-4 text-sm"
      style={{
        borderColor: 'var(--civicos-simulated-text)',
        background: 'var(--civicos-simulated-bg)',
        color: 'var(--civicos-simulated-text)',
        ...noticeStyle('var(--civicos-simulated-text)'),
      }}
      role="note"
    >
      <span aria-hidden="true">ℹ </span>
      Dữ liệu mô phỏng nội bộ; không phải ranh giới pháp lý chính thức.
    </p>
  );
}

export function ModuleDeniedState({ message }: { message?: string }) {
  return <AccessDenied message={message} />;
}

export function ModuleOfflineNotice() {
  return (
    <p
      className="rounded-xl border p-4 text-sm"
      style={{
        borderColor: 'var(--civicos-border)',
        background: 'var(--civicos-surface-muted)',
        color: 'var(--civicos-info)',
        ...noticeStyle('var(--civicos-info)'),
      }}
      role="status"
    >
      <span aria-hidden="true">ℹ </span>
      Đang ngoại tuyến. Điều hướng vẫn khả dụng, dữ liệu mới cần kết nối để tải.
    </p>
  );
}
