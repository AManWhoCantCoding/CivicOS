import type { IncidentStatus } from './contracts';

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
