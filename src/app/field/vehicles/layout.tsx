export default function VehicleFieldLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Shell ownership lives in the field parent layout; this nested layout stays
  // a passthrough so /field/vehicles/** renders the shared shell exactly once.
  return <>{children}</>;
}
