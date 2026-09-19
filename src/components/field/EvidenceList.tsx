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
    <div className="mt-4 border-t border-slate-800 pt-4">
      <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </p>
      <ul className="mt-2 space-y-2">
        {evidenceIds.map((evidenceId, index) => (
          <li key={evidenceId}>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-300 hover:text-white"
                href={`/api/evidence?evidenceId=${encodeURIComponent(evidenceId)}`}
                target="_blank"
                rel="noreferrer"
              >
                <span aria-hidden="true">↗</span>
                <span className="truncate">
                  {label} {index + 1} · xem
                </span>
              </Link>
              <a
                className="inline-flex items-center rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-cyan-300 hover:text-white"
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
