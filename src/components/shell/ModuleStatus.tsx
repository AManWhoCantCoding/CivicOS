'use client';

import { AccessDenied } from '@/components/identity/AccessDenied';

export function ModuleLoadingState({ label }: { label: string }) {
  return (
    <div
      className="h-24 rounded-xl bg-slate-900 motion-safe:animate-pulse"
      aria-label={`Đang tải ${label}`}
      role="status"
    />
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
    <div className="space-y-3 rounded-xl border border-rose-900/60 bg-rose-950/30 p-4">
      <p className="text-sm text-rose-200" role="alert">
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[44px] rounded-lg border border-rose-300/40 px-3 py-2 text-sm text-rose-100 hover:border-rose-200"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ModuleEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">
      {message}
    </div>
  );
}

export function ModuleDeniedState({ message }: { message?: string }) {
  return <AccessDenied message={message} />;
}

export function ModuleOfflineNotice() {
  return (
    <p
      className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4 text-sm text-amber-200"
      role="status"
    >
      Đang ngoại tuyến. Điều hướng vẫn khả dụng, dữ liệu mới cần kết nối để tải.
    </p>
  );
}
