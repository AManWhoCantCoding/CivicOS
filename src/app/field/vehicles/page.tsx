import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { VehicleObservationWorkspace } from '@/components/vehicles/VehicleObservationWorkspace';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function VehicleFieldPage() {
  const current = await getCurrentUser();
  const denied =
    current !== null &&
    !(await canEnterEntry(current, [
      'vehicle-observation',
      'vehicle-verification',
    ]));
  if (denied) {
    return (
      <section className="space-y-6">
        <AccessDenied message="Quan sát hiện trường không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại." />
      </section>
    );
  }
  return (
    <section className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
          Ghi nhận nhanh
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Phương tiện tại hiện trường
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Nhập biển số, vị trí và mô tả. Khi mất mạng, thao tác sẽ chờ đồng bộ.
        </p>
        <Link
          href="/vehicles/registry"
          className="mt-3 inline-block text-sm text-amber-200 hover:text-white"
        >
          Mở registry xe →
        </Link>
      </div>
      <VehicleObservationWorkspace />
    </section>
  );
}
