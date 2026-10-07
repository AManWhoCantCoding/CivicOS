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
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--civicos-text)]">
            Tạo hồ sơ biến động
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--civicos-text-muted)]">
            Chỉ land_officer có quyền tạo trong phạm vi đơn vị mới được gửi hồ
            sơ ở trạng thái đã tiếp nhận.
          </p>
          <p
            role="note"
            className="mt-2 text-sm leading-6 text-[var(--civicos-simulated-text)]"
          >
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
