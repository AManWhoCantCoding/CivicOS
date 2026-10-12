import {
  DEMO_LIVE_CLEANUP_POLICIES,
  DEMO_LIVE_IDEMPOTENCY_STRATEGIES,
  DEMO_LIVE_REPLAY_POLICIES,
  DEMO_MANIFEST_VERSION,
  DEMO_MUTATION_CLASSES,
  type DemoLiveMutationPolicy,
} from './manifest';
import type { DemoExecutor, DemoExecutorStep } from './runner';
import {
  createWebActionExecutor,
  type DemoWebEnvironment,
} from './web-actions';

export type LiveMutationPolicy = DemoLiveMutationPolicy;

export type LiveMutationPreflightInput = {
  demoModeEnabled: boolean;
  targetName: string;
  surface: string;
  mutationClass: string;
  action: string;
  manifestVersion: string;
  policy?: LiveMutationPolicy | null;
  isReplay?: boolean;
};

export type LiveMutationDecision =
  { ok: true; reason: 'LIVE_MUTATION_READY' } | { ok: false; reason: string };

const UNSAFE_FIXTURE = [
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

function hasUnsafeFixture(value: string): boolean {
  return UNSAFE_FIXTURE.some((pattern) => pattern.test(value));
}

function isSafeFixtureRef(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(trimmed)) return false;
  if (hasUnsafeFixture(trimmed)) return false;
  return true;
}

// Pure fail-closed policy seam: every missing prerequisite blocks with a
// safe reason code. No best-effort default is allowed.
export function evaluateLiveMutation(
  input: LiveMutationPreflightInput,
): LiveMutationDecision {
  if (
    typeof input.manifestVersion !== 'string' ||
    input.manifestVersion.trim() !== DEMO_MANIFEST_VERSION
  ) {
    return { ok: false, reason: 'LIVE_MUTATION_BLOCKED_VERSION' };
  }
  if (!input.demoModeEnabled) {
    return { ok: false, reason: 'LIVE_MUTATION_BLOCKED_MODE' };
  }
  if (
    typeof input.targetName !== 'string' ||
    input.targetName.trim() !== 'civicos_demo'
  ) {
    return { ok: false, reason: 'LIVE_MUTATION_BLOCKED_TARGET' };
  }
  if (typeof input.surface !== 'string' || input.surface.trim() !== 'web') {
    return { ok: false, reason: 'LIVE_MUTATION_BLOCKED_SURFACE' };
  }
  if (
    typeof input.mutationClass !== 'string' ||
    !(DEMO_MUTATION_CLASSES as readonly string[]).includes(
      input.mutationClass.trim(),
    ) ||
    input.mutationClass.trim() === 'none'
  ) {
    return { ok: false, reason: 'LIVE_MUTATION_BLOCKED_CLASS' };
  }
  if (typeof input.action !== 'string' || input.action.trim() !== 'submit') {
    return { ok: false, reason: 'LIVE_MUTATION_BLOCKED_ACTION' };
  }
  const policy = input.policy;
  if (!policy || typeof policy !== 'object') {
    return { ok: false, reason: 'LIVE_MUTATION_BLOCKED_POLICY' };
  }
  if (!isSafeFixtureRef(policy.fixtureRef)) {
    return { ok: false, reason: 'LIVE_MUTATION_BLOCKED_FIXTURE' };
  }
  if (
    typeof policy.idempotencyStrategy !== 'string' ||
    !(DEMO_LIVE_IDEMPOTENCY_STRATEGIES as readonly string[]).includes(
      policy.idempotencyStrategy.trim(),
    )
  ) {
    return { ok: false, reason: 'LIVE_MUTATION_BLOCKED_IDEMPOTENCY' };
  }
  if (
    typeof policy.replay !== 'string' ||
    !(DEMO_LIVE_REPLAY_POLICIES as readonly string[]).includes(
      policy.replay.trim(),
    )
  ) {
    return { ok: false, reason: 'LIVE_MUTATION_BLOCKED_REPLAY' };
  }
  if (input.isReplay === true && policy.replay.trim() !== 'safe') {
    return { ok: false, reason: 'LIVE_MUTATION_BLOCKED_REPLAY' };
  }
  if (
    typeof policy.cleanup !== 'string' ||
    !(DEMO_LIVE_CLEANUP_POLICIES as readonly string[]).includes(
      policy.cleanup.trim(),
    )
  ) {
    return { ok: false, reason: 'LIVE_MUTATION_BLOCKED_CLEANUP' };
  }
  return { ok: true, reason: 'LIVE_MUTATION_READY' };
}

export type LiveMutationGuard = {
  demoModeEnabled: boolean;
  targetName: string;
  surface: string;
  mutationClass: string;
  manifestVersion: string;
  policy?: LiveMutationPolicy | null;
};

function settledOf(outcome: unknown): boolean {
  if (typeof outcome === 'string') return outcome === 'settled';
  if (typeof outcome === 'object' && outcome !== null) {
    return (outcome as { status?: unknown }).status === 'settled';
  }
  return false;
}

// Wraps the existing web action adapter for mutation scenes. Read-only
// manifests and non-submit preparation steps pass straight through; only an
// explicit visible submit for a non-`none` mutation class is preflighted,
// and a commit is recorded only after the delegated submit settles.
export function createLiveMutationExecutor(options: {
  env?: DemoWebEnvironment;
  guard: LiveMutationGuard;
  inner?: DemoExecutor;
}): DemoExecutor & { hasCommittedMutation: () => boolean } {
  const inner = options.inner ?? createWebActionExecutor(options.env);
  let committed = false;

  const executor = (async (step: DemoExecutorStep) => {
    const mutationClass =
      typeof options.guard.mutationClass === 'string'
        ? options.guard.mutationClass.trim()
        : '';
    const action = typeof step.action === 'string' ? step.action.trim() : '';
    if (mutationClass === 'none' || action !== 'submit') {
      const outcome = await inner(step);
      return outcome;
    }
    const decision = evaluateLiveMutation({
      demoModeEnabled: options.guard.demoModeEnabled,
      targetName: options.guard.targetName,
      surface: options.guard.surface,
      mutationClass: options.guard.mutationClass,
      action: step.action,
      manifestVersion: options.guard.manifestVersion,
      policy: options.guard.policy ?? null,
    });
    if (!decision.ok) {
      return { status: 'blocked' as const, reason: decision.reason };
    }
    const outcome = await inner(step);
    if (settledOf(outcome)) committed = true;
    return outcome;
  }) as DemoExecutor & { hasCommittedMutation: () => boolean };

  executor.hasCommittedMutation = () => committed;
  return executor;
}
