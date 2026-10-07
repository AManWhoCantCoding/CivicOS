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
      <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--civicos-border)] pb-6">
            <Link
              className="inline-flex min-h-[44px] items-center text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-text)] hover:underline"
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
      <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--civicos-border)] pb-6">
            <Link
              className="inline-flex min-h-[44px] items-center text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-text)] hover:underline"
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
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--civicos-border)] pb-6">
          <Link
            className="inline-flex min-h-[44px] items-center text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-text)] hover:underline"
            href="/"
          >
            ← Trung tâm
          </Link>
          <SessionControls />
        </header>
        <div className="mt-10">
          <ModuleShell module="identity">
            <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
              Identity / User
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--civicos-text)]">
              Quản lý User
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 break-words text-[var(--civicos-text-muted)]">
              Danh sách User nội bộ với Role và OrganizationUnit do máy chủ kiểm
              tra quyền, không dựa vào ẩn giao diện.
            </p>
            <div className="mt-10 space-y-8">
              <section className="overflow-x-auto rounded-2xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)]">
                <table className="w-full min-w-2xl text-left text-sm">
                  <caption className="px-5 pt-5 pb-2 text-left text-sm font-medium text-[var(--civicos-text)]">
                    Danh sách User ({users.length})
                  </caption>
                  <thead>
                    <tr className="border-y border-[var(--civicos-border)] text-xs tracking-wide text-[var(--civicos-text-muted)] uppercase">
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
                        className="border-b border-[var(--civicos-border)]"
                      >
                        <td className="px-5 py-3 text-[var(--civicos-text)]">
                          {user.name}
                        </td>
                        <td className="px-5 py-3 text-[var(--civicos-text-muted)]">
                          {user.email}
                        </td>
                        <td className="px-5 py-3 text-[var(--civicos-text)]">
                          {user.roles.join(' · ')}
                        </td>
                        <td className="px-5 py-3 text-[var(--civicos-text-muted)]">
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
