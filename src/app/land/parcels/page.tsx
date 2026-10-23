import { AccessDenied } from '@/components/identity/AccessDenied';
import { ParcelList } from '@/components/land/ParcelList';
import { ParcelPageHeader } from '@/components/land/ParcelPilotUI';
import { PartyList } from '@/components/land/PartyList';
import { ModuleShell } from '@/components/shell/ModuleShell';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function LandParcelsPage() {
  const current = await getCurrentUser();
  const denied =
    current !== null &&
    !(await canEnterEntry(current, ['land-parcel-workspace']));
  return (
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
      <div className="w-full">
        <ModuleShell module="land">
          <ParcelPageHeader
            eyebrow="Quản lý đất đai nội bộ"
            title="Thửa đất · Chủ thể"
            description="Danh sách thửa đất và chủ thể trong phạm vi đơn vị; số định danh luôn hiển thị dạng che."
          />
          <div className="mt-8 space-y-8">
            {denied ? (
              <AccessDenied message="Danh sách thửa đất không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại." />
            ) : (
              <>
                <section
                  aria-labelledby="land-parcel-list-heading"
                  className="space-y-4"
                >
                  <h2
                    id="land-parcel-list-heading"
                    className="border-b border-[var(--civicos-border)] pb-3 text-xl font-semibold text-[var(--civicos-text)] sm:text-2xl"
                  >
                    Danh sách thửa đất
                  </h2>
                  <div>
                    <ParcelList />
                  </div>
                </section>
                <section
                  aria-labelledby="land-party-list-heading"
                  className="space-y-4"
                >
                  <h2
                    id="land-party-list-heading"
                    className="border-b border-[var(--civicos-border)] pb-3 text-xl font-semibold text-[var(--civicos-text)] sm:text-2xl"
                  >
                    Danh sách chủ thể
                  </h2>
                  <div>
                    <PartyList />
                  </div>
                </section>
              </>
            )}
          </div>
        </ModuleShell>
      </div>
    </main>
  );
}
