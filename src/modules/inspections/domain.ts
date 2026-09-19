import type { InspectionResult, InspectionStatus } from './contracts';

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
  required?: boolean;
};

export type ChecklistResponse = {
  key: string;
  value: string;
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
