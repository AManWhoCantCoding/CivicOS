export type VehicleDomainEventOwnership = {
  aggregateType: 'VehicleObservation' | 'SuspiciousVehicleRegistry';
  eventVersion: 1;
};

export const VEHICLE_DOMAIN_EVENTS: Record<
  | 'VehicleObservationRecorded'
  | 'SuspiciousVehicleMatched'
  | 'VehicleVerificationRecorded'
  | 'VehicleEscalated'
  | 'SuspiciousVehicleRegistered'
  | 'SuspiciousVehicleRegistryUpdated',
  VehicleDomainEventOwnership
> = {
  VehicleObservationRecorded: {
    aggregateType: 'VehicleObservation',
    eventVersion: 1,
  },
  SuspiciousVehicleMatched: {
    aggregateType: 'VehicleObservation',
    eventVersion: 1,
  },
  VehicleVerificationRecorded: {
    aggregateType: 'VehicleObservation',
    eventVersion: 1,
  },
  VehicleEscalated: { aggregateType: 'VehicleObservation', eventVersion: 1 },
  SuspiciousVehicleRegistered: {
    aggregateType: 'SuspiciousVehicleRegistry',
    eventVersion: 1,
  },
  SuspiciousVehicleRegistryUpdated: {
    aggregateType: 'SuspiciousVehicleRegistry',
    eventVersion: 1,
  },
};

export const VEHICLE_ESCALATION_SLA = {
  kind: 'vehicle_escalation_2h',
  durationMs: 2 * 60 * 60 * 1000,
};

export const VEHICLE_REGISTRY_STATUSES = [
  'active',
  'expired',
  'revoked',
] as const;

export function assertRegistryStatus(status: string): void {
  if (!(VEHICLE_REGISTRY_STATUSES as readonly string[]).includes(status)) {
    throw new Error('INVALID_REGISTRY_STATUS');
  }
}

export function vehicleEscalationDueAt(startedAt: Date): Date {
  return new Date(startedAt.getTime() + VEHICLE_ESCALATION_SLA.durationMs);
}

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

export function isMatchSuggestion(status: string): boolean {
  return status === 'match_suggested';
}

export function assertVehicleMatchConfirmation(status: string): void {
  if (isMatchSuggestion(status)) throw new Error('MATCH_CONFIRMATION_REQUIRED');
}
