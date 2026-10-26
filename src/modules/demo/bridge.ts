import { DEMO_ACTIONS, DEMO_MANIFEST_VERSION } from './manifest';

// Pure JSON-compatible local/demo bridge seam (T-008). The bridge transports
// only safe scene/step/action descriptors and safe result states; it never
// owns infrastructure, credentials, raw payloads or navigation mapping.

export const BRIDGE_MODE = 'LIVE_DEMO' as const;

export const BRIDGE_TARGET = 'civicos' as const;

export const BRIDGE_ORIGINS = ['local', 'demo'] as const;

export type BridgeOrigin = (typeof BRIDGE_ORIGINS)[number];

export const BRIDGE_SURFACE = 'mobile' as const;

const BRIDGE_COMMAND_KEYS = [
  'mode',
  'target',
  'origin',
  'manifestVersion',
  'sceneId',
  'stepId',
  'action',
  'surface',
] as const;

export type BridgeCommand = {
  mode: typeof BRIDGE_MODE;
  target: typeof BRIDGE_TARGET;
  origin: BridgeOrigin;
  manifestVersion: string;
  sceneId: string;
  stepId: string;
  action: string;
  surface: typeof BRIDGE_SURFACE;
};

export type BridgeValidation =
  { ok: true; command: BridgeCommand } | { ok: false; reason: string };

export const BRIDGE_RESULT_STATUSES = ['ready', 'blocked'] as const;

export type BridgeResultStatus = (typeof BRIDGE_RESULT_STATUSES)[number];

export const BRIDGE_RESULT_STATES = [
  'settled',
  'blocked',
  'failed',
  'cancelled',
] as const;

export type BridgeResultState = (typeof BRIDGE_RESULT_STATES)[number];

export const BRIDGE_SAFE_REASONS: ReadonlySet<string> = new Set([
  'DEMO_STEP_SETTLED',
  'DEMO_STEP_BLOCKED',
  'DEMO_STEP_FAILED',
  'DEMO_STEP_INVALID_DESCRIPTOR',
  'DEMO_STEP_INTERACTION_UNAVAILABLE',
  'DEMO_STEP_READINESS_TIMEOUT',
  'DEMO_STEP_ASSERT_MISMATCH',
  'BRIDGE_READY',
  'BRIDGE_BLOCKED',
  'BRIDGE_FAILED',
  'BRIDGE_CANCELLED',
]);

export const BRIDGE_MAX_DURATION_MS = 300000;

export type BridgeResult = {
  sceneId: string;
  stepId: string;
  action: string;
  status: BridgeResultStatus;
  state: BridgeResultState;
  reason: string;
  durationMs: number;
};

export type BridgeResultValidation =
  { ok: true; result: BridgeResult } | { ok: false; reason: string };

export type BridgeTransport = (
  command: BridgeCommand,
) => BridgeResult | Promise<BridgeResult>;

// Keys that must never cross the seam: raw bodies, secrets, credentials,
// location data, PII and anything outside the allowlisted descriptor.
const FORBIDDEN_BRIDGE_KEYS: ReadonlySet<string> = new Set([
  'body',
  'payload',
  'rawBody',
  'rawPayload',
  'responseBody',
  'password',
  'passwd',
  'token',
  'cookie',
  'cookies',
  'credential',
  'credentials',
  'secret',
  'geometry',
  'coordinates',
  'latitude',
  'longitude',
  'script',
  'html',
  'databaseUrl',
  'databaseURL',
  'email',
  'phone',
  'phoneNumber',
  'address',
  'cccd',
  'cmnd',
  'authorization',
]);

const BRIDGE_RESULT_KEYS = [
  'sceneId',
  'stepId',
  'action',
  'status',
  'state',
  'reason',
  'durationMs',
] as const;

const UNSAFE_VALUE_PATTERNS = [
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

function hasUnsafeValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

function isSafeId(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(trimmed)) return false;
  return !hasUnsafeValue(trimmed);
}

function rejectExtraKeys(input: Record<string, unknown>): string | null {
  for (const key of Object.keys(input)) {
    if (
      !(BRIDGE_COMMAND_KEYS as readonly string[]).includes(key) ||
      FORBIDDEN_BRIDGE_KEYS.has(key)
    ) {
      return 'BRIDGE_UNSAFE_CONTENT';
    }
  }
  for (const value of Object.values(input)) {
    if (hasUnsafeValue(value)) return 'BRIDGE_UNSAFE_CONTENT';
  }
  return null;
}

export function validateBridgeCommand(input: unknown): BridgeValidation {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, reason: 'BRIDGE_INVALID_SHAPE' };
  }
  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.target !== 'string' ||
    candidate.target.trim() !== BRIDGE_TARGET
  ) {
    return { ok: false, reason: 'BRIDGE_FORBIDDEN_TARGET' };
  }
  if (
    typeof candidate.origin !== 'string' ||
    !(BRIDGE_ORIGINS as readonly string[]).includes(candidate.origin.trim())
  ) {
    return { ok: false, reason: 'BRIDGE_FORBIDDEN_ORIGIN' };
  }
  if (typeof candidate.mode !== 'string' || candidate.mode !== BRIDGE_MODE) {
    return { ok: false, reason: 'BRIDGE_STALE_MODE' };
  }
  if (
    typeof candidate.manifestVersion !== 'string' ||
    candidate.manifestVersion.trim() !== DEMO_MANIFEST_VERSION
  ) {
    return { ok: false, reason: 'BRIDGE_VERSION_UNSUPPORTED' };
  }
  if (typeof candidate.surface !== 'string' || candidate.surface !== 'mobile') {
    return { ok: false, reason: 'BRIDGE_UNSUPPORTED_SURFACE' };
  }
  if (!isSafeId(candidate.sceneId) || !isSafeId(candidate.stepId)) {
    if (isBlank(candidate.sceneId) || isBlank(candidate.stepId)) {
      return { ok: false, reason: 'BRIDGE_ID_MISSING' };
    }
    return { ok: false, reason: 'BRIDGE_UNSAFE_CONTENT' };
  }
  if (
    typeof candidate.action !== 'string' ||
    !(DEMO_ACTIONS as readonly string[]).includes(candidate.action.trim())
  ) {
    return { ok: false, reason: 'BRIDGE_UNKNOWN_ACTION' };
  }
  const unsafe = rejectExtraKeys(candidate);
  if (unsafe !== null) return { ok: false, reason: unsafe };
  return {
    ok: true,
    command: {
      mode: BRIDGE_MODE,
      target: BRIDGE_TARGET,
      origin: candidate.origin.trim() as BridgeOrigin,
      manifestVersion: DEMO_MANIFEST_VERSION,
      sceneId: (candidate.sceneId as string).trim(),
      stepId: (candidate.stepId as string).trim(),
      action: (candidate.action as string).trim(),
      surface: BRIDGE_SURFACE,
    },
  };
}

// Narrow JSON serialization: only the allowlisted descriptor keys leave the
// seam, so secrets or raw payloads can never be echoed by construction.
export function serializeBridgeCommand(command: unknown): string {
  const validated = validateBridgeCommand(command);
  if (!validated.ok) throw new Error(validated.reason);
  return JSON.stringify({
    mode: validated.command.mode,
    target: validated.command.target,
    origin: validated.command.origin,
    manifestVersion: validated.command.manifestVersion,
    sceneId: validated.command.sceneId,
    stepId: validated.command.stepId,
    action: validated.command.action,
    surface: validated.command.surface,
  });
}

export function normalizeBridgeResult(input: unknown): BridgeResultValidation {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, reason: 'BRIDGE_RESULT_INVALID_SHAPE' };
  }
  const candidate = input as Record<string, unknown>;
  for (const key of Object.keys(candidate)) {
    if (
      FORBIDDEN_BRIDGE_KEYS.has(key) ||
      !(BRIDGE_RESULT_KEYS as readonly string[]).includes(key)
    ) {
      return { ok: false, reason: 'BRIDGE_UNSAFE_CONTENT' };
    }
  }
  if (!isSafeId(candidate.sceneId) || !isSafeId(candidate.stepId)) {
    return { ok: false, reason: 'BRIDGE_RESULT_INVALID_SHAPE' };
  }
  if (
    typeof candidate.action !== 'string' ||
    !(DEMO_ACTIONS as readonly string[]).includes(candidate.action.trim())
  ) {
    return { ok: false, reason: 'BRIDGE_RESULT_INVALID_SHAPE' };
  }
  if (
    typeof candidate.status !== 'string' ||
    !(BRIDGE_RESULT_STATUSES as readonly string[]).includes(
      candidate.status.trim(),
    )
  ) {
    return { ok: false, reason: 'BRIDGE_RESULT_UNKNOWN_STATUS' };
  }
  if (
    typeof candidate.state !== 'string' ||
    !(BRIDGE_RESULT_STATES as readonly string[]).includes(
      candidate.state.trim(),
    )
  ) {
    return { ok: false, reason: 'BRIDGE_RESULT_UNKNOWN_STATE' };
  }
  if (
    typeof candidate.reason !== 'string' ||
    !/^[A-Z][A-Z0-9_]{1,63}$/.test(candidate.reason) ||
    !BRIDGE_SAFE_REASONS.has(candidate.reason)
  ) {
    return { ok: false, reason: 'BRIDGE_RESULT_UNKNOWN_REASON' };
  }
  if (
    typeof candidate.durationMs !== 'number' ||
    !Number.isInteger(candidate.durationMs) ||
    candidate.durationMs < 0 ||
    candidate.durationMs > BRIDGE_MAX_DURATION_MS
  ) {
    return { ok: false, reason: 'BRIDGE_RESULT_DURATION_OUT_OF_BOUNDS' };
  }
  for (const value of Object.values(candidate)) {
    if (hasUnsafeValue(value))
      return { ok: false, reason: 'BRIDGE_UNSAFE_CONTENT' };
  }
  return {
    ok: true,
    result: {
      sceneId: (candidate.sceneId as string).trim(),
      stepId: (candidate.stepId as string).trim(),
      action: (candidate.action as string).trim(),
      status: candidate.status.trim() as BridgeResultStatus,
      state: candidate.state.trim() as BridgeResultState,
      reason: candidate.reason,
      durationMs: candidate.durationMs,
    },
  };
}

export function serializeBridgeResult(result: BridgeResult): string {
  const normalized = normalizeBridgeResult(result);
  if (!normalized.ok) throw new Error(normalized.reason);
  return JSON.stringify(normalized.result);
}

// Injected, non-owning transport seam. Validation runs before the callback,
// so a rejected command never causes a side effect.
export async function sendBridgeCommand(input: {
  command: unknown;
  transport: BridgeTransport;
}): Promise<BridgeResultValidation | { ok: false; reason: string }> {
  const validated = validateBridgeCommand(input.command);
  if (!validated.ok) return validated;
  let raw: BridgeResult;
  try {
    raw = await input.transport(validated.command);
  } catch {
    return { ok: false, reason: 'BRIDGE_TRANSPORT_FAILED' };
  }
  return normalizeBridgeResult(raw);
}
