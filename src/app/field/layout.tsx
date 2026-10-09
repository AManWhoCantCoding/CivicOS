import { ModuleShell } from '@/components/shell/ModuleShell';

export default function FieldLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-[var(--civicos-canvas)] text-[var(--civicos-text)]">
      <ModuleShell module="vehicles">{children}</ModuleShell>
    </div>
  );
}
