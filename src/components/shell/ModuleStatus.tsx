'use client';

import { AccessDenied } from '@/components/identity/AccessDenied';

export function ModuleLoadingState({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[44px] items-center gap-2 rounded-xl border p-4 motion-safe:animate-pulse"
      style={{
        background: 'var(--civicos-surface-muted)',
        borderColor: 'var(--civicos-border)',
        borderRadius: 'var(--civicos-radius-md)',
        color: 'var(--civicos-info)',
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
        borderColor: 'var(--civicos-danger)',
        background: 'var(--civicos-surface)',
        borderRadius: 'var(--civicos-radius-md)',
      }}
    >
      <p
        className="text-sm"
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
          className="min-h-[44px] rounded-lg border px-3 py-2 text-sm"
          style={{
            borderColor: 'var(--civicos-danger)',
            borderRadius: 'var(--civicos-radius-sm)',
            color: 'var(--civicos-danger)',
            background: 'var(--civicos-surface)',
          }}
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
      className="rounded-xl border border-dashed p-5 text-sm"
      style={{
        borderColor: 'var(--civicos-border)',
        borderRadius: 'var(--civicos-radius-md)',
        color: 'var(--civicos-text-muted)',
        background: 'var(--civicos-surface)',
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
        borderColor: 'var(--civicos-success)',
        borderRadius: 'var(--civicos-radius-md)',
        color: 'var(--civicos-success)',
        background: 'var(--civicos-surface)',
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
        borderColor: 'var(--civicos-warning)',
        background: 'var(--civicos-surface)',
        borderRadius: 'var(--civicos-radius-md)',
      }}
    >
      <p
        className="text-sm"
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
          className="min-h-[44px] rounded-lg border px-3 py-2 text-sm"
          style={{
            borderColor: 'var(--civicos-warning)',
            borderRadius: 'var(--civicos-radius-sm)',
            color: 'var(--civicos-warning)',
            background: 'var(--civicos-surface)',
          }}
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
        borderRadius: 'var(--civicos-radius-md)',
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
        borderColor: 'var(--civicos-info)',
        background: 'var(--civicos-surface)',
        color: 'var(--civicos-info)',
        borderRadius: 'var(--civicos-radius-md)',
      }}
      role="status"
    >
      <span aria-hidden="true">ℹ </span>
      Đang ngoại tuyến. Điều hướng vẫn khả dụng, dữ liệu mới cần kết nối để tải.
    </p>
  );
}
