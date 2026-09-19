import Link from 'next/link';

import { SessionControls } from '@/components/identity/SessionControls';
import { IncidentTable } from '@/components/incidents/IncidentTable';

export default function IncidentsPage() {
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <Link
            className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
            href="/"
          >
            ← Trung tâm
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/assignments"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-cyan-300 hover:text-white"
            >
              Assignment
            </Link>
            <SessionControls />
          </div>
        </header>
        <div className="mt-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
              Điều phối
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              Hàng đợi Incident
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-400">
              Các vụ việc trong phạm vi tài khoản và phân công hiện tại.
            </p>
          </div>
          <Link
            href="/intake"
            className="rounded-lg bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-cyan-200"
          >
            Ghi nhận tin báo
          </Link>
        </div>
        <div className="mt-10">
          <IncidentTable />
        </div>
      </div>
    </main>
  );
}
