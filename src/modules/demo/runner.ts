import {
  validateDemoManifest,
  type DemoManifest,
  type DemoManifestStep,
  type DemoRunState,
} from './manifest';

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

export type DemoExecutor = (step: {
  id: string;
  action: string;
  index: number;
}) => DemoStepOutcome | Promise<DemoStepOutcome>;

export type DemoRunnerOptions = {
  manifest: unknown;
  scheduler?: DemoScheduler;
  executor: DemoExecutor;
  onEvent?: (event: DemoStepEvent) => void;
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
  if (outcome === 'settled' || outcome === 'blocked') return outcome;
  return 'failed';
}

function outcomeReason(
  status: DemoStepOutcome,
  step: DemoManifestStep,
): string {
  if (status === 'blocked') {
    const needsSelectOpen =
      typeof step.action === 'string' && step.action.trim() === 'choose-option';
    return needsSelectOpen ? 'DEMO_STEP_SELECT_NOT_OPEN' : 'DEMO_STEP_BLOCKED';
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

  function setState(next: DemoRunState): void {
    if (!canTransition(state, next)) return;
    state = next;
  }

  function emit(event: DemoStepEvent): void {
    options.onEvent?.(event);
  }

  function clearTimer(): void {
    if (activeTimer !== null) {
      scheduler.cancel(activeTimer);
      activeTimer = null;
    }
  }

  async function runStep(index: number, ticket: number): Promise<void> {
    if (ticket !== generation || stopped || state !== 'running') return;
    const step = manifest.steps[index];
    if (!step) return;
    nextIndex = index;
    let outcome: DemoStepOutcome;
    try {
      outcome = toSafeOutcome(
        await options.executor({ id: step.id, action: step.action, index }),
      );
    } catch {
      outcome = 'failed';
    }
    if (ticket !== generation || stopped || state !== 'running') return;
    nextIndex = index + 1;
    emit({
      stepId: step.id,
      index,
      action: step.action,
      status: outcome,
      reason: outcomeReason(outcome, step),
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
    start,
    pause(): void {
      if (state !== 'running') return;
      generation += 1;
      clearTimer();
      setState('paused');
    },
    resume(): void {
      if (state !== 'paused' || activeTimer !== null) return;
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
      setState('cancelled');
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
      generation += 1;
      stopped = false;
      clearTimer();
      nextIndex = 0;
      state = 'idle';
      await start();
    },
  };
}
