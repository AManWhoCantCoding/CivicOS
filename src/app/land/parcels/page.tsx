import { AccessDenied } from '@/components/identity/AccessDenied';
import { ParcelList } from '@/components/land/ParcelList';
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
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <ModuleShell module="land">
          <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
            Quản lý đất đai nội bộ
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Thửa đất · Chủ thể
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-400">
            Danh sách thửa đất và chủ thể trong phạm vi đơn vị; số định danh
            luôn hiển thị dạng che.
          </p>
          <div className="mt-10 space-y-10">
            {denied ? (
              <AccessDenied message="Danh sách thửa đất không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại." />
            ) : (
              <>
                <section aria-labelledby="land-parcel-list-heading">
                  <h2
                    id="land-parcel-list-heading"
                    className="text-2xl font-semibold text-white"
                  >
                    Danh sách thửa đất
                  </h2>
                  <div className="mt-4">
                    <ParcelList />
                  </div>
                </section>
                <section aria-labelledby="land-party-list-heading">
                  <h2
                    id="land-party-list-heading"
                    className="text-2xl font-semibold text-white"
                  >
                    Danh sách chủ thể
                  </h2>
                  <div className="mt-4">
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
