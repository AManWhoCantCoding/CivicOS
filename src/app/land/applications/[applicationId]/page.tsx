import Link from 'next/link';
import { Suspense } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { ApplicationDetail } from '@/components/land/ApplicationDetail';
import { ModuleShell } from '@/components/shell/ModuleShell';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function LandApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const current = await getCurrentUser();
  const denied =
    current !== null &&
    !(await canEnterEntry(current, ['land-application-queue']));
  return (
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <ModuleShell module="land">
          <Link
            className="text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-accent)] hover:underline"
            href="/land/applications"
          >
            ← Hàng đợi hồ sơ
          </Link>
          <p className="mt-6 font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
            Đất đai / Hồ sơ biến động
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--civicos-text)]">
            Chi tiết hồ sơ
          </h1>
          <p
            role="note"
            className="mt-2 text-sm leading-6 text-[var(--civicos-simulated-text)]"
          >
            Mô phỏng: chi tiết và thao tác xử lý phục vụ kiểm thử nội bộ, không
            phải hồ sơ pháp lý.
          </p>
          <div className="mt-8">
            {denied ? (
              <AccessDenied message="Hồ sơ này không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại." />
            ) : (
              <Suspense
                fallback={<p role="status">Đang tải chi tiết hồ sơ…</p>}
              >
                <ApplicationDetail applicationId={applicationId} />
              </Suspense>
            )}
          </div>
        </ModuleShell>
      </div>
    </main>
  );
}
