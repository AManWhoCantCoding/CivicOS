import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { EstablishmentForm } from '@/components/inspections/EstablishmentForm';
import { EstablishmentList } from '@/components/inspections/EstablishmentList';
import { InspectionScheduleBoard } from '@/components/inspections/InspectionScheduleBoard';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function EstablishmentsPage() {
  const current = await getCurrentUser();
  const denied =
    current !== null &&
    !(await canEnterEntry(current, [
      'inspection-catalogue',
      'inspection-schedule',
      'inspection-workqueue',
    ]));
  return (
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          className="text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-accent)] hover:underline"
          href="/"
        >
          ← Trung tâm
        </Link>
        <div className="mt-10">
          <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
            Kiểm tra
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--civicos-text)]">
            Cơ sở kinh doanh
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--civicos-text-muted)]">
            Danh mục cơ sở và lịch kiểm tra theo loại hình.
          </p>
        </div>
        {denied ? (
          <div className="mt-10">
            <AccessDenied message="Danh mục và lịch kiểm tra không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại." />
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <EstablishmentForm />
              <EstablishmentList />
            </div>
            <div className="mt-10" id="inspection-schedule">
              <InspectionScheduleBoard />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
