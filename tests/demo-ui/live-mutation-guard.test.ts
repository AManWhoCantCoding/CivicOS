import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { DEMO_MANIFEST_VERSION } from '@/modules/demo/manifest';
import { makeValidManifest } from './demo-manifest-fixture';
import { validateDemoManifest } from '@/modules/demo/manifest';
import {
  createLiveMutationExecutor,
  evaluateLiveMutation,
  type LiveMutationPolicy,
} from '@/modules/demo/live-mutation';
import { createWebActionExecutor } from '@/modules/demo/web-actions';

function validPolicy(
  overrides: Partial<LiveMutationPolicy> = {},
): LiveMutationPolicy {
  return {
    fixtureRef: 'demo-incident-01',
    idempotencyStrategy: 'existing-idempotency-key',
    replay: 'safe',
    cleanup: 'operator',
    ...overrides,
  };
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    demoModeEnabled: true,
    targetName: 'civicos',
    surface: 'web',
    mutationClass: 'create',
    action: 'submit',
    manifestVersion: DEMO_MANIFEST_VERSION,
    policy: validPolicy(),
    ...overrides,
  };
}

function statusOf(outcome: unknown): string {
  return typeof outcome === 'string'
    ? outcome
    : (outcome as { status: string }).status;
}

function reasonOf(outcome: unknown): string {
  return typeof outcome === 'string'
    ? ''
    : ((outcome as { reason?: string }).reason ?? '');
}

function makeFormHarness(requestSubmit: () => void) {
  const form = {
    tagName: 'FORM',
    getAttribute: (name: string) => (name === 'aria-label' ? 'Bieu mau' : null),
    click: () => {},
    focus: () => {},
    requestSubmit,
    textContent: 'Bieu mau',
  };
  return {
    getDocument: () => ({
      querySelectorAll: () => [form],
      activeElement: null,
    }),
    getPath: () => '/demo',
    waitForExpectation: async () => true,
  };
}

describe('T-007 AC-1 live mutation allowlist', () => {
  it('permits an approved submit in explicit LIVE_DEMO on exact civicos', () => {
    expect(evaluateLiveMutation(validInput())).toEqual({
      ok: true,
      reason: 'LIVE_MUTATION_READY',
    });
  });

  it('permits every allowlisted mutation class with a full policy', () => {
    for (const mutationClass of [
      'create',
      'update',
      'approve',
      'reject',
      'close',
      'assign',
    ]) {
      expect(evaluateLiveMutation(validInput({ mutationClass }))).toEqual({
        ok: true,
        reason: 'LIVE_MUTATION_READY',
      });
    }
  });
});

describe('T-007 AC-2 fail-closed preflight', () => {
  it('blocks without explicit demo mode', () => {
    expect(
      evaluateLiveMutation(validInput({ demoModeEnabled: false })),
    ).toEqual({ ok: false, reason: 'LIVE_MUTATION_BLOCKED_MODE' });
  });

  it('blocks any non-exact target', () => {
    for (const targetName of [
      'civicos_demo',
      'civicos_demo_shadow',
      'unknown',
      'forbidden',
      '',
      '  ',
    ]) {
      expect(evaluateLiveMutation(validInput({ targetName }))).toEqual({
        ok: false,
        reason: 'LIVE_MUTATION_BLOCKED_TARGET',
      });
    }
  });

  it('blocks non-web surfaces such as mobile', () => {
    expect(evaluateLiveMutation(validInput({ surface: 'mobile' }))).toEqual({
      ok: false,
      reason: 'LIVE_MUTATION_BLOCKED_SURFACE',
    });
  });

  it('blocks read-only or unknown mutation classes', () => {
    for (const mutationClass of ['none', '', 'delete', '  ']) {
      expect(evaluateLiveMutation(validInput({ mutationClass }))).toEqual({
        ok: false,
        reason: 'LIVE_MUTATION_BLOCKED_CLASS',
      });
    }
  });

  it('permits only an explicit visible submit action', () => {
    for (const action of ['click', 'fill', 'navigate', 'assert-state', '']) {
      expect(evaluateLiveMutation(validInput({ action }))).toEqual({
        ok: false,
        reason: 'LIVE_MUTATION_BLOCKED_ACTION',
      });
    }
  });

  it('blocks when the mutation policy is absent', () => {
    for (const policy of [null, undefined]) {
      expect(evaluateLiveMutation(validInput({ policy }))).toEqual({
        ok: false,
        reason: 'LIVE_MUTATION_BLOCKED_POLICY',
      });
    }
  });

  it('blocks blank or unsafe fixture references', () => {
    for (const fixtureRef of [
      '',
      '   ',
      'a'.repeat(129),
      'demo password 01',
      'demo-password-01',
      'demo-token-01',
      'postgresql://demo/civicos_demo',
      '<script>demo',
      '../outside',
    ]) {
      expect(
        evaluateLiveMutation(
          validInput({ policy: validPolicy({ fixtureRef }) }),
        ),
      ).toEqual({ ok: false, reason: 'LIVE_MUTATION_BLOCKED_FIXTURE' });
    }
  });

  it('blocks invented idempotency strategies', () => {
    for (const idempotencyStrategy of [
      '',
      'auto-key',
      'uuid',
      'runner-generated',
    ]) {
      expect(
        evaluateLiveMutation(
          validInput({ policy: validPolicy({ idempotencyStrategy }) }),
        ),
      ).toEqual({ ok: false, reason: 'LIVE_MUTATION_BLOCKED_IDEMPOTENCY' });
    }
  });

  it('blocks unsafe replay before any mutation', () => {
    expect(
      evaluateLiveMutation({
        ...validInput({ policy: validPolicy({ replay: 'blocked' }) }),
        isReplay: true,
      }),
    ).toEqual({ ok: false, reason: 'LIVE_MUTATION_BLOCKED_REPLAY' });
    expect(
      evaluateLiveMutation(
        validInput({ policy: validPolicy({ replay: 'retry' }) }),
      ),
    ).toEqual({ ok: false, reason: 'LIVE_MUTATION_BLOCKED_REPLAY' });
  });

  it('blocks non-operator cleanup', () => {
    for (const cleanup of ['', 'runner', 'auto', 'none']) {
      expect(
        evaluateLiveMutation(validInput({ policy: validPolicy({ cleanup }) })),
      ).toEqual({ ok: false, reason: 'LIVE_MUTATION_BLOCKED_CLEANUP' });
    }
  });

  it('blocks stale manifest versions', () => {
    expect(evaluateLiveMutation(validInput({ manifestVersion: '0' }))).toEqual({
      ok: false,
      reason: 'LIVE_MUTATION_BLOCKED_VERSION',
    });
  });
});

describe('T-007 AC-1 guarded submit delegates to the rendered form', () => {
  // AC-1 evidence delegates to createWebActionExecutor's visible form
  // requestSubmit path through a harness; no real live mutation is
  // performed by this unit test. The successful live component-submit path
  // is covered by tests/e2e/ps005-incident.spec.ts.
  it('delegates an approved submit through requestSubmit and marks committed', async () => {
    const requestSubmit = vi.fn();
    const guarded = createLiveMutationExecutor({
      inner: createWebActionExecutor(makeFormHarness(requestSubmit)),
      guard: {
        demoModeEnabled: true,
        targetName: 'civicos',
        surface: 'web',
        mutationClass: 'create',
        manifestVersion: DEMO_MANIFEST_VERSION,
        policy: validPolicy(),
      },
    });
    const outcome = await guarded({
      id: 'submit-1',
      action: 'submit',
      index: 0,
      detail: JSON.stringify({ role: 'form', name: 'Bieu mau' }),
    });
    expect(statusOf(outcome)).toBe('settled');
    expect(requestSubmit).toHaveBeenCalledTimes(1);
    expect(guarded.hasCommittedMutation()).toBe(true);
  });

  it('blocks a submit without policy before any executor call', async () => {
    const inner = vi.fn().mockReturnValue('settled');
    const guarded = createLiveMutationExecutor({
      guard: {
        demoModeEnabled: true,
        targetName: 'civicos',
        surface: 'web',
        mutationClass: 'create',
        manifestVersion: DEMO_MANIFEST_VERSION,
        policy: null,
      },
      inner,
    });
    const outcome = await guarded({
      id: 'submit-1',
      action: 'submit',
      index: 0,
      detail: JSON.stringify({ role: 'form', name: 'Bieu mau' }),
    });
    expect(statusOf(outcome)).toBe('blocked');
    expect(reasonOf(outcome)).toBe('LIVE_MUTATION_BLOCKED_POLICY');
    expect(inner).not.toHaveBeenCalled();
    expect(guarded.hasCommittedMutation()).toBe(false);
  });

  it('keeps read-only manifests policy-free through the current adapter', async () => {
    const inner = vi.fn().mockReturnValue('settled');
    const guarded = createLiveMutationExecutor({
      guard: {
        demoModeEnabled: true,
        targetName: 'civicos',
        surface: 'web',
        mutationClass: 'none',
        manifestVersion: DEMO_MANIFEST_VERSION,
        policy: null,
      },
      inner,
    });
    const outcome = await guarded({
      id: 'step-1',
      action: 'click',
      index: 0,
    });
    expect(statusOf(outcome)).toBe('settled');
    expect(inner).toHaveBeenCalledTimes(1);
    expect(guarded.hasCommittedMutation()).toBe(false);
  });

  it('marks committed only after a settled submit', async () => {
    const blocked = createLiveMutationExecutor({
      env: {
        ...makeFormHarness(vi.fn()),
        waitForExpectation: async () => false,
      },
      guard: {
        demoModeEnabled: true,
        targetName: 'civicos',
        surface: 'web',
        mutationClass: 'create',
        manifestVersion: DEMO_MANIFEST_VERSION,
        policy: validPolicy(),
      },
    });
    const outcome = await blocked({
      id: 'submit-1',
      action: 'submit',
      index: 0,
      detail: JSON.stringify({
        role: 'form',
        name: 'Bieu mau',
        path: '/sau-submit',
      }),
    });
    expect(statusOf(outcome)).toBe('blocked');
    expect(blocked.hasCommittedMutation()).toBe(false);
  });

  it('emits only safe reason codes with no secrets or payloads', async () => {
    const inner = vi.fn().mockReturnValue('settled');
    const guarded = createLiveMutationExecutor({
      guard: {
        demoModeEnabled: false,
        targetName: 'civicos',
        surface: 'web',
        mutationClass: 'create',
        manifestVersion: DEMO_MANIFEST_VERSION,
        policy: validPolicy(),
      },
      inner,
    });
    const outcome = await guarded({
      id: 'submit-1',
      action: 'submit',
      index: 0,
      detail: JSON.stringify({ role: 'form', name: 'Bieu mau' }),
    });
    expect(reasonOf(outcome)).toMatch(/^[A-Z][A-Z0-9_]{1,63}$/);
    expect(JSON.stringify(outcome)).not.toContain('s3cret');
    expect(JSON.stringify(outcome)).not.toContain('postgresql://');
    expect(JSON.stringify(outcome)).not.toContain('civicos.local');
  });
});

describe('T-007 manifest policy metadata', () => {
  it('accepts a policy-bearing mutation manifest', () => {
    expect(
      validateDemoManifest(
        makeValidManifest({
          mutationClass: 'create',
          liveMutationPolicy: {
            fixtureRef: 'demo-incident-01',
            idempotencyStrategy: 'existing-idempotency-key',
            replay: 'safe',
            cleanup: 'operator',
          },
        }),
      ),
    ).toEqual({ ok: true });
  });

  it('keeps read-only manifests valid without policy and rejects read-only policy', () => {
    expect(validateDemoManifest(makeValidManifest())).toEqual({ ok: true });
    expect(
      validateDemoManifest(
        makeValidManifest({ liveMutationPolicy: validPolicy() }),
      ),
    ).toEqual({ ok: false, reason: 'DEMO_MANIFEST_INVALID_POLICY' });
  });

  it('rejects invented strategies or unsafe fixtures at validation', () => {
    expect(
      validateDemoManifest(
        makeValidManifest({
          mutationClass: 'create',
          liveMutationPolicy: validPolicy({
            idempotencyStrategy: 'auto-key',
          }),
        }),
      ),
    ).toEqual({ ok: false, reason: 'DEMO_MANIFEST_INVALID_POLICY' });
    expect(
      validateDemoManifest(
        makeValidManifest({
          mutationClass: 'create',
          liveMutationPolicy: validPolicy({
            fixtureRef: 'demo-password-01',
          }),
        }),
      ),
    ).toEqual({ ok: false, reason: 'DEMO_MANIFEST_INVALID_POLICY' });
  });
});

describe('T-007 AC-2/AC-3 no direct API or DB path in the mutation seam', () => {
  it('keeps live-mutation, runner, actions and DemoCenter free of reset/DB/API primitives', () => {
    const liveMutation = readFileSync(
      join(process.cwd(), 'src/modules/demo/live-mutation.ts'),
      'utf8',
    );
    const runner = readFileSync(
      join(process.cwd(), 'src/modules/demo/runner.ts'),
      'utf8',
    );
    const center = readFileSync(
      join(process.cwd(), 'src/components/demo/DemoCenter.tsx'),
      'utf8',
    );
    const actions = readFileSync(
      join(process.cwd(), 'src/modules/demo/web-actions.ts'),
      'utf8',
    );
    for (const source of [liveMutation, runner, center, actions]) {
      expect(source).not.toContain('resetDemo');
      expect(source).not.toContain('demo:reset');
      expect(source).not.toContain('scripts/demo/reset');
      expect(source).not.toContain('PrismaClient');
      expect(source).not.toContain('@/lib/prisma');
      expect(source).not.toContain('$queryRaw');
      expect(source).not.toContain('TRUNCATE');
    }
    expect(liveMutation).not.toContain('fetch(');
    expect(liveMutation).not.toContain('process.env');
    expect(runner).not.toContain('rollback');
    expect(center).not.toContain('rollback');
    expect(createWebActionExecutor).toBeDefined();
  });
});
