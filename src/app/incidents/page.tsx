import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { SessionControls } from '@/components/identity/SessionControls';
import { IncidentTable } from '@/components/incidents/IncidentTable';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function IncidentsPage() {
  const current = await getCurrentUser();
  const denied =
    current !== null && !(await canEnterEntry(current, ['incident-queue']));
  return (
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--civicos-border)] pb-6">
          <Link
            className="text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-accent)] hover:underline"
            href="/"
          >
            ← Trung tâm
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/assignments"
              className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]"
            >
              Assignment
            </Link>
            <SessionControls />
          </div>
        </header>
        <div className="mt-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
              Điều phối
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--civicos-text)]">
              Hàng đợi Incident
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--civicos-text-muted)]">
              Các vụ việc trong phạm vi tài khoản và phân công hiện tại.
            </p>
          </div>
          <Link
            href="/intake"
            className="min-h-[44px] rounded-lg bg-[var(--civicos-accent)] px-4 py-3 text-center text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)]"
          >
            Ghi nhận tin báo
          </Link>
        </div>
        <div className="mt-10">
          {denied ? (
            <AccessDenied message="Hàng đợi Incident không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại." />
          ) : (
            <IncidentTable />
          )}
        </div>
      </div>
    </main>
  );
}
