import type { DemoRunState } from './manifest';

export const DEMO_EVIDENCE_STATUSES = [
  'blocked',
  'failed',
  'cancelled',
  'completed',
  'completed-with-cleanup-pending',
] as const;

export type DemoEvidenceStatus = (typeof DEMO_EVIDENCE_STATUSES)[number];

export type DemoEvidence = {
  runId: string;
  sceneId: string;
  stepId: string;
  status: DemoEvidenceStatus;
  durationMs: number;
  reason: string;
};

type DemoEvidenceInput = Record<string, unknown>;

const SAFE_REASONS = new Set([
  'DEMO_CLEANUP_OPERATOR_HANDOFF',
  'DEMO_COMPLETED_NO_MUTATION',
  'DEMO_STATE_UNKNOWN',
  'DEMO_MANIFEST_INVALID_SHAPE',
  'DEMO_MANIFEST_VERSION_MISSING',
  'DEMO_MANIFEST_VERSION_UNSUPPORTED',
  'DEMO_MANIFEST_ID_MISSING',
  'DEMO_MANIFEST_UNKNOWN_SURFACE',
  'DEMO_MANIFEST_UNKNOWN_MUTATION_CLASS',
  'DEMO_MANIFEST_FIELD_MISSING',
  'DEMO_MANIFEST_UNKNOWN_EXPECTED_STATE',
  'DEMO_MANIFEST_STEPS_EMPTY',
  'DEMO_MANIFEST_DUPLICATE_STEP_ID',
  'DEMO_MANIFEST_UNKNOWN_ACTION',
  'DEMO_MANIFEST_UNSAFE_CONTENT',
  'DEMO_MANIFEST_INVALID_POLICY',
  'DEMO_STEP_SETTLED',
  'DEMO_STEP_BLOCKED',
  'DEMO_STEP_FAILED',
  'SELECT_NOT_OPEN',
  'DEMO_REPLAY_REFUSED',
  'DEMO_MODE_DISABLED',
  'DEMO_TARGET_READY',
  'DEMO_STATE_LOADING',
  'DEMO_STATE_EMPTY',
  'DEMO_STATE_VALIDATION',
  'DEMO_STATE_FORBIDDEN',
  'DEMO_STATE_OFFLINE',
  'DEMO_STATE_ERROR',
  'DEMO_STATE_MASKED',
  'DEMO_STATE_SIMULATED',
  'DEMO_DEPENDENCY_UNAVAILABLE',
  'DEMO_STEP_SELECT_NOT_OPEN',
  'DEMO_STEP_TARGET_NOT_FOUND',
  'DEMO_STEP_TARGET_AMBIGUOUS',
  'DEMO_STEP_TARGET_HIDDEN',
  'DEMO_STEP_TARGET_DISABLED',
  'DEMO_STEP_INVALID_DESCRIPTOR',
  'DEMO_STEP_INTERACTION_UNAVAILABLE',
  'DEMO_STEP_OPTION_NOT_FOUND',
  'DEMO_STEP_OPTION_DISABLED',
  'DEMO_STEP_READINESS_TIMEOUT',
  'DEMO_STEP_ASSERT_MISMATCH',
  'DEMO_STEP_FORBIDDEN_CONTROL',
  'LIVE_MUTATION_BLOCKED_MODE',
  'LIVE_MUTATION_BLOCKED_TARGET',
  'LIVE_MUTATION_BLOCKED_SURFACE',
  'LIVE_MUTATION_BLOCKED_CLASS',
  'LIVE_MUTATION_BLOCKED_ACTION',
  'LIVE_MUTATION_BLOCKED_POLICY',
  'LIVE_MUTATION_BLOCKED_FIXTURE',
  'LIVE_MUTATION_BLOCKED_IDEMPOTENCY',
  'LIVE_MUTATION_BLOCKED_REPLAY',
  'LIVE_MUTATION_BLOCKED_CLEANUP',
  'LIVE_MUTATION_BLOCKED_VERSION',
]);

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_DURATION_MS = 86_400_000;

function safeId(value: unknown, fallback: string): string {
  return typeof value === 'string' && SAFE_ID.test(value.trim())
    ? value.trim()
    : fallback;
}

function safeDuration(value: unknown): number {
  if (value === Number.POSITIVE_INFINITY) return MAX_DURATION_MS;
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.min(MAX_DURATION_MS, Math.max(0, Math.trunc(value)));
}

function safeStatus(value: unknown): DemoEvidenceStatus {
  return (DEMO_EVIDENCE_STATUSES as readonly unknown[]).includes(value)
    ? (value as DemoEvidenceStatus)
    : 'failed';
}

function safeReason(value: unknown): string {
  return typeof value === 'string' && SAFE_REASONS.has(value)
    ? value
    : 'DEMO_STATE_UNKNOWN';
}

export function serializeDemoEvidence(input: DemoEvidenceInput): DemoEvidence {
  return {
    runId: safeId(input.runId, 'demo-run-unknown'),
    sceneId: safeId(input.sceneId, 'demo-scene-unknown'),
    stepId: safeId(input.stepId, 'demo-step-unknown'),
    status: safeStatus(input.status),
    durationMs: safeDuration(input.durationMs),
    reason: safeReason(input.reason),
  };
}

export function mapDemoTerminalEvidence(input: {
  runId: unknown;
  sceneId: unknown;
  stepId: unknown;
  terminalState: DemoRunState;
  committedMutation: boolean;
  durationMs: unknown;
  reason?: unknown;
}): DemoEvidence {
  const cleanupPending =
    input.committedMutation ||
    input.terminalState === 'completed-with-cleanup-pending';
  const status: DemoEvidenceStatus = cleanupPending
    ? 'completed-with-cleanup-pending'
    : input.terminalState === 'completed'
      ? 'completed'
      : safeStatus(input.terminalState);
  const reason = cleanupPending
    ? 'DEMO_CLEANUP_OPERATOR_HANDOFF'
    : status === 'completed'
      ? 'DEMO_COMPLETED_NO_MUTATION'
      : input.reason;
  return serializeDemoEvidence({
    runId: input.runId,
    sceneId: input.sceneId,
    stepId: input.stepId,
    status,
    durationMs: input.durationMs,
    reason,
  });
}
