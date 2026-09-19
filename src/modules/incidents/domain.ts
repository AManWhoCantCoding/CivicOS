import type { IncidentStatus } from './contracts';

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
