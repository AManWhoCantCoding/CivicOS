import Link from 'next/link';

export default function FieldLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-[var(--civicos-canvas)] text-[var(--civicos-text)]">
      <header className="border-b border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
            CivicOS / Hiện trường
          </p>
          <Link
            className="text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-accent)] hover:underline"
            href="/"
          >
            Về trung tâm
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
