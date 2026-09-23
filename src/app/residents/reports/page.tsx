import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { ReportPreview } from '@/components/residents/ReportPreview';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function ResidentReportsPage() {
  const current = await getCurrentUser();
  const denied =
    current !== null && !(await canEnterEntry(current, ['resident-reports']));
  const organizationId = current?.organizationUnitId ?? '';
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
          href="/residents"
        >
          ← Danh sách cư dân
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
          Báo cáo tháng
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-400">
          Snapshot bất biến khi phê duyệt hoặc gửi cấp trên.
        </p>
        <div className="mt-8">
          {denied || !organizationId ? (
            <AccessDenied message="Báo cáo tháng chỉ dành cho chỉ huy hoặc cán bộ văn phòng trong đơn vị." />
          ) : (
            <ReportPreview organizationId={organizationId} />
          )}
        </div>
      </div>
    </main>
  );
}
