import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { AssignmentWorkspace } from '@/components/identity/AssignmentWorkspace';
import { SessionControls } from '@/components/identity/SessionControls';
import { getCurrentUser } from '@/modules/identity';

export default async function AssignmentsPage() {
  const current = await getCurrentUser();
  if (!current) {
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
            <SessionControls />
          </header>
          <div className="mt-10">
            <AccessDenied message="Cần đăng nhập để xem Assignment. Phiên hiện tại không hợp lệ hoặc đã hết hạn." />
          </div>
        </div>
      </main>
    );
  }
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
          <SessionControls />
        </header>
        <div className="mt-10">
          <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
            Identity / Assignment
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Phân công theo hồ sơ
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
            Quản lý quyền làm việc theo resource, task và OrganizationUnit trong
            phạm vi chỉ huy.
          </p>
        </div>
        <div className="mt-10">
          <AssignmentWorkspace />
        </div>
      </div>
    </main>
  );
}
