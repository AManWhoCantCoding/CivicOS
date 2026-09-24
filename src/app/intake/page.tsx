import Link from 'next/link';

import { SessionControls } from '@/components/identity/SessionControls';
import { IntakeReportForm } from '@/components/incidents/IntakeReportForm';
import { IntakeReportQueue } from '@/components/incidents/IntakeReportQueue';

export default function IntakePage() {
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <Link
            className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
            href="/"
          >
            ← Trung tâm
          </Link>
          <SessionControls />
        </header>
        <div className="mt-10">
          <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
            Tiếp nhận
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Ghi nhận tin báo
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
            Tạo IntakeReport chờ phân loại. Incident chỉ tạo khi cán bộ xác nhận
            chuyển, không tạo tự động khi nhập tin.
          </p>
        </div>
        <div className="mt-10">
          <IntakeReportForm />
        </div>
        <div className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Hàng đợi IntakeReport
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Danh tính nguồn tin đã che theo vai trò; SLA tính liên tục từ thời
            điểm tiếp nhận.
          </p>
          <div className="mt-6">
            <IntakeReportQueue />
          </div>
        </div>
      </div>
    </main>
  );
}
