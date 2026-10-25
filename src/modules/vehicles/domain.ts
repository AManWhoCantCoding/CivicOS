export type VehicleDomainEventOwnership = {
  aggregateType:
    'VehicleObservation' | 'SuspiciousVehicleRegistry' | 'VehicleParkingWatch';
  eventVersion: 1;
};

export const VEHICLE_DOMAIN_EVENTS: Record<
  | 'VehicleObservationRecorded'
  | 'VehicleObservationEvidenceAttached'
  | 'SuspiciousVehicleMatched'
  | 'SuspiciousVehicleMatchConfirmed'
  | 'VehicleVerificationRecorded'
  | 'VehicleEscalated'
  | 'VehicleParkingWatchStarted'
  | 'VehicleParkingWatchCompleted'
  | 'SuspiciousVehicleRegistered'
  | 'SuspiciousVehicleRegistryUpdated',
  VehicleDomainEventOwnership
> = {
  VehicleObservationRecorded: {
    aggregateType: 'VehicleObservation',
    eventVersion: 1,
  },
  VehicleObservationEvidenceAttached: {
    aggregateType: 'VehicleObservation',
    eventVersion: 1,
  },
  SuspiciousVehicleMatched: {
    aggregateType: 'VehicleObservation',
    eventVersion: 1,
  },
  SuspiciousVehicleMatchConfirmed: {
    aggregateType: 'VehicleObservation',
    eventVersion: 1,
  },
  VehicleVerificationRecorded: {
    aggregateType: 'VehicleObservation',
    eventVersion: 1,
  },
  VehicleEscalated: { aggregateType: 'VehicleObservation', eventVersion: 1 },
  VehicleParkingWatchStarted: {
    aggregateType: 'VehicleParkingWatch',
    eventVersion: 1,
  },
  VehicleParkingWatchCompleted: {
    aggregateType: 'VehicleParkingWatch',
    eventVersion: 1,
  },
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

export function shouldStartVehicleEscalationSla(
  registryMatch: { id: string } | null,
): boolean {
  return registryMatch !== null;
}

export const VEHICLE_PARKING_WATCH_SLA = {
  kind: 'vehicle_parking_inspection_4h',
  durationMs: 4 * 60 * 60 * 1000,
};

export function vehicleParkingWatchDueAt(confirmedAt: Date): Date {
  return new Date(confirmedAt.getTime() + VEHICLE_PARKING_WATCH_SLA.durationMs);
}

export function canStartVehicleParkingWatch(status: string): boolean {
  return status === 'recorded' || status === 'match_confirmed';
}

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
  return roles.includes('field_officer');
}

export const VEHICLE_TASK_COMPATIBILITY: Record<string, readonly string[]> = {
  vehicle_report: ['village_officer', 'field_officer'],
  vehicle_verification: ['field_officer'],
};

export function isVehicleTaskCompatible(
  task: string,
  roles: string[],
): boolean {
  const allowed = VEHICLE_TASK_COMPATIBILITY[task];
  if (!allowed) return false;
  return roles.some((role) => allowed.includes(role));
}

export function isMatchSuggestion(status: string): boolean {
  return status === 'match_suggested';
}

export function assertVehicleMatchConfirmation(status: string): void {
  if (isMatchSuggestion(status)) throw new Error('MATCH_CONFIRMATION_REQUIRED');
}
