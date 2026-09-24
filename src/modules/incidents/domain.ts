import type {
  IncidentStatus,
  IntakeChannelInput,
  IntakeReportStatus,
  IntakeSourceChannel,
} from './contracts';

/** Ownership of incident intake domain events. */
export type IncidentDomainEventOwnership = {
  aggregateType: 'IntakeReport' | 'Incident';
  eventVersion: 1;
};

export const INCIDENT_DOMAIN_EVENTS: Record<
  | 'IntakeReportReceived'
  | 'IncidentRegistered'
  | 'IncidentClassified'
  | 'IncidentAssigned'
  | 'IncidentVerifying'
  | 'IncidentTransferRequested'
  | 'IncidentTransferred'
  | 'IncidentResolutionRequested'
  | 'IncidentResolved'
  | 'IncidentClosureRequested'
  | 'IncidentClosed'
  | 'IncidentApprovalRejected',
  IncidentDomainEventOwnership
> = {
  IntakeReportReceived: { aggregateType: 'IntakeReport', eventVersion: 1 },
  IncidentRegistered: { aggregateType: 'Incident', eventVersion: 1 },
  IncidentClassified: { aggregateType: 'Incident', eventVersion: 1 },
  IncidentAssigned: { aggregateType: 'Incident', eventVersion: 1 },
  IncidentVerifying: { aggregateType: 'Incident', eventVersion: 1 },
  IncidentTransferRequested: { aggregateType: 'Incident', eventVersion: 1 },
  IncidentTransferred: { aggregateType: 'Incident', eventVersion: 1 },
  IncidentResolutionRequested: { aggregateType: 'Incident', eventVersion: 1 },
  IncidentResolved: { aggregateType: 'Incident', eventVersion: 1 },
  IncidentClosureRequested: { aggregateType: 'Incident', eventVersion: 1 },
  IncidentClosed: { aggregateType: 'Incident', eventVersion: 1 },
  IncidentApprovalRejected: { aggregateType: 'Incident', eventVersion: 1 },
};

const allowedTransitions: Record<IncidentStatus, IncidentStatus[]> = {
  received: ['classified'],
  classified: ['verifying'],
  verifying: ['transferred', 'resolved'],
  transferred: ['resolved'],
  resolved: ['closed'],
  closed: [],
};

export function assertIncidentTransition(
  current: IncidentStatus,
  next: IncidentStatus,
): void {
  if (!allowedTransitions[current].includes(next)) {
    throw new Error(`INVALID_INCIDENT_TRANSITION:${current}:${next}`);
  }
}

export function isIncidentStatus(value: string): value is IncidentStatus {
  return Object.prototype.hasOwnProperty.call(allowedTransitions, value);
}

/** Canonical intake source channels for new writes. */
export const INTAKE_SOURCE_CHANNELS: readonly IntakeSourceChannel[] = [
  'direct',
  'phone',
  'app',
  'district_transfer',
];

/** Boundary mapping for contract legacy intake channels; never persisted. */
export function normalizeSourceChannel(value: unknown): IntakeSourceChannel {
  if (value === 'direct' || value === 'phone' || value === 'app') {
    return value;
  }
  if (value === 'district_transfer') return value;
  if (value === 'in_person') return 'direct';
  if (value === 'telephone') return 'phone';
  throw new Error('INVALID_CHANNEL');
}

export function isIntakeChannelInput(
  value: unknown,
): value is IntakeChannelInput {
  if (typeof value !== 'string') return false;
  try {
    normalizeSourceChannel(value);
    return true;
  } catch {
    return false;
  }
}

type IntakeTransitionMap = Record<IntakeReportStatus, IntakeReportStatus[]>;

const allowedIntakeTransitions: IntakeTransitionMap = {
  RECEIVED: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['PROCESSED', 'REJECTED'],
  PROCESSED: ['CLOSED'],
  CLOSED: [],
  REJECTED: [],
};

export function assertIntakeTransition(
  current: IntakeReportStatus,
  next: IntakeReportStatus,
): void {
  if (!allowedIntakeTransitions[current].includes(next)) {
    throw new Error(`INVALID_INTAKE_TRANSITION:${current}:${next}`);
  }
}

export function isIntakeStatus(value: string): value is IntakeReportStatus {
  return Object.prototype.hasOwnProperty.call(allowedIntakeTransitions, value);
}

/** Minimal intake event contract for PS-E1-005. */
export const INTAKE_DOMAIN_EVENTS = {
  IntakeReportReceived: { aggregateType: 'IntakeReport', eventVersion: 1 },
  IntakeReportVerified: { aggregateType: 'IntakeReport', eventVersion: 1 },
  IntakeReportProcessed: { aggregateType: 'IntakeReport', eventVersion: 1 },
  IntakeReportRejected: { aggregateType: 'IntakeReport', eventVersion: 1 },
  IntakeReportClosed: { aggregateType: 'IntakeReport', eventVersion: 1 },
  IntakeReportConvertedToIncident: {
    aggregateType: 'IntakeReport',
    eventVersion: 1,
  },
  IntakeReportTransferred: { aggregateType: 'IntakeReport', eventVersion: 1 },
} as const;

/** Continuous-clock SLA kinds for intake handling. */
export const INTAKE_SLA = {
  recording: {
    kind: 'intake_recording_24h',
    durationMs: 24 * 60 * 60 * 1000,
  },
  verification: {
    kind: 'intake_verification_48h',
    durationMs: 48 * 60 * 60 * 1000,
  },
  result: {
    kind: 'intake_result_notification_20d',
    durationMs: 20 * 24 * 60 * 60 * 1000,
  },
} as const;

/** Masked placeholder shown when the actor may not reveal reporter identity. */
export const MASKED_IDENTITY = 'Đã che theo vai trò';

/** Separation of duties between approval requester and decider. */
export function assertNoSelfApproval(
  requestedById: string,
  actorId: string,
): void {
  if (requestedById && requestedById === actorId) {
    throw new Error('SELF_APPROVAL_FORBIDDEN');
  }
}

/** Explicit decision scope for transfer approvals across organization units. */
export function assertTransferDecisionScope(input: {
  action: string;
  approvalOrganizationId?: string | null;
  receivingOrganizationId?: string;
  actor: {
    id: string;
    roles: readonly string[];
    organizationUnitId?: string;
  };
}): 'same_unit' | 'superior_unit' {
  if (input.action !== 'transfer') throw new Error('FORBIDDEN');
  const actorUnit = input.actor.organizationUnitId;
  const holdsCommand = input.actor.roles.includes('commander');
  const holdsSuperiorCommand = input.actor.roles.includes('superior_commander');
  if (
    actorUnit &&
    input.approvalOrganizationId &&
    input.approvalOrganizationId === actorUnit &&
    (holdsCommand || holdsSuperiorCommand)
  ) {
    return 'same_unit';
  }
  if (
    actorUnit &&
    input.receivingOrganizationId &&
    input.receivingOrganizationId === actorUnit &&
    holdsSuperiorCommand
  ) {
    return 'superior_unit';
  }
  throw new Error('FORBIDDEN');
}
