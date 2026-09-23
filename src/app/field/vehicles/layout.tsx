import { ModuleShell } from '@/components/shell/ModuleShell';

export default function VehicleFieldLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ModuleShell module="vehicles">{children}</ModuleShell>;
}
