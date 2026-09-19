import Link from 'next/link';

import { EstablishmentForm } from '@/components/inspections/EstablishmentForm';
import { EstablishmentList } from '@/components/inspections/EstablishmentList';
import { InspectionScheduleBoard } from '@/components/inspections/InspectionScheduleBoard';

export default function EstablishmentsPage() {
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
          href="/"
        >
          ← Trung tâm
        </Link>
        <div className="mt-10">
          <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
            Kiểm tra
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Cơ sở kinh doanh
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-400">
            Danh mục cơ sở và lịch kiểm tra theo loại hình.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <EstablishmentForm />
          <EstablishmentList />
        </div>
        <div className="mt-10">
          <InspectionScheduleBoard />
        </div>
      </div>
    </main>
  );
}
