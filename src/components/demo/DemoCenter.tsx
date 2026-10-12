'use client';

import { useEffect, useRef, useState } from 'react';

import { DemoTargetStatus } from '@/components/demo/DemoTargetStatus';
import {
  switchDemoPersonaClient,
  type DemoPersonaClientResult,
} from '@/components/demo/demo-persona-client';
import {
  DEMO_MANIFEST_VERSION,
  type DemoManifest,
  type DemoRunState,
} from '@/modules/demo/manifest';
import {
  DEMO_PACING_MS,
  createDemoRunner,
  type DemoExecutor,
  type DemoScheduler,
  type DemoStepEvent,
} from '@/modules/demo/runner';
import { createWebActionExecutor } from '@/modules/demo/web-actions';
import { createLiveMutationExecutor } from '@/modules/demo/live-mutation';
import type { DemoTargetGuardResult } from '@/modules/demo/target-guard';

// Safe default manifest seam (replaced by T-005 action work, never by a live
// mutation adapter here): read-only steps, no mutation, validated shape.
export const DEMO_DEFAULT_MANIFEST: DemoManifest = {
  version: DEMO_MANIFEST_VERSION,
  scenarioId: 'demo-center-default',
  sceneId: 'demo-center',
  surface: 'web',
  personaAlias: 'commander',
  precondition: 'Target civicos_demo san sang va che do LIVE_DEMO dang bat.',
  explanation: 'Huong dan demo tung buoc bang tieng Viet tren web.',
  expectedState: 'completed',
  mutationClass: 'none',
  cleanupPolicy: 'Khong co mutation nen khong can don dep.',
  blockedPolicy: 'Dung lai va hien thi ly do blocked.',
  steps: [
    { id: 'demo-step-1', action: 'navigate', expectedState: 'running' },
    { id: 'demo-step-2', action: 'assert-state', expectedState: 'running' },
  ],
};

// Fail-safe default executor for T-005: the behavior-faithful web adapter.
// The default manifest carries no target descriptor, so it stays blocked
// rather than pretending a domain action succeeded.
export const defaultDemoExecutor: DemoExecutor = createWebActionExecutor();

export type DemoPersonaSwitch = (
  alias: string,
  options: { reloadScope: () => void | Promise<void> },
) => Promise<DemoPersonaClientResult>;

export type DemoCenterProps = {
  target: DemoTargetGuardResult;
  manifest?: DemoManifest;
  executor?: DemoExecutor;
  scheduler?: DemoScheduler;
  personaSwitch?: DemoPersonaSwitch;
  reloadScope?: () => void | Promise<void>;
  createRunner?: typeof createDemoRunner;
};

export type DemoControlStates = {
  start: boolean;
  pause: boolean;
  resume: boolean;
  stop: boolean;
  replay: boolean;
};

// Mirrors the T-002 terminal vocabulary in runner.ts; Replay stays
// terminal-only and never bypasses runner validation.
const DEMO_TERMINAL_STATES: readonly DemoRunState[] = [
  'blocked',
  'failed',
  'cancelled',
  'completed',
  'completed-with-cleanup-pending',
];

export function resolveDemoControls(
  runState: DemoRunState,
  options: { canStartTarget: boolean; busy: boolean },
): DemoControlStates {
  if (options.busy) {
    return {
      start: false,
      pause: false,
      resume: false,
      stop: false,
      replay: false,
    };
  }
  return {
    start: options.canStartTarget && runState === 'idle',
    pause: runState === 'running',
    resume: runState === 'paused',
    stop: runState === 'running' || runState === 'paused',
    replay: DEMO_TERMINAL_STATES.includes(runState),
  };
}

// Reason codes cross from closed server/runner vocabularies; anything else is
// never rendered raw.
function toSafeReasonCode(reason: unknown): string {
  if (typeof reason === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(reason)) {
    return reason;
  }
  return 'DEMO_STATE_UNKNOWN';
}

export function describeDemoNarrator(input: {
  runState: DemoRunState;
  cursor: number;
  total: number;
  currentStepId: string | null;
  lastStatus: string | null;
  lastReason: string | null;
  personaAlias: string;
}): string {
  const total = Math.max(input.total, 0);
  const position =
    total === 0 ? '0/0' : `${Math.min(input.cursor + 1, total)}/${total}`;
  const reason = toSafeReasonCode(input.lastReason);
  switch (input.runState) {
    case 'idle':
      return `Demo sẵn sàng. Bước ${position}. Nhấn Bắt đầu để kiểm tra.`;
    case 'preflight':
    case 'authenticating':
      return 'Đang chuẩn bị và xác thực persona demo.';
    case 'running':
      return `Đang chạy bước ${position}. Mỗi bước đã settled chờ ${DEMO_PACING_MS / 1000} giây trước bước tiếp theo.`;
    case 'paused':
      return `Đã tạm dừng ở bước ${position}. Nhấn Tiếp tục để chạy tiếp.`;
    case 'blocked':
      return `Demo bị chặn ở bước ${position}. Mã trạng thái: ${reason}. Nhấn Dừng hoặc Chạy lại.`;
    case 'failed':
      return `Demo thất bại ở bước ${position}. Mã trạng thái: ${reason}.`;
    case 'stopping':
      return 'Đang dừng demo.';
    case 'cancelled':
      return `Đã dừng demo ở bước ${position}.`;
    case 'completed':
      return `Demo hoàn tất ${total}/${total} bước.`;
    case 'completed-with-cleanup-pending':
      return 'Demo hoàn tất, còn thao tác dọn dẹp chờ operator.';
  }
}

// Start ordering seam: target guard -> persona switch/reload -> runner. Never
// starts the runner or authenticates when the target guard is not ready.
export function startDemoFlow(input: {
  target: DemoTargetGuardResult;
  manifest: DemoManifest;
  personaSwitch: DemoPersonaSwitch;
  reloadScope: () => void | Promise<void>;
  runnerStart: () => Promise<void> | void;
}): Promise<
  | { status: 'started'; alias: string }
  | { status: 'blocked' | 'rejected'; reason: string }
> {
  if (input.target.state !== 'ready' || !input.target.canStart) {
    return Promise.resolve({ status: 'blocked', reason: input.target.reason });
  }
  return input
    .personaSwitch(input.manifest.personaAlias, {
      reloadScope: input.reloadScope,
    })
    .then(async (persona) => {
      if (persona.status !== 'authenticated') return persona;
      await input.runnerStart();
      return { status: 'started' as const, alias: persona.alias };
    });
}

const CONTROL_CLASS =
  'min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold transition motion-safe:duration-150 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--civicos-accent)] disabled:cursor-not-allowed disabled:opacity-50';

export function DemoCenter(props: DemoCenterProps) {
  const { target } = props;
  const manifest = props.manifest ?? DEMO_DEFAULT_MANIFEST;
  const executor = props.executor ?? defaultDemoExecutor;
  const personaSwitch = props.personaSwitch ?? switchDemoPersonaClient;
  const reloadScope = props.reloadScope ?? (async () => {});
  const createRunner = props.createRunner ?? createDemoRunner;

  const [runState, setRunState] = useState<DemoRunState>('idle');
  const [cursor, setCursor] = useState(0);
  const [events, setEvents] = useState<readonly DemoStepEvent[]>([]);
  const [personaAlias, setPersonaAlias] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const statusRef = useRef<HTMLHeadingElement>(null);
  const interactedRef = useRef(false);

  // Single runner instance for the component lifetime; the runner owns the
  // only pacing timer and no duplicate callbacks exist.
  // T-007: the executor is wrapped by the pure live-mutation guard so an
  // approved submit preflights before the rendered form runs. The default
  // read-only manifest (`mutationClass: 'none'`, no policy) passes straight
  // through the current adapter and never mutates.
  const runnerRef = useRef<ReturnType<typeof createDemoRunner> | null>(null);
  if (runnerRef.current === null) {
    const guardedExecutor = createLiveMutationExecutor({
      guard: {
        demoModeEnabled: target.reason !== 'DEMO_MODE_DISABLED',
        targetName: target.target,
        surface: manifest.surface,
        mutationClass: manifest.mutationClass,
        manifestVersion: manifest.version,
        policy: manifest.liveMutationPolicy ?? null,
      },
      inner: executor,
    });
    const created = createRunner({
      manifest,
      executor: guardedExecutor,
      scheduler: props.scheduler,
      liveMutation: {
        demoModeEnabled: target.reason !== 'DEMO_MODE_DISABLED',
        targetName: target.target,
      },
      onEvent: (event) => {
        setEvents((previous) => [...previous, event]);
      },
    });
    runnerRef.current = created;
  }
  const runner = runnerRef.current;

  function syncRunner(): void {
    setRunState(runner.getState());
    setCursor(runner.getCursor());
  }

  // Focus moves to the persistent status heading after meaningful state
  // changes and stays restorable after pause/stop; reduced motion never
  // removes narration, order or readiness.
  useEffect(() => {
    if (!interactedRef.current) return;
    statusRef.current?.focus({ preventScroll: true });
  }, [runState, cursor, notice]);

  if (target.reason === 'DEMO_MODE_DISABLED') return null;

  const ready = target.state === 'ready';
  const controls = resolveDemoControls(runState, {
    canStartTarget: ready && target.canStart,
    busy,
  });
  const total = manifest.steps.length;
  const currentStep =
    total === 0 ? null : (manifest.steps[Math.min(cursor, total - 1)] ?? null);
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;
  const narration = describeDemoNarrator({
    runState,
    cursor,
    total,
    currentStepId: currentStep?.id ?? null,
    lastStatus: lastEvent?.status ?? null,
    lastReason: lastEvent?.reason ?? notice ?? (ready ? null : target.reason),
    personaAlias: manifest.personaAlias,
  });

  async function handleStart(): Promise<void> {
    if (busy) return;
    if (!ready || !target.canStart) return;
    if (runner.getState() !== 'idle') return;
    setBusy(true);
    interactedRef.current = true;
    try {
      const outcome = await startDemoFlow({
        target,
        manifest,
        personaSwitch,
        reloadScope,
        runnerStart: () => runner.start(),
      });
      if (outcome.status === 'started') {
        setPersonaAlias(outcome.alias);
        setNotice(null);
      } else {
        setNotice(outcome.reason);
      }
    } finally {
      syncRunner();
      setBusy(false);
    }
  }

  function handlePause(): void {
    interactedRef.current = true;
    runner.pause();
    syncRunner();
  }

  function handleResume(): void {
    interactedRef.current = true;
    runner.resume();
    syncRunner();
  }

  function handleStop(): void {
    interactedRef.current = true;
    runner.stop();
    syncRunner();
  }

  async function handleReplay(): Promise<void> {
    if (busy) return;
    setBusy(true);
    interactedRef.current = true;
    try {
      await runner.replay();
    } catch {
      // Non-terminal replay is refused by the runner; the control is only
      // enabled in terminal states so this stays a safe no-op.
    } finally {
      syncRunner();
      setBusy(false);
    }
  }

  return (
    <section
      data-testid="demo-center"
      aria-labelledby="demo-center-status"
      className="mt-8 rounded-2xl border p-5"
      style={{
        background: 'var(--civicos-surface)',
        borderColor: 'var(--civicos-border)',
        borderRadius: 'var(--civicos-radius-lg)',
      }}
    >
      <h2
        id="demo-center-status"
        ref={statusRef}
        tabIndex={-1}
        className="text-lg font-semibold focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--civicos-accent)]"
        style={{ color: 'var(--civicos-text)' }}
      >
        Demo Center
      </h2>
      <p
        className="mt-1 font-mono text-xs tracking-[0.18em] uppercase"
        style={{ color: 'var(--civicos-accent)' }}
      >
        LIVE_DEMO
      </p>

      <div className="mt-4">
        <DemoTargetStatus
          result={target}
          onStart={controls.start ? handleStart : undefined}
        />
      </div>

      {ready ? (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div
              className="rounded-xl border p-4 text-sm leading-6"
              style={{
                borderColor: 'var(--civicos-border)',
                borderRadius: 'var(--civicos-radius-md)',
                color: 'var(--civicos-text)',
              }}
            >
              <p>
                Target: <strong>civicos_demo</strong>
              </p>
              <p>Phiên bản manifest: {manifest.version}</p>
              <p>Persona: {manifest.personaAlias}</p>
              <p>Bề mặt: Web và Mobile (chỉ đọc)</p>
              <p>
                Web: {target.web === 'ready' ? 'sẵn sàng' : 'không sẵn sàng'}
              </p>
              <p>Trạng thái: {runState}</p>
              <p>
                Bước hiện tại:{' '}
                {runState === 'idle'
                  ? 'chưa bắt đầu'
                  : (currentStep?.id ?? '—')}
              </p>
              <p>
                Tiến độ {Math.min(cursor, total)}/{total} bước
              </p>
              {personaAlias ? <p>Đã xác thực persona: {personaAlias}</p> : null}
            </div>
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: 'var(--civicos-border)',
                borderRadius: 'var(--civicos-radius-md)',
              }}
            >
              <div
                role="status"
                aria-live="polite"
                aria-label="Tường thuật demo"
                className="text-sm leading-6 motion-safe:transition-opacity motion-safe:duration-150"
                style={{ color: 'var(--civicos-text)' }}
              >
                {narration}
              </div>
              <p
                className="mt-2 text-sm leading-6"
                style={{ color: 'var(--civicos-text-muted)' }}
              >
                {runState === 'running'
                  ? `Đã settled · chờ ${DEMO_PACING_MS / 1000} giây giữa các bước.`
                  : `Nhịp chạy: ${DEMO_PACING_MS / 1000} giây sau mỗi bước đã settled.`}
              </p>
              {lastEvent || notice ? (
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: 'var(--civicos-text-muted)' }}
                >
                  Mã trạng thái: {toSafeReasonCode(lastEvent?.reason ?? notice)}
                </p>
              ) : null}
              {runState === 'completed-with-cleanup-pending' ? (
                <p
                  data-testid="demo-cleanup-pending"
                  className="mt-2 text-sm leading-6 font-semibold"
                  style={{ color: 'var(--civicos-text)' }}
                >
                  Đã hoàn tất mutation, còn thao tác dọn dẹp chờ operator. Liên
                  hệ operator để xác nhận và dọn dẹp, không tự reset dữ liệu
                  demo.
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!controls.pause}
              onClick={handlePause}
              className={CONTROL_CLASS}
              style={{
                borderColor: 'var(--civicos-border)',
                borderRadius: 'var(--civicos-radius-sm)',
                color: 'var(--civicos-text)',
                background: 'var(--civicos-surface)',
              }}
            >
              Tạm dừng
            </button>
            <button
              type="button"
              disabled={!controls.resume}
              onClick={handleResume}
              className={CONTROL_CLASS}
              style={{
                borderColor: 'var(--civicos-border)',
                borderRadius: 'var(--civicos-radius-sm)',
                color: 'var(--civicos-text)',
                background: 'var(--civicos-surface)',
              }}
            >
              Tiếp tục
            </button>
            <button
              type="button"
              disabled={!controls.stop}
              onClick={handleStop}
              className={CONTROL_CLASS}
              style={{
                borderColor: 'var(--civicos-border)',
                borderRadius: 'var(--civicos-radius-sm)',
                color: 'var(--civicos-text)',
                background: 'var(--civicos-surface)',
              }}
            >
              Dừng
            </button>
            <button
              type="button"
              disabled={!controls.replay}
              onClick={handleReplay}
              className={CONTROL_CLASS}
              style={{
                borderColor: 'var(--civicos-accent)',
                borderRadius: 'var(--civicos-radius-sm)',
                color: 'var(--civicos-accent)',
                background: 'var(--civicos-surface)',
              }}
            >
              Chạy lại
            </button>
          </div>
        </>
      ) : (
        <p
          className="mt-4 text-sm leading-6"
          style={{ color: 'var(--civicos-text-muted)' }}
        >
          Mã trạng thái: {toSafeReasonCode(target.reason)}
        </p>
      )}

      <aside
        className="mt-4 rounded-xl border p-4 text-sm leading-6"
        style={{
          borderColor: 'var(--civicos-border)',
          borderRadius: 'var(--civicos-radius-md)',
          color: 'var(--civicos-text-muted)',
          background: 'var(--civicos-surface)',
        }}
      >
        <p className="font-semibold" style={{ color: 'var(--civicos-text)' }}>
          Mobile chỉ đọc
        </p>
        <p>
          Cầu nối thiết bị do operator khởi động trước. Demo Center không khởi
          động bridge và không ghi dữ liệu từ mobile.
        </p>
      </aside>
    </section>
  );
}
