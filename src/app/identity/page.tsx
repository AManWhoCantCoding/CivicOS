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
              <AccessDenied message="Cần đăng nhập để xem phân hệ Identity. Phiên hiện tại không hợp lệ hoặc đã hết hạn." />
            </ModuleShell>
          </div>
        </div>
      </main>
    );
  }
  if (!(await canEnterEntry(current, ['identity-assignments']))) {
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
              <AccessDenied message="Tài khoản hiện tại không có quyền nghiệp vụ trong phân hệ Identity." />
            </ModuleShell>
          </div>
        </div>
      </main>
    );
  }
  const managesUsers = await canEnterEntry(current, ['identity-users']);
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
              Identity
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--civicos-text)]">
              Identity
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 break-words text-[var(--civicos-text-muted)]">
              User và Assignment trong phạm vi chỉ huy, do máy chủ kiểm tra
              quyền.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <section className="rounded-2xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5">
                <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
                  Assignment
                </h2>
                <p className="mt-2 text-sm leading-6 break-words text-[var(--civicos-text-muted)]">
                  Phân công theo hồ sơ, task và OrganizationUnit.
                </p>
                <Link
                  href="/assignments"
                  className="mt-4 inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-accent)] hover:border-[var(--civicos-accent)]"
                >
                  Mở Assignment
                </Link>
              </section>
              {managesUsers ? (
                <section className="rounded-2xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5">
                  <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
                    Quản lý User
                  </h2>
                  <p className="mt-2 text-sm leading-6 break-words text-[var(--civicos-text-muted)]">
                    Danh sách User nội bộ với Role và OrganizationUnit.
                  </p>
                  <Link
                    href="/users"
                    className="mt-4 inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-accent)] hover:border-[var(--civicos-accent)]"
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
