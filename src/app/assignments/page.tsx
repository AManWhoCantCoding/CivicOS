import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { AssignmentWorkspace } from '@/components/identity/AssignmentWorkspace';
import { SessionControls } from '@/components/identity/SessionControls';
import { ModuleShell } from '@/components/shell/ModuleShell';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function AssignmentsPage() {
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
              <AccessDenied message="Cần đăng nhập để xem Assignment. Phiên hiện tại không hợp lệ hoặc đã hết hạn." />
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
              Identity / Assignment
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--civicos-text)]">
              Phân công theo hồ sơ
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 break-words text-[var(--civicos-text-muted)]">
              Quản lý quyền làm việc theo resource, task và OrganizationUnit
              trong phạm vi chỉ huy.
            </p>
            <div className="mt-10">
              <AssignmentWorkspace />
            </div>
          </ModuleShell>
        </div>
      </div>
    </main>
  );
}
