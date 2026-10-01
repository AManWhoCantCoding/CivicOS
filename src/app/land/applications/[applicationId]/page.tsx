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
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <ModuleShell module="land">
          <Link
            className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
            href="/land/applications"
          >
            ← Hàng đợi hồ sơ
          </Link>
          <p className="mt-6 font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
            Đất đai / Hồ sơ biến động
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Chi tiết hồ sơ
          </h1>
          <p role="note" className="mt-2 text-sm leading-6 text-slate-500">
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
