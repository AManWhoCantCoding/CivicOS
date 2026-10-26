import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  DEMO_DEFAULT_MANIFEST,
  DemoCenter,
  defaultDemoExecutor,
  resolveDemoControls,
  startDemoFlow,
} from '@/components/demo/DemoCenter';
import type { DemoRunState } from '@/modules/demo/manifest';
import { validateDemoManifest } from '@/modules/demo/manifest';
import { evaluateDemoTargetGuard } from '@/modules/demo/target-guard';
import { makeValidManifest } from './demo-manifest-fixture';

const DEMO_URL =
  'postgresql://demo-user:s3cret-token@localhost:5432/civicos?schema=public';
const WRONG_URL =
  'postgresql://demo-user:s3cret-token@localhost:5432/civicos_demo_shadow?schema=public';

const readyTarget = () =>
  evaluateDemoTargetGuard({
    demoModeEnabled: true,
    demoDatabaseUrl: DEMO_URL,
    databaseUrl: DEMO_URL,
  });
const blockedTarget = () =>
  evaluateDemoTargetGuard({
    demoModeEnabled: true,
    demoDatabaseUrl: WRONG_URL,
    databaseUrl: undefined,
  });
const disabledTarget = () =>
  evaluateDemoTargetGuard({ demoModeEnabled: false });

function centerSource(): string {
  return readFileSync(
    join(process.cwd(), 'src/components/demo/DemoCenter.tsx'),
    'utf8',
  );
}

describe('T-004 AC-1 Demo Center gating and safe surface', () => {
  it('renders the approved two-column surface for a ready target', () => {
    const html = renderToStaticMarkup(
      <DemoCenter target={readyTarget()} manifest={makeValidManifest()} />,
    );
    expect(html).toContain('data-testid="demo-center"');
    expect(html).toContain('Demo Center');
    expect(html).toContain('LIVE_DEMO');
    expect(html).toContain('civicos');
    expect(html).toContain('Phiên bản manifest');
    expect(html).toContain('demo-guide');
    expect(html).toContain('Web');
    expect(html).toContain('Mobile');
    expect(html).toContain('chỉ đọc');
    expect(html).toContain('Bắt đầu demo');
    const startButton = html.match(/<button[^>]*>Bắt đầu demo<\/button>/);
    expect(startButton).not.toBeNull();
    expect(startButton?.[0]).not.toContain('disabled=""');
    expect(html).toContain('Tạm dừng');
    expect(html).toContain('Tiếp tục');
    expect(html).toContain('>Dừng</button>');
    expect(html).toContain('Chạy lại');
  });

  it('hides the live control entirely when demo mode is disabled', () => {
    const html = renderToStaticMarkup(
      <DemoCenter target={disabledTarget()} manifest={makeValidManifest()} />,
    );
    expect(html).toBe('');
    expect(html).not.toContain('Demo Center');
    expect(html).not.toContain('LIVE_DEMO');
  });

  it('shows a safe blocked state without inventory or live actions', () => {
    const personaSwitch = vi.fn(async () => ({
      status: 'authenticated' as const,
      alias: 'commander',
      displayName: 'Commander demo',
      roleLabel: 'commander',
      expiresAt: '2026-10-20T00:00:00.000Z',
      scope: { assignmentCount: 1, assignmentState: 'ready' as const },
    }));
    const executor = vi.fn().mockReturnValue('settled');
    const html = renderToStaticMarkup(
      <DemoCenter
        target={blockedTarget()}
        manifest={makeValidManifest()}
        executor={executor}
        personaSwitch={personaSwitch}
      />,
    );
    expect(html).toContain('data-testid="demo-center"');
    expect(html).toContain('Demo bị chặn');
    expect(html).toContain('disabled');
    expect(html).not.toContain('Bắt đầu demo');
    expect(html).not.toContain('demo-guide');
    expect(html).not.toContain('step-1');
    expect(personaSwitch).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('never renders raw payload, PII, secret or connection string', () => {
    for (const target of [readyTarget(), blockedTarget(), disabledTarget()]) {
      const html = renderToStaticMarkup(
        <DemoCenter target={target} manifest={makeValidManifest()} />,
      );
      expect(html).not.toContain('s3cret-token');
      expect(html).not.toContain('postgresql://');
      expect(html).not.toContain('civicos_demo_shadow');
      expect(html).not.toContain('civicos.local');
      expect(html).not.toContain('password');
    }
  });
});

describe('T-004 AC-2 state-safe controls and single-runner wiring', () => {
  it('exposes only contract-valid actions per lifecycle state', () => {
    const idle = resolveDemoControls('idle', {
      canStartTarget: true,
      busy: false,
    });
    expect(idle).toEqual({
      start: true,
      pause: false,
      resume: false,
      stop: false,
      replay: false,
    });

    expect(
      resolveDemoControls('running', { canStartTarget: true, busy: false }),
    ).toEqual({
      start: false,
      pause: true,
      resume: false,
      stop: true,
      replay: false,
    });

    expect(
      resolveDemoControls('paused', { canStartTarget: true, busy: false }),
    ).toEqual({
      start: false,
      pause: false,
      resume: true,
      stop: true,
      replay: false,
    });

    for (const terminal of [
      'blocked',
      'failed',
      'cancelled',
      'completed',
      'completed-with-cleanup-pending',
    ] as DemoRunState[]) {
      expect(
        resolveDemoControls(terminal, { canStartTarget: true, busy: false }),
      ).toEqual({
        start: false,
        pause: false,
        resume: false,
        stop: false,
        replay: true,
      });
    }

    for (const busyState of [
      'preflight',
      'authenticating',
      'stopping',
    ] as DemoRunState[]) {
      const controls = resolveDemoControls(busyState, {
        canStartTarget: true,
        busy: false,
      });
      expect(controls.start).toBe(false);
      expect(controls.replay).toBe(false);
    }

    const busy = resolveDemoControls('idle', {
      canStartTarget: true,
      busy: true,
    });
    expect(Object.values(busy).every((enabled) => !enabled)).toBe(true);

    const guarded = resolveDemoControls('idle', {
      canStartTarget: false,
      busy: false,
    });
    expect(guarded.start).toBe(false);
  });

  it('creates exactly one runner and owns no timer', () => {
    const createRunner = vi.fn((options: unknown) => ({
      getState: () => 'idle',
      getCursor: () => 0,
      start: async () => {},
      pause: () => {},
      resume: () => {},
      stop: () => {},
      replay: async () => {},
      options,
    }));
    renderToStaticMarkup(
      <DemoCenter
        target={readyTarget()}
        manifest={makeValidManifest()}
        createRunner={
          createRunner as unknown as Parameters<
            typeof DemoCenter
          >[0]['createRunner']
        }
      />,
    );
    expect(createRunner).toHaveBeenCalledTimes(1);

    const source = centerSource();
    expect(source).toContain('createDemoRunner');
    expect(source).not.toContain('setTimeout');
    expect(source).not.toContain('setInterval');
    expect(source).not.toContain('requestAnimationFrame');
    expect(source).not.toContain('fetch(');
  });

  it('starts persona switch before the runner and in order', async () => {
    const calls: string[] = [];
    const personaSwitch = vi.fn(async () => {
      calls.push('persona');
      return {
        status: 'authenticated' as const,
        alias: 'commander',
        displayName: 'Commander demo',
        roleLabel: 'commander',
        expiresAt: '2026-10-20T00:00:00.000Z',
        scope: { assignmentCount: 1, assignmentState: 'ready' as const },
      };
    });
    const reloadScope = vi.fn();
    const runnerStart = vi.fn(async () => {
      calls.push('runner');
    });
    const outcome = await startDemoFlow({
      target: readyTarget(),
      manifest: makeValidManifest(),
      personaSwitch,
      reloadScope,
      runnerStart,
    });
    expect(outcome).toEqual({ status: 'started', alias: 'commander' });
    expect(calls).toEqual(['persona', 'runner']);
    expect(personaSwitch).toHaveBeenCalledWith('demo-guide', { reloadScope });
    expect(runnerStart).toHaveBeenCalledTimes(1);
  });

  it('never touches persona or runner when the target guard is not ready', async () => {
    const personaSwitch = vi.fn();
    const runnerStart = vi.fn();
    const outcome = await startDemoFlow({
      target: blockedTarget(),
      manifest: makeValidManifest(),
      personaSwitch,
      reloadScope: vi.fn(),
      runnerStart,
    });
    expect(outcome).toMatchObject({ status: 'blocked' });
    expect(personaSwitch).not.toHaveBeenCalled();
    expect(runnerStart).not.toHaveBeenCalled();
  });

  it('never starts the runner when persona switch is blocked or rejected', async () => {
    for (const persona of [
      { status: 'blocked' as const, reason: 'PERSONA_UNAVAILABLE' },
      { status: 'rejected' as const, reason: 'UNKNOWN_ALIAS' },
    ]) {
      const runnerStart = vi.fn();
      const outcome = await startDemoFlow({
        target: readyTarget(),
        manifest: makeValidManifest(),
        personaSwitch: vi.fn(async () => persona),
        reloadScope: vi.fn(),
        runnerStart,
      });
      expect(outcome).toEqual(persona);
      expect(runnerStart).not.toHaveBeenCalled();
    }
  });

  it('ships a validated default manifest whose default executor blocks safely', async () => {
    expect(validateDemoManifest(DEMO_DEFAULT_MANIFEST)).toEqual({ ok: true });
    const outcome = await defaultDemoExecutor({
      id: 'step-1',
      action: 'submit',
      index: 0,
    });
    expect(typeof outcome === 'string' ? outcome : outcome.status).toBe(
      'blocked',
    );
    expect(typeof outcome === 'string' ? '' : (outcome.reason ?? '')).toBe(
      'DEMO_STEP_INVALID_DESCRIPTOR',
    );
  });
});

describe('T-004 page and workspace seams', () => {
  it('passes only a server-computed sanitized target result from the page', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app/page.tsx'),
      'utf8',
    );
    expect(source).toContain('evaluateDemoTargetGuard');
    expect(source).toContain('CIVICOS_DEMO_MODE');
    expect(source).toContain('DEMO_DATABASE_URL');
    expect(source).toContain('DATABASE_URL');
    expect(source).toContain('demoTarget');
    expect(source).toContain('RoleWorkspace');
    expect(source).not.toContain('postgresql://');
    expect(source).not.toContain('civicos_demo_shadow');
  });
});
