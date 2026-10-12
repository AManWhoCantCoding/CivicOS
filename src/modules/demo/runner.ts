import {
  validateDemoManifest,
  type DemoManifest,
  type DemoManifestStep,
  type DemoRunState,
} from './manifest';
import { evaluateLiveMutation } from './live-mutation';

export type { DemoRunState } from './manifest';

export const DEMO_PACING_MS = 3000;

export const DEMO_REPLAY_REFUSED = 'DEMO_REPLAY_REFUSED';

// Run-level events (e.g. manifest preflight) carry no step action, so they
// reuse a closed vocabulary member instead of inventing an action.
const RUN_LEVEL_EVENT_ACTION = 'assert-state';

export type DemoStepOutcome = 'settled' | 'blocked' | 'failed';

export type DemoStepEvent = {
  stepId: string;
  index: number;
  action: string;
  status: DemoStepOutcome;
  reason: string;
};

export type DemoTimerHandle = unknown;

export type DemoScheduler = {
  schedule: (delayMs: number, callback: () => void) => DemoTimerHandle;
  cancel: (handle: DemoTimerHandle) => void;
};

export type DemoExecutorStep = {
  id: string;
  action: string;
  index: number;
  detail?: string;
  expectedState?: string;
};

export type DemoExecutorResult =
  DemoStepOutcome | { status: DemoStepOutcome; reason?: string };

export type DemoExecutor = (
  step: DemoExecutorStep,
) => DemoExecutorResult | Promise<DemoExecutorResult>;

export type DemoRunnerOptions = {
  manifest: unknown;
  scheduler?: DemoScheduler;
  executor: DemoExecutor;
  onEvent?: (event: DemoStepEvent) => void;
  // Optional T-007 mutation prerequisites. Absent means fail-closed: any
  // submit for a non-`none` mutation class blocks before the executor runs.
  liveMutation?: {
    demoModeEnabled?: boolean;
    targetName?: string;
  };
};

const LEGAL_TRANSITIONS: Record<DemoRunState, readonly DemoRunState[]> = {
  idle: ['preflight'],
  preflight: ['authenticating', 'blocked', 'failed'],
  authenticating: ['running', 'blocked', 'failed'],
  running: ['paused', 'blocked', 'failed', 'stopping', 'completed'],
  paused: ['running', 'stopping'],
  blocked: [],
  failed: [],
  stopping: ['cancelled', 'completed-with-cleanup-pending'],
  cancelled: [],
  completed: [],
  'completed-with-cleanup-pending': [],
};

const TERMINAL_STATES: readonly DemoRunState[] = [
  'blocked',
  'failed',
  'cancelled',
  'completed',
  'completed-with-cleanup-pending',
];

export function canTransition(from: DemoRunState, to: DemoRunState): boolean {
  return LEGAL_TRANSITIONS[from]?.includes(to) ?? false;
}

const defaultScheduler: DemoScheduler = {
  schedule: (delayMs, callback) => setTimeout(callback, delayMs),
  cancel: (handle) => clearTimeout(handle as NodeJS.Timeout),
};

function toSafeOutcome(outcome: unknown): DemoStepOutcome {
  if (typeof outcome === 'object' && outcome !== null) {
    const status = (outcome as { status?: unknown }).status;
    if (status === 'settled' || status === 'blocked') return status;
    return 'failed';
  }
  if (outcome === 'settled' || outcome === 'blocked') return outcome;
  return 'failed';
}

// Allowlisted executor reasons that may reach step events. Anything else
// falls back to the closed runner vocabulary so raw errors never leak.
const SAFE_EXECUTOR_REASONS: ReadonlySet<string> = new Set([
  'SELECT_NOT_OPEN',
  'DEMO_STEP_SETTLED',
  'DEMO_STEP_BLOCKED',
  'DEMO_STEP_FAILED',
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

function toSafeExecutorReason(outcome: unknown): string | null {
  if (typeof outcome !== 'object' || outcome === null) return null;
  const reason = (outcome as { reason?: unknown }).reason;
  if (typeof reason !== 'string') return null;
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(reason)) return null;
  return SAFE_EXECUTOR_REASONS.has(reason) ? reason : null;
}

function outcomeReason(
  status: DemoStepOutcome,
  step: DemoManifestStep,
): string {
  if (status === 'blocked') {
    const needsSelectOpen =
      typeof step.action === 'string' && step.action.trim() === 'choose-option';
    return needsSelectOpen ? 'SELECT_NOT_OPEN' : 'DEMO_STEP_BLOCKED';
  }
  return status === 'failed' ? 'DEMO_STEP_FAILED' : 'DEMO_STEP_SETTLED';
}

export function createDemoRunner(options: DemoRunnerOptions) {
  const scheduler = options.scheduler ?? defaultScheduler;
  const manifest = options.manifest as DemoManifest;
  let state: DemoRunState = 'idle';
  let nextIndex = 0;
  let activeTimer: DemoTimerHandle | null = null;
  let generation = 0;
  let stopped = false;
  // Set only after a policy-gated submit settles. Stop after that exposes
  // `completed-with-cleanup-pending`; the committed domain state is kept.
  let committedMutation = false;
  // True only while an explicit policy-gated submit awaits the existing
  // visible component result. Stop then waits in `stopping` instead of
  // reporting `cancelled` and losing a mutation that settles afterward.
  let inFlightMutation = false;

  function setState(next: DemoRunState): void {
    if (!canTransition(state, next)) return;
    state = next;
  }

  function emit(event: DemoStepEvent): void {
    options.onEvent?.(event);
  }

  function currentState(): DemoRunState {
    return state;
  }

  function clearTimer(): void {
    if (activeTimer !== null) {
      scheduler.cancel(activeTimer);
      activeTimer = null;
    }
  }

  function mutationPreflight(action: string, isReplay: boolean): string | null {
    if (manifest.mutationClass.trim() === 'none') return null;
    if (action.trim() !== 'submit') return null;
    const decision = evaluateLiveMutation({
      demoModeEnabled: options.liveMutation?.demoModeEnabled ?? false,
      targetName: options.liveMutation?.targetName ?? '',
      surface: manifest.surface,
      mutationClass: manifest.mutationClass,
      action,
      manifestVersion: manifest.version,
      policy: manifest.liveMutationPolicy ?? null,
      isReplay,
    });
    return decision.ok ? null : decision.reason;
  }

  async function runStep(index: number, ticket: number): Promise<void> {
    if (ticket !== generation || stopped || state !== 'running') return;
    const step = manifest.steps[index];
    if (!step) return;
    nextIndex = index;
    const preflightReason = mutationPreflight(step.action, false);
    if (preflightReason !== null) {
      nextIndex = index + 1;
      emit({
        stepId: step.id,
        index,
        action: step.action,
        status: 'blocked',
        reason: preflightReason,
      });
      clearTimer();
      setState('blocked');
      return;
    }
    let outcome: DemoStepOutcome;
    let executorReason: string | null = null;
    const gatedSubmit =
      manifest.mutationClass.trim() !== 'none' &&
      step.action.trim() === 'submit';
    if (gatedSubmit) inFlightMutation = true;
    try {
      const raw = await options.executor({
        id: step.id,
        action: step.action,
        index,
        detail: step.detail,
        expectedState: step.expectedState,
      });
      outcome = toSafeOutcome(raw);
      executorReason = toSafeExecutorReason(raw);
    } catch {
      outcome = 'failed';
    }
    if (gatedSubmit) inFlightMutation = false;
    // Record the commit as soon as the awaited component result is known
    // settled, before stale generation/state checks, so a paused or
    // stopped late result is never lost.
    if (gatedSubmit && outcome === 'settled') committedMutation = true;
    // Stop arrived while the gated submit was in flight: no next action
    // (generation already bumped, timer already cancelled), and the late
    // component result decides the terminal state honestly.
    if (stopped && currentState() === 'stopping' && gatedSubmit) {
      nextIndex = index + 1;
      emit({
        stepId: step.id,
        index,
        action: step.action,
        status: outcome,
        reason: executorReason ?? outcomeReason(outcome, step),
      });
      if (outcome === 'settled') {
        setState('completed-with-cleanup-pending');
      } else {
        setState('cancelled');
      }
      return;
    }
    // A settled gated submit that went stale another way (e.g. paused
    // mid-submit) still counts: advance past it and emit, so a later
    // resume continues with the next step instead of duplicating it.
    // Anything else stale keeps the existing drop semantics.
    if (
      gatedSubmit &&
      outcome === 'settled' &&
      (ticket !== generation || stopped || currentState() !== 'running')
    ) {
      nextIndex = index + 1;
      emit({
        stepId: step.id,
        index,
        action: step.action,
        status: outcome,
        reason: executorReason ?? outcomeReason(outcome, step),
      });
      return;
    }
    if (ticket !== generation || stopped || state !== 'running') return;
    nextIndex = index + 1;
    emit({
      stepId: step.id,
      index,
      action: step.action,
      status: outcome,
      reason: executorReason ?? outcomeReason(outcome, step),
    });
    if (outcome === 'blocked') {
      clearTimer();
      setState('blocked');
      return;
    }
    if (outcome === 'failed') {
      clearTimer();
      setState('failed');
      return;
    }
    if (index + 1 >= manifest.steps.length) {
      setState('completed');
      return;
    }
    const runTicket = generation;
    activeTimer = scheduler.schedule(DEMO_PACING_MS, () => {
      activeTimer = null;
      void runStep(index + 1, runTicket);
    });
  }

  async function start(): Promise<void> {
    if (state !== 'idle') return;
    setState('preflight');
    const validation = validateDemoManifest(options.manifest);
    if (!validation.ok) {
      emit({
        stepId: 'manifest',
        index: -1,
        action: RUN_LEVEL_EVENT_ACTION,
        status: 'blocked',
        reason: validation.reason,
      });
      setState('blocked');
      return;
    }
    setState('authenticating');
    setState('running');
    await runStep(0, generation);
  }

  return {
    getState: (): DemoRunState => state,
    getCursor: (): number => nextIndex,
    hasCommittedMutation: (): boolean => committedMutation,
    start,
    pause(): void {
      if (state !== 'running') return;
      generation += 1;
      clearTimer();
      setState('paused');
    },
    resume(): void {
      if (state !== 'paused' || activeTimer !== null) return;
      // A gated submit is still awaiting the component result: stay paused
      // so resume cannot schedule a duplicate submit. The operator retries
      // resume after the result settles.
      if (inFlightMutation) return;
      if (nextIndex >= manifest.steps.length) return;
      setState('running');
      const runTicket = generation;
      activeTimer = scheduler.schedule(DEMO_PACING_MS, () => {
        activeTimer = null;
        void runStep(nextIndex, runTicket);
      });
    },
    stop(): void {
      if (state !== 'running' && state !== 'paused') return;
      generation += 1;
      stopped = true;
      clearTimer();
      setState('stopping');
      // A gated submit still awaiting the component result finalizes this
      // `stopping` state when it settles; anything else ends synchronously
      // with no new action and no invented terminal.
      if (inFlightMutation) return;
      // A settled mutation is kept as-is: operator-owned cleanup stays
      // pending instead of a false cancel.
      setState(
        committedMutation ? 'completed-with-cleanup-pending' : 'cancelled',
      );
    },
    async replay(): Promise<void> {
      if (!TERMINAL_STATES.includes(state)) {
        throw new Error(DEMO_REPLAY_REFUSED);
      }
      const validation = validateDemoManifest(options.manifest);
      if (!validation.ok) {
        emit({
          stepId: 'manifest',
          index: -1,
          action: RUN_LEVEL_EVENT_ACTION,
          status: 'blocked',
          reason: validation.reason,
        });
        return;
      }
      // Unsafe replay is refused before any executor step; only an explicit
      // safe existing dedupe/version policy may run again.
      if (manifest.mutationClass.trim() !== 'none') {
        const replayRefusal = mutationPreflight('submit', true);
        if (replayRefusal !== null) {
          emit({
            stepId: 'replay',
            index: -1,
            action: RUN_LEVEL_EVENT_ACTION,
            status: 'blocked',
            reason: replayRefusal,
          });
          return;
        }
      }
      generation += 1;
      stopped = false;
      clearTimer();
      nextIndex = 0;
      committedMutation = false;
      state = 'idle';
      await start();
    },
  };
}
