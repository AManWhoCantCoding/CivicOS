/** Inspection SLA thresholds use continuous elapsed time, including weekends and holidays. */
export const INSPECTION_SLA = {
  completion: {
    kind: 'inspection_completion_7d',
    durationMs: 7 * 24 * 60 * 60 * 1000,
  },
  recommendation: {
    kind: 'inspection_recommendation_7d',
    durationMs: 7 * 24 * 60 * 60 * 1000,
  },
} as const;
