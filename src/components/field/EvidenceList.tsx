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
      <p className="text-xs font-semibold tracking-wide text-[var(--civicos-text-muted)] uppercase">
        {label}
      </p>
      <ul className="mt-2 space-y-2">
        {evidenceIds.map((evidenceId, index) => (
          <li key={evidenceId}>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex max-w-full items-center gap-2 rounded-md border border-[var(--civicos-border)] px-3 py-2 text-xs text-[var(--civicos-accent)] underline-offset-4 hover:underline"
                href={`/api/evidence?evidenceId=${encodeURIComponent(evidenceId)}`}
                target="_blank"
                rel="noreferrer"
              >
                <span aria-hidden="true">↗</span>
                <span className="max-w-full break-words">
                  {label} {index + 1} · xem
                </span>
              </Link>
              <a
                className="inline-flex min-h-[44px] items-center rounded-md border border-[var(--civicos-border)] px-3 py-2 text-xs text-[var(--civicos-accent)] underline-offset-4 hover:underline"
                href={`/api/evidence?evidenceId=${encodeURIComponent(evidenceId)}`}
                download
              >
                Tải xuống
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
