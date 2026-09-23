import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { SessionControls } from '@/components/identity/SessionControls';
import { ModuleShell } from '@/components/shell/ModuleShell';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function IdentityPage() {
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
            <ModuleShell module="identity">
              <AccessDenied message="Cần đăng nhập để xem phân hệ Identity. Phiên hiện tại không hợp lệ hoặc đã hết hạn." />
            </ModuleShell>
          </div>
        </div>
      </main>
    );
  }
  if (!(await canEnterEntry(current, ['identity-assignments']))) {
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
            <ModuleShell module="identity">
              <AccessDenied message="Tài khoản hiện tại không có quyền nghiệp vụ trong phân hệ Identity." />
            </ModuleShell>
          </div>
        </div>
      </main>
    );
  }
  const managesUsers = await canEnterEntry(current, ['identity-users']);
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
          <ModuleShell module="identity">
            <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
              Identity
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              Identity
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              User và Assignment trong phạm vi chỉ huy, do máy chủ kiểm tra
              quyền.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <h2 className="text-sm font-semibold text-white">Assignment</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Phân công theo hồ sơ, task và OrganizationUnit.
                </p>
                <Link
                  href="/assignments"
                  className="mt-4 inline-block min-h-[44px] rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-300 hover:text-white"
                >
                  Mở Assignment
                </Link>
              </section>
              {managesUsers ? (
                <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                  <h2 className="text-sm font-semibold text-white">
                    Quản lý User
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Danh sách User nội bộ với Role và OrganizationUnit.
                  </p>
                  <Link
                    href="/users"
                    className="mt-4 inline-block min-h-[44px] rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-300 hover:text-white"
                  >
                    Mở quản lý User
                  </Link>
                </section>
              ) : null}
            </div>
          </ModuleShell>
        </div>
      </div>
    </main>
  );
}
