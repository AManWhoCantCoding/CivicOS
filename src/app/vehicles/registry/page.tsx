import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { RegistryForm } from '@/components/vehicles/RegistryForm';
import { RegistryList } from '@/components/vehicles/RegistryList';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function VehicleRegistryPage() {
  const current = await getCurrentUser();
  const denied =
    current !== null && !(await canEnterEntry(current, ['vehicle-registry']));
  return (
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          className="text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-accent)] hover:underline"
          href="/"
        >
          ← Trung tâm
        </Link>
        <div className="mt-10">
          <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
            Phương tiện
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--civicos-text)]">
            Registry xe cần chú ý
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--civicos-text-muted)]">
            Danh mục nội bộ có nguồn, lý do và thời hạn hiệu lực.
          </p>
        </div>
        <Link
          href="/field/vehicles"
          className="mt-6 inline-block text-sm text-[var(--civicos-accent)] underline-offset-4 hover:underline"
        >
          Mở hiện trường xe →
        </Link>
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          {denied ? (
            <div className="lg:col-span-2">
              <AccessDenied message="Registry xe không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại." />
            </div>
          ) : (
            <>
              <RegistryForm />
              <RegistryList />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
