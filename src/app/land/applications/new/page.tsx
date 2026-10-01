import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { ApplicationForm } from '@/components/land/ApplicationForm';
import { ModuleShell } from '@/components/shell/ModuleShell';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function LandApplicationCreatePage() {
  const current = await getCurrentUser();
  const isOfficer =
    current !== null &&
    (current.roles as readonly string[]).includes('land_officer');
  const allowed =
    isOfficer && (await canEnterEntry(current, ['land-application-create']));
  const denied = !allowed;
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
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Tạo hồ sơ biến động
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-400">
            Chỉ land_officer có quyền tạo trong phạm vi đơn vị mới được gửi hồ
            sơ ở trạng thái đã tiếp nhận.
          </p>
          <p role="note" className="mt-2 text-sm leading-6 text-slate-500">
            Mô phỏng: dữ liệu tạo phục vụ kiểm thử nội bộ, không phải hồ sơ pháp
            lý.
          </p>
          <div className="mt-10">
            {denied ? (
              <AccessDenied message="Chỉ land_officer trong phạm vi đơn vị mới được tạo hồ sơ biến động." />
            ) : (
              <ApplicationForm />
            )}
          </div>
        </ModuleShell>
      </div>
    </main>
  );
}
