import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { ParcelDetail } from '@/components/land/ParcelDetail';
import { ModuleShell } from '@/components/shell/ModuleShell';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function LandParcelDetailPage({
  params,
}: {
  params: Promise<{ parcelId: string }>;
}) {
  const { parcelId } = await params;
  const current = await getCurrentUser();
  const denied =
    current !== null &&
    !(await canEnterEntry(current, ['land-parcel-workspace']));
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <ModuleShell module="land">
          <Link
            className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
            href="/land/parcels"
          >
            ← Danh sách thửa đất
          </Link>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
            Chi tiết thửa đất
          </h1>
          <div className="mt-8">
            {denied ? (
              <AccessDenied message="Thửa đất này không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại." />
            ) : (
              <ParcelDetail parcelId={parcelId} />
            )}
          </div>
        </ModuleShell>
      </div>
    </main>
  );
}
