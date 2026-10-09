import { ModuleShell } from '@/components/shell/ModuleShell';

export default function FieldLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ModuleShell module="vehicles">{children}</ModuleShell>;
}
