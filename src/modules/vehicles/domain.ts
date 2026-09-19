export function isRegistryActive(
  input: { status: string; validFrom: Date; validUntil: Date | null },
  at: Date,
): boolean {
  return (
    input.status === 'active' &&
    input.validFrom <= at &&
    (!input.validUntil || input.validUntil > at)
  );
}

export function canVerifyVehicle(roles: string[]): boolean {
  return roles.includes('commander') || roles.includes('field_officer');
}
