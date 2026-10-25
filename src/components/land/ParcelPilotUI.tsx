import type { ReactNode } from 'react';

type ParcelPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
};

export function ParcelPageHeader({
  eyebrow,
  title,
  description,
  className = '',
}: ParcelPageHeaderProps) {
  return (
    <header
      className={`max-w-3xl border-l-2 border-[var(--civicos-accent)] pl-4 sm:pl-5 ${className}`}
    >
      <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--civicos-text)] sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--civicos-text-muted)] sm:text-base sm:leading-7">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function ParcelFilterToolbar({
  label,
  columns,
  children,
}: {
  label: string;
  columns: 2 | 3;
  children: ReactNode;
}) {
  const columnLayout =
    columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <form
      aria-label={label}
      className={`grid gap-3 rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4 ${columnLayout}`}
      onSubmit={(event) => event.preventDefault()}
    >
      {children}
    </form>
  );
}

export function ParcelTableViewport({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={`overflow-x-auto rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--civicos-focus)] ${className}`}
    >
      {children}
    </div>
  );
}

// Tone chỉ là màu ngữ nghĩa bổ trợ; trạng thái vẫn phân biệt bằng text + dot,
// không truyền tải trạng thái bằng màu đơn độc.
export type ParcelStatusTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

const statusToneClasses: Record<ParcelStatusTone, string> = {
  neutral:
    'border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] text-[var(--civicos-text)]',
  success:
    'border-[var(--civicos-success)] bg-[var(--civicos-surface)] text-[var(--civicos-success)]',
  warning:
    'border-[var(--civicos-warning)] bg-[var(--civicos-surface)] text-[var(--civicos-warning)]',
  danger:
    'border-[var(--civicos-danger)] bg-[var(--civicos-surface)] text-[var(--civicos-danger)]',
  info: 'border-[var(--civicos-info)] bg-[var(--civicos-surface)] text-[var(--civicos-info)]',
};

export function ParcelStatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: ParcelStatusTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${statusToneClasses[tone]}`}
    >
      <span aria-hidden="true">●</span>
      {children}
    </span>
  );
}

// Điểm dữ liệu mô phỏng nội bộ; cùng khối với PublicLandLookup để nhất quán.
export function ParcelSimulatedBadge() {
  return (
    <span className="inline-flex min-h-[32px] items-center gap-2 rounded-full border border-[var(--civicos-simulated-text)] bg-[var(--civicos-simulated-bg)] px-3 text-xs font-semibold text-[var(--civicos-simulated-text)]">
      <span aria-hidden="true">◇</span>
      Mô phỏng · simulated
    </span>
  );
}

const feedbackToneClasses = {
  neutral:
    'border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] text-[var(--civicos-text-muted)]',
  info: 'border-[var(--civicos-info)] bg-[var(--civicos-surface)] text-[var(--civicos-info)]',
  warning:
    'border-[var(--civicos-warning)] bg-[var(--civicos-surface)] text-[var(--civicos-warning)]',
  danger:
    'border-[var(--civicos-danger)] bg-[var(--civicos-surface)] text-[var(--civicos-danger)]',
};

export function ParcelFeedback({
  role,
  tone,
  className = '',
  children,
}: {
  role: 'status' | 'alert';
  tone: keyof typeof feedbackToneClasses;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={role}
      className={`rounded-lg border p-4 text-sm leading-6 ${feedbackToneClasses[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

export function ParcelSection({
  labelledBy,
  children,
}: {
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5 sm:p-6"
    >
      {children}
    </section>
  );
}
