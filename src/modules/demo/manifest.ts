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
  return { ok: true };
}
