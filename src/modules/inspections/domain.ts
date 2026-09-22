import type {
  EnforcementRecommendationStatus,
  InspectionResult,
  InspectionStatus,
} from './contracts';

export type InspectionDomainEventOwnership = {
  aggregateType: 'Establishment' | 'Inspection';
  eventVersion: 1;
};

export const INSPECTION_DOMAIN_EVENTS: Record<
  | 'EstablishmentRegistered'
  | 'EstablishmentUpdated'
  | 'InspectionScheduled'
  | 'InspectionStarted'
  | 'InspectionChecklistSaved'
  | 'InspectionCompleted'
  | 'InspectionFindingRecorded'
  | 'EnforcementRecommendationSubmitted'
  | 'EnforcementApproved'
  | 'EnforcementRejected',
  InspectionDomainEventOwnership
> = {
  EstablishmentRegistered: { aggregateType: 'Establishment', eventVersion: 1 },
  EstablishmentUpdated: { aggregateType: 'Establishment', eventVersion: 1 },
  InspectionScheduled: { aggregateType: 'Inspection', eventVersion: 1 },
  InspectionStarted: { aggregateType: 'Inspection', eventVersion: 1 },
  InspectionChecklistSaved: { aggregateType: 'Inspection', eventVersion: 1 },
  InspectionCompleted: { aggregateType: 'Inspection', eventVersion: 1 },
  InspectionFindingRecorded: { aggregateType: 'Inspection', eventVersion: 1 },
  EnforcementRecommendationSubmitted: {
    aggregateType: 'Inspection',
    eventVersion: 1,
  },
  EnforcementApproved: { aggregateType: 'Inspection', eventVersion: 1 },
  EnforcementRejected: { aggregateType: 'Inspection', eventVersion: 1 },
};

export const ENFORCEMENT_RECOMMENDATION_STATUSES: EnforcementRecommendationStatus[] =
  ['pending_approval', 'approved', 'rejected'];

const transitions: Record<InspectionStatus, InspectionStatus[]> = {
  scheduled: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
};

export function assertInspectionTransition(
  current: InspectionStatus,
  next: InspectionStatus,
): void {
  if (!transitions[current].includes(next))
    throw new Error(`INVALID_INSPECTION_TRANSITION:${current}:${next}`);
}

export function isInspectionResult(value: string): value is InspectionResult {
  return value === 'pass' || value === 'reminder' || value === 'needs_action';
}

export type ChecklistItem = {
  key: string;
  label?: string;
  required?: boolean;
  evidenceRequired?: boolean;
};

export type ChecklistResponse = {
  key: string;
  value: string;
};

export type ChecklistFindingEvidence = {
  checklistKey: string;
  evidenceIds: string[];
};

export function assertChecklistComplete(
  items: ChecklistItem[],
  responses: ChecklistResponse[],
): void {
  const responseByKey = new Map(
    responses.map((response) => [response.key, response.value.trim()]),
  );
  const missing = items
    .filter((item) => item.required)
    .find((item) => !responseByKey.get(item.key));
  if (missing) throw new Error(`CHECKLIST_ITEM_REQUIRED:${missing.key}`);
}

export function assertChecklistEvidence(
  items: ChecklistItem[],
  responses: ChecklistResponse[],
  findings: ChecklistFindingEvidence[],
): void {
  const answered = new Set(responses.map((response) => response.key));
  const evidenceCount = new Map<string, number>();
  for (const finding of findings) {
    evidenceCount.set(
      finding.checklistKey,
      (evidenceCount.get(finding.checklistKey) ?? 0) +
        finding.evidenceIds.length,
    );
  }
  const missing = items.find(
    (item) =>
      item.evidenceRequired &&
      answered.has(item.key) &&
      !(evidenceCount.get(item.key) ?? 0),
  );
  if (missing) throw new Error(`CHECKLIST_EVIDENCE_REQUIRED:${missing.key}`);
}
