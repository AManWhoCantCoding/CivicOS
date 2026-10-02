import { AccessDenied } from '@/components/identity/AccessDenied';
import { MapWorkspace } from '@/components/map/MapWorkspace';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function MapPage({
  searchParams,
}: {
  searchParams?: Promise<{ parcelId?: string | string[] }>;
}) {
  const current = await getCurrentUser();
  const denied =
    current !== null && !(await canEnterEntry(current, ['map-workspace']));
  // T-003: parcelId chỉ là navigation context cho focused layer;
  // server route T-002 quyết định quyền, URL không giữ geometry/PII/token.
  const query = (await searchParams) ?? {};
  const rawParcelId = Array.isArray(query.parcelId)
    ? query.parcelId[0]
    : query.parcelId;
  const focusParcelId =
    typeof rawParcelId === 'string' && rawParcelId.trim().length > 0
      ? rawParcelId.trim()
      : null;
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
            Workspace
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {focusParcelId ? 'Bản đồ thửa đất' : 'Bản đồ nghiệp vụ'}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-400">
            Điểm GeoPoint và vùng GeoArea trong phạm vi đơn vị hiện tại.
          </p>
        </div>
        <div className="mt-10">
          {denied ? (
            <AccessDenied message="Bản đồ nghiệp vụ không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại." />
          ) : (
            <MapWorkspace initialParcelId={focusParcelId} />
          )}
        </div>
      </div>
    </main>
  );
}
