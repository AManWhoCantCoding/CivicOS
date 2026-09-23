import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { CreateUserForm } from '@/components/identity/CreateUserForm';
import { SessionControls } from '@/components/identity/SessionControls';
import { ModuleShell } from '@/components/shell/ModuleShell';
import { canEnterEntry } from '@/components/shell/feature-entry';
import {
  getCurrentUser,
  listIdentityUsers,
  listOrganizationUnits,
} from '@/modules/identity';

export default async function UsersPage() {
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
              <AccessDenied message="Cần đăng nhập để xem danh sách User. Phiên hiện tại không hợp lệ hoặc đã hết hạn." />
            </ModuleShell>
          </div>
        </div>
      </main>
    );
  }
  if (!(await canEnterEntry(current, ['identity-users']))) {
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
              <AccessDenied message="Chỉ Trưởng Công an xã được quản lý User." />
            </ModuleShell>
          </div>
        </div>
      </main>
    );
  }
  const [users, units] = await Promise.all([
    listIdentityUsers(current),
    listOrganizationUnits(current),
  ]);
  const unitNames = new Map(units.map((unit) => [unit.id, unit.name]));
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
              Identity / User
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              Quản lý User
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              Danh sách User nội bộ với Role và OrganizationUnit do máy chủ kiểm
              tra quyền, không dựa vào ẩn giao diện.
            </p>
            <div className="mt-10 space-y-8">
              <section className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
                <table className="w-full min-w-2xl text-left text-sm">
                  <caption className="px-5 pt-5 pb-2 text-left text-sm font-medium text-white">
                    Danh sách User ({users.length})
                  </caption>
                  <thead>
                    <tr className="border-y border-slate-800 text-xs tracking-wide text-slate-400 uppercase">
                      <th scope="col" className="px-5 py-3">
                        Tên
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Email
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Role
                      </th>
                      <th scope="col" className="px-5 py-3">
                        OrganizationUnit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-slate-800/60"
                      >
                        <td className="px-5 py-3 text-slate-100">
                          {user.name}
                        </td>
                        <td className="px-5 py-3 text-slate-400">
                          {user.email}
                        </td>
                        <td className="px-5 py-3 text-slate-200">
                          {user.roles.join(' · ')}
                        </td>
                        <td className="px-5 py-3 text-slate-400">
                          {user.organizationUnitId
                            ? (unitNames.get(user.organizationUnitId) ??
                              user.organizationUnitId)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <CreateUserForm />
            </div>
          </ModuleShell>
        </div>
      </div>
    </main>
  );
}
