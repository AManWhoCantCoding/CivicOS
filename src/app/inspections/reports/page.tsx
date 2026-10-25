import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { InspectionReports } from '@/components/inspections/InspectionReports';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function InspectionReportsPage() {
  const current = await getCurrentUser();
  const denied =
    current !== null &&
    !(await canEnterEntry(current, ['inspection-schedule']));
  return (
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
        <Link
          href="/inspections/establishments"
          className="inline-flex min-h-[44px] items-center text-sm text-[var(--civicos-text-muted)] underline underline-offset-4 hover:text-[var(--civicos-accent)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--civicos-focus)]"
        >
          ← Cơ sở kinh doanh
        </Link>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-[var(--civicos-text)] sm:text-3xl">
          Báo cáo inspections
        </h1>
        {denied ? (
          <AccessDenied message="Báo cáo không thuộc nhiệm vụ hoặc phạm vi tài khoản." />
        ) : (
          <InspectionReports />
        )}
      </div>
    </main>
  );
}
