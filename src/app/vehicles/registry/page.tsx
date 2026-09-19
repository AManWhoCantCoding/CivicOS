import Link from 'next/link';

import { RegistryForm } from '@/components/vehicles/RegistryForm';
import { RegistryList } from '@/components/vehicles/RegistryList';

export default function VehicleRegistryPage() {
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link className="text-sm text-slate-400 hover:text-white" href="/">
          ← Trung tâm
        </Link>
        <div className="mt-10">
          <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
            Phương tiện
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Registry xe cần chú ý
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-400">
            Danh mục nội bộ có nguồn, lý do và thời hạn hiệu lực.
          </p>
        </div>
        <Link
          href="/field/vehicles"
          className="mt-6 inline-block text-sm text-amber-200 hover:text-white"
        >
          Mở hiện trường xe →
        </Link>
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <RegistryForm />
          <RegistryList />
        </div>
      </div>
    </main>
  );
}
