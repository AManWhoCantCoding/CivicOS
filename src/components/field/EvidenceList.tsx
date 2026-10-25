import Link from 'next/link';

export function EvidenceList({
  evidenceIds,
  label = 'Bằng chứng',
}: {
  evidenceIds: string[];
  label?: string;
}) {
  if (!evidenceIds.length) return null;

  return (
    <div className="mt-4 border-t border-[var(--civicos-border)] pt-4">
      <p className="font-mono text-xs font-semibold tracking-[0.14em] text-[var(--civicos-text-muted)] uppercase">
        {label}
      </p>
      <ul className="mt-2 space-y-2">
        {evidenceIds.map((evidenceId, index) => (
          <li key={evidenceId}>
            <div className="flex flex-wrap gap-2">
              <Link
                className="civicos-control inline-flex min-h-[44px] min-w-0 max-w-full items-center gap-2 border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2 text-xs text-[var(--civicos-accent)] underline-offset-4 hover:bg-[var(--civicos-surface-muted)] hover:underline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--civicos-focus)] motion-safe:transition-colors"
                href={`/api/evidence?evidenceId=${encodeURIComponent(evidenceId)}`}
                target="_blank"
                rel="noreferrer"
              >
                <span aria-hidden="true">↗</span>
                <span className="break-words">
                  {label} {index + 1} · xem
                </span>
              </Link>
              <a
                className="civicos-control inline-flex min-h-[44px] items-center gap-2 border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2 text-xs font-semibold text-[var(--civicos-accent)] underline-offset-4 hover:bg-[var(--civicos-surface-muted)] hover:underline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--civicos-focus)] motion-safe:transition-colors"
                href={`/api/evidence?evidenceId=${encodeURIComponent(evidenceId)}`}
                download
              >
                <span aria-hidden="true">↓</span>
                Tải xuống
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
