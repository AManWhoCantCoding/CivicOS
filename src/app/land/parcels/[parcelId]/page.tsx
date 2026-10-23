import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { ParcelDetail } from '@/components/land/ParcelDetail';
import { ParcelPageHeader } from '@/components/land/ParcelPilotUI';
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
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
      <div className="w-full">
        <ModuleShell module="land">
          <Link
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-accent)] hover:underline"
            href="/land/parcels"
          >
            ← Danh sách thửa đất
          </Link>
          <ParcelPageHeader
            eyebrow="Quản lý đất đai nội bộ"
            title="Chi tiết thửa đất"
            className="mt-6"
          />
          <div className="mt-6">
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
