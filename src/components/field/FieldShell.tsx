export function FieldShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Field workspace uses the shared 24px section rhythm from the approved
  // Light/Blue token scale; inner cards own their own density.
  return <div className="space-y-6 text-[var(--civicos-text)]">{children}</div>;
}
