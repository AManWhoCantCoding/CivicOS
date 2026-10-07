import { AccessDenied } from '@/components/identity/AccessDenied';
import { ModuleShell } from '@/components/shell/ModuleShell';
import { hasBusinessCapability } from '@/components/navigation/feature-registry';
import { getCurrentUser } from '@/modules/identity';

export default async function VehiclesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const current = await getCurrentUser();
  if (!current) {
    return <>{children}</>;
  }
  if (!hasBusinessCapability(current.roles)) {
    return (
      <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <ModuleShell module="vehicles">
            <div className="mt-2">
              <AccessDenied message="Tài khoản hiện tại không có quyền nghiệp vụ trong phân hệ Phương tiện." />
            </div>
          </ModuleShell>
        </div>
      </main>
    );
  }
  return <ModuleShell module="vehicles">{children}</ModuleShell>;
}
