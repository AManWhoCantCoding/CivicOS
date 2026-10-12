export const DEMO_MANIFEST_VERSION = '1';

export const DEMO_ACTIONS = [
  'navigate',
  'click',
  'fill',
  'open-select',
  'choose-option',
  'check',
  'submit',
  'wait-ready',
  'assert-state',
  'native-tap',
  'pause',
] as const;

export type DemoAction = (typeof DEMO_ACTIONS)[number];

export const DEMO_RUN_STATES = [
  'idle',
  'preflight',
  'authenticating',
  'running',
  'paused',
  'blocked',
  'failed',
  'stopping',
  'cancelled',
  'completed',
  'completed-with-cleanup-pending',
] as const;

export type DemoRunState = (typeof DEMO_RUN_STATES)[number];

export const DEMO_SURFACES = ['web', 'mobile'] as const;

export const DEMO_MUTATION_CLASSES = [
  'create',
  'update',
  'approve',
  'reject',
  'close',
  'assign',
  'none',
] as const;

// T-007 live-mutation vocabulary. The runner never invents an idempotency
// key: only the existing domain dedupe/unique/version strategies below are
// accepted, replay is explicit safe/blocked, and cleanup stays operator-owned.
export const DEMO_LIVE_IDEMPOTENCY_STRATEGIES = [
  'existing-idempotency-key',
  'existing-unique-constraint',
  'existing-version-check',
] as const;

export const DEMO_LIVE_REPLAY_POLICIES = ['safe', 'blocked'] as const;

export const DEMO_LIVE_CLEANUP_POLICIES = ['operator'] as const;

export type DemoLiveMutationPolicy = {
  fixtureRef: string;
  idempotencyStrategy: string;
  replay: string;
  cleanup: string;
};

export type DemoManifestStep = {
  id: string;
  action: string;
  expectedState?: string;
  detail?: string;
};

export type DemoManifest = {
  version: string;
  scenarioId: string;
  sceneId: string;
  surface: string;
  personaAlias: string;
  precondition: string;
  explanation: string;
  expectedState: string;
  mutationClass: string;
  cleanupPolicy: string;
  blockedPolicy: string;
  // Optional non-persistent T-007 live-mutation metadata. Read-only scenes
  // (`mutationClass: 'none'`) must not carry it; mutation scenes may carry
  // it, and the runner preflight still blocks when it is absent.
  liveMutationPolicy?: DemoLiveMutationPolicy;
  steps: DemoManifestStep[];
};

export type DemoManifestValidation =
  { ok: true } | { ok: false; reason: string };

const EXPECTED_STATE_PATTERN = /^[a-z][a-z0-9-]*$/;

const UNSAFE_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /credential/i,
  /postgresql:\/\//i,
  /<script/i,
  /javascript:/i,
  /eval\s*\(/i,
  /on\w+\s*=/i,
];

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

function containsUnsafeText(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return UNSAFE_PATTERNS.some((pattern) => pattern.test(value));
}

function scanUnsafe(manifest: DemoManifest): boolean {
  const texts = [
    manifest.precondition,
    manifest.explanation,
    manifest.expectedState,
    manifest.cleanupPolicy,
    manifest.blockedPolicy,
    manifest.personaAlias,
  ];
  if (texts.some(containsUnsafeText)) return true;
  return manifest.steps.some(
    (step) =>
      containsUnsafeText(step.id) ||
      containsUnsafeText(step.expectedState ?? '') ||
      containsUnsafeText(step.detail ?? ''),
  );
}

export function validateDemoManifest(input: unknown): DemoManifestValidation {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, reason: 'DEMO_MANIFEST_INVALID_SHAPE' };
  }
  const manifest = input as DemoManifest;
  if (isBlank(manifest.version)) {
    return { ok: false, reason: 'DEMO_MANIFEST_VERSION_MISSING' };
  }
  if (manifest.version.trim() !== DEMO_MANIFEST_VERSION) {
    return { ok: false, reason: 'DEMO_MANIFEST_VERSION_UNSUPPORTED' };
  }
  if (isBlank(manifest.scenarioId) || isBlank(manifest.sceneId)) {
    return { ok: false, reason: 'DEMO_MANIFEST_ID_MISSING' };
  }
  if (
    typeof manifest.surface !== 'string' ||
    !(DEMO_SURFACES as readonly string[]).includes(manifest.surface.trim())
  ) {
    return { ok: false, reason: 'DEMO_MANIFEST_UNKNOWN_SURFACE' };
  }
  if (isBlank(manifest.personaAlias)) {
    return { ok: false, reason: 'DEMO_MANIFEST_ID_MISSING' };
  }
  if (
    typeof manifest.mutationClass !== 'string' ||
    !(DEMO_MUTATION_CLASSES as readonly string[]).includes(
      manifest.mutationClass.trim(),
    )
  ) {
    return { ok: false, reason: 'DEMO_MANIFEST_UNKNOWN_MUTATION_CLASS' };
  }
  for (const field of [
    manifest.precondition,
    manifest.explanation,
    manifest.cleanupPolicy,
    manifest.blockedPolicy,
  ]) {
    if (isBlank(field)) {
      return { ok: false, reason: 'DEMO_MANIFEST_FIELD_MISSING' };
    }
  }
  if (
    isBlank(manifest.expectedState) ||
    !EXPECTED_STATE_PATTERN.test(manifest.expectedState.trim()) ||
    !(DEMO_RUN_STATES as readonly string[]).includes(
      manifest.expectedState.trim(),
    )
  ) {
    return { ok: false, reason: 'DEMO_MANIFEST_UNKNOWN_EXPECTED_STATE' };
  }
  if (!Array.isArray(manifest.steps) || manifest.steps.length === 0) {
    return { ok: false, reason: 'DEMO_MANIFEST_STEPS_EMPTY' };
  }
  const seen = new Set<string>();
  for (const step of manifest.steps) {
    if (typeof step !== 'object' || step === null || isBlank(step.id)) {
      return { ok: false, reason: 'DEMO_MANIFEST_ID_MISSING' };
    }
    const id = step.id.trim();
    if (seen.has(id)) {
      return { ok: false, reason: 'DEMO_MANIFEST_DUPLICATE_STEP_ID' };
    }
    seen.add(id);
    if (
      typeof step.action !== 'string' ||
      !(DEMO_ACTIONS as readonly string[]).includes(step.action.trim())
    ) {
      return { ok: false, reason: 'DEMO_MANIFEST_UNKNOWN_ACTION' };
    }
    if (
      step.expectedState !== undefined &&
      (isBlank(step.expectedState) ||
        !EXPECTED_STATE_PATTERN.test(step.expectedState.trim()) ||
        !(DEMO_RUN_STATES as readonly string[]).includes(
          step.expectedState.trim(),
        ))
    ) {
      return { ok: false, reason: 'DEMO_MANIFEST_UNKNOWN_EXPECTED_STATE' };
    }
  }
  if (scanUnsafe(manifest)) {
    return { ok: false, reason: 'DEMO_MANIFEST_UNSAFE_CONTENT' };
  }
  const policyValidation = validateLiveMutationPolicy(
    manifest.mutationClass,
    manifest.liveMutationPolicy,
  );
  if (!policyValidation.ok) return policyValidation;
  return { ok: true };
}

function validateLiveMutationPolicy(
  mutationClass: string,
  policy: DemoLiveMutationPolicy | undefined,
): DemoManifestValidation {
  const readOnly = mutationClass.trim() === 'none';
  if (policy === undefined) return { ok: true };
  if (readOnly) return { ok: false, reason: 'DEMO_MANIFEST_INVALID_POLICY' };
  if (typeof policy !== 'object' || policy === null) {
    return { ok: false, reason: 'DEMO_MANIFEST_INVALID_POLICY' };
  }
  if (
    typeof policy.fixtureRef !== 'string' ||
    !isSafeFixtureRef(policy.fixtureRef)
  ) {
    return { ok: false, reason: 'DEMO_MANIFEST_INVALID_POLICY' };
  }
  if (
    typeof policy.idempotencyStrategy !== 'string' ||
    !(DEMO_LIVE_IDEMPOTENCY_STRATEGIES as readonly string[]).includes(
      policy.idempotencyStrategy.trim(),
    )
  ) {
    return { ok: false, reason: 'DEMO_MANIFEST_INVALID_POLICY' };
  }
  if (
    typeof policy.replay !== 'string' ||
    !(DEMO_LIVE_REPLAY_POLICIES as readonly string[]).includes(
      policy.replay.trim(),
    )
  ) {
    return { ok: false, reason: 'DEMO_MANIFEST_INVALID_POLICY' };
  }
  if (
    typeof policy.cleanup !== 'string' ||
    !(DEMO_LIVE_CLEANUP_POLICIES as readonly string[]).includes(
      policy.cleanup.trim(),
    )
  ) {
    return { ok: false, reason: 'DEMO_MANIFEST_INVALID_POLICY' };
  }
  if (containsUnsafeText(policy.fixtureRef)) {
    return { ok: false, reason: 'DEMO_MANIFEST_INVALID_POLICY' };
  }
  return { ok: true };
}

function isSafeFixtureRef(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(trimmed)) return false;
  return true;
}
