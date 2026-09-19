import { VehicleObservationForm } from '@/components/vehicles/VehicleObservationForm';

export default function VehicleFieldPage() {
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
      </div>
      <VehicleObservationForm />
    </section>
  );
}
