import { Suspense } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { ApplicationQueue } from '@/components/land/ApplicationQueue';
import { ModuleShell } from '@/components/shell/ModuleShell';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function LandApplicationsPage() {
  const current = await getCurrentUser();
  const denied =
    current !== null &&
    !(await canEnterEntry(current, ['land-application-queue']));
  const canCreate =
    current !== null &&
    (current.roles as readonly string[]).includes('land_officer') &&
    (await canEnterEntry(current, ['land-application-create']));
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <ModuleShell module="land">
          <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
            Đất đai / Hồ sơ biến động
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Hồ sơ biến động
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-400">
            Hàng đợi hồ sơ trong phạm vi đơn vị; lọc theo trạng thái, loại biến
            động và người được phân công.
          </p>
          <p role="note" className="mt-2 text-sm leading-6 text-slate-500">
            Mô phỏng: dữ liệu hiển thị phục vụ kiểm thử nội bộ, không phải hồ sơ
            pháp lý.
          </p>
          <div className="mt-10">
            {denied ? (
              <AccessDenied message="Hàng đợi hồ sơ không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại." />
            ) : (
              <Suspense
                fallback={<p role="status">Đang tải hàng đợi hồ sơ…</p>}
              >
                <ApplicationQueue canCreate={canCreate} />
              </Suspense>
            )}
          </div>
        </ModuleShell>
      </div>
    </main>
  );
}
