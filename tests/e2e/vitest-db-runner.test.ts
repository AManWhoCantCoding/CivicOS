// DB-free unit tests for the Vitest DB lifecycle runner seam
// (scripts/e2e/run-vitest-db.mjs). There is NO database access here: Prisma is
// never imported (the runner only dynamic-imports it inside real-run deps) and
// every Prisma/lock interactor is a fake. No real PostgreSQL advisory lock is
// exercised by this suite.

import { describe, expect, it } from 'vitest';

import {
  E2E_ADVISORY_LOCK_ACQUIRE_SQL,
  E2E_ADVISORY_LOCK_RELEASE_SQL,
  E2E_ADVISORY_LOCK_TRY_ACQUIRE_SQL,
  runWithE2EWholeRunLock,
} from '../../scripts/e2e/database-lifecycle.mjs';
import {
  buildVitestDbChildEnv,
  buildVitestDbLockDeps,
  createVitestDbLeaseStore,
  finalizeVitestDbChildEnv,
  orchestrateVitestDbLifecycle,
  runVitestDbLead,
  waitForChildStop,
  seedChildArgs,
  UNSAFE_MAIN_DB_ALIASES,
  validateVitestDbLifecycleEnv,
  vitestChildArgs,
  VITEST_DB_LIFECYCLE_MARKER,
  VITEST_DB_RUN_FLAG,
} from '../../scripts/e2e/run-vitest-db.mjs';

const OK_TARGET =
  'postgresql://e2e:s3cret@127.0.0.1:5432/civicos_e2e?schema=public';

describe('waitForChildStop', () => {
  it('waits for exit after requesting termination', async () => {
    const listeners = new Map<string, () => void>();
    const child = {
      exitCode: null,
      signalCode: null,
      once: (event: string, listener: () => void) =>
        listeners.set(event, listener),
    };
    let requested = false;
    let settled = false;
    const stopping = waitForChildStop(child, () => {
      requested = true;
    });
    void stopping.then(() => {
      settled = true;
    });
    expect(requested).toBe(true);
    expect(settled).toBe(false);
    listeners.get('exit')?.();
    await stopping;
    expect(settled).toBe(true);
  });

  it('keeps waiting for exit after an error from a child with a PID', async () => {
    const listeners = new Map<string, () => void>();
    const child = {
      pid: 123,
      exitCode: null,
      signalCode: null,
      once: (event: string, listener: () => void) =>
        listeners.set(event, listener),
    };
    let settled = false;
    const stopping = waitForChildStop(child, () => {});
    void stopping.then(() => {
      settled = true;
    });
    listeners.get('error')?.();
    await Promise.resolve();
    expect(settled).toBe(false);
    listeners.get('exit')?.();
    await stopping;
    expect(settled).toBe(true);
  });

  it('completes on spawn error when no PID was assigned', async () => {
    const listeners = new Map<string, () => void>();
    const child = {
      pid: undefined,
      exitCode: null,
      signalCode: null,
      once: (event: string, listener: () => void) =>
        listeners.set(event, listener),
    };
    const stopping = waitForChildStop(child, () => {});
    listeners.get('error')?.();
    await expect(stopping).resolves.toBeUndefined();
  });

  it('does not hang for an already-exited child', async () => {
    let requested = false;
    await waitForChildStop({ exitCode: 0, signalCode: null }, () => {
      requested = true;
    });
    expect(requested).toBe(false);
  });
});

interface Env {
  [key: string]: string | undefined;
}

function envWith(extra: Env): Env {
  return { ...extra };
}

const SAFE_DB_ENV = envWith({
  [VITEST_DB_RUN_FLAG]: '1',
  [VITEST_DB_LIFECYCLE_MARKER]: '1',
  CIVICOS_E2E_DATABASE_URL: OK_TARGET,
  DATABASE_URL: OK_TARGET,
});

describe('validateVitestDbLifecycleEnv', () => {
  it('is inert (ok, not requested) for ordinary runs without RUN_DB_TESTS', () => {
    const check = validateVitestDbLifecycleEnv(envWith({}));
    expect(check.ok).toBe(true);
    expect(check.dbTestsRequested).toBe(false);
    // A leftover DATABASE_URL pointing at civicos does not affect DB-free runs.
    expect(
      validateVitestDbLifecycleEnv(
        envWith({ DATABASE_URL: 'postgresql://127.0.0.1:5432/civicos' }),
      ).ok,
    ).toBe(true);
  });

  it('rejects bare RUN_DB_TESTS=1 without the lifecycle marker', () => {
    const refused = validateVitestDbLifecycleEnv(
      envWith({
        [VITEST_DB_RUN_FLAG]: '1',
        CIVICOS_E2E_DATABASE_URL: OK_TARGET,
        DATABASE_URL: OK_TARGET,
      }),
    );
    expect(refused.ok).toBe(false);
    expect(refused.code).toBe('E2E_LIFECYCLE_MARKER_REQUIRED');
  });

  it('rejects DB-test mode without an explicit target (no fallback to .env/DATABASE_URL)', () => {
    const refused = validateVitestDbLifecycleEnv(
      envWith({
        [VITEST_DB_RUN_FLAG]: '1',
        [VITEST_DB_LIFECYCLE_MARKER]: '1',
        DATABASE_URL: OK_TARGET,
      }),
    );
    expect(refused.ok).toBe(false);
    expect(refused.code).toBe('E2E_DATABASE_URL_REQUIRED');
  });

  it('rejects a target that is not the exact civicos_e2e loopback', () => {
    const refused = validateVitestDbLifecycleEnv(
      envWith({
        [VITEST_DB_RUN_FLAG]: '1',
        [VITEST_DB_LIFECYCLE_MARKER]: '1',
        CIVICOS_E2E_DATABASE_URL: 'postgresql://127.0.0.1:5433/civicos_e2e',
        DATABASE_URL: 'postgresql://127.0.0.1:5433/civicos_e2e',
      }),
    );
    expect(refused.ok).toBe(false);
    expect(refused.code).toBe('E2E_DATABASE_URL_REFUSED');
  });

  it('rejects effective DATABASE_URL disagreement with the explicit target', () => {
    const refused = validateVitestDbLifecycleEnv(
      envWith({
        [VITEST_DB_RUN_FLAG]: '1',
        [VITEST_DB_LIFECYCLE_MARKER]: '1',
        CIVICOS_E2E_DATABASE_URL: OK_TARGET,
        DATABASE_URL: 'postgresql://civicos:civicos@localhost:5432/civicos',
      }),
    );
    expect(refused.ok).toBe(false);
    expect(refused.code).toBe('E2E_DATABASE_URL_TARGET_MISMATCH');
  });

  it.each([...UNSAFE_MAIN_DB_ALIASES])(
    'refuses main-db alias %s in DB-test mode',
    (alias) => {
      const refused = validateVitestDbLifecycleEnv({
        ...SAFE_DB_ENV,
        [alias]: 'postgresql://civicos:civicos@localhost:5432/civicos',
      });
      expect(refused.ok).toBe(false);
      expect(refused.code).toBe('E2E_MAIN_DB_ALIAS_REFUSED');
    },
  );

  it('accepts the exact supported lifecycle configuration', () => {
    const accepted = validateVitestDbLifecycleEnv(SAFE_DB_ENV);
    expect(accepted.ok).toBe(true);
    expect(accepted.dbTestsRequested).toBe(true);
    expect(accepted.targetUrl).toBe(OK_TARGET);
  });

  it('never echoes credentials or URLs in refusal codes', () => {
    const checks = [
      validateVitestDbLifecycleEnv(
        envWith({
          [VITEST_DB_RUN_FLAG]: '1',
          CIVICOS_E2E_DATABASE_URL:
            'postgresql://e2e:vtfn-secret-value@127.0.0.1:5432/civicos_e2e',
        }),
      ),
      validateVitestDbLifecycleEnv(
        envWith({ [VITEST_DB_RUN_FLAG]: '1', CIVICOS_E2E_DATABASE_URL: '   ' }),
      ),
      buildVitestDbChildEnv(
        envWith({
          CIVICOS_E2E_DATABASE_URL:
            'postgresql://e2e:vtfn-secret-value@localhost:5432/civicos',
        }),
      ),
    ];
    for (const check of checks) {
      const serialized = JSON.stringify(check);
      expect(serialized.includes('vtfn-secret-value')).toBe(false);
      expect(serialized.includes('postgresql://')).toBe(false);
    }
  });
});

describe('buildVitestDbChildEnv', () => {
  it('sets marker, RUN_DB_TESTS and DATABASE_URL/target agreement from a snapshot', () => {
    const result = buildVitestDbChildEnv(
      envWith({ CIVICOS_E2E_DATABASE_URL: OK_TARGET }),
    );
    expect(result.ok).toBe(true);
    expect(result.childEnv?.[VITEST_DB_RUN_FLAG]).toBe('1');
    expect(result.childEnv?.[VITEST_DB_LIFECYCLE_MARKER]).toBe('1');
    expect(result.childEnv?.DATABASE_URL).toBe(OK_TARGET);
    expect(result.childEnv?.CIVICOS_E2E_DATABASE_URL).toBe(OK_TARGET);
  });

  it('strips every unsafe main-db alias from the child env', () => {
    const result = buildVitestDbChildEnv(
      envWith({
        CIVICOS_E2E_DATABASE_URL: OK_TARGET,
        DEMO_DATABASE_URL:
          'postgresql://civicos:civicos@localhost:5432/civicos',
        CIVICOS_DATABASE_URL:
          'postgresql://civicos:civicos@localhost:5432/civicos',
      }),
    );
    expect(result.ok).toBe(true);
    for (const alias of UNSAFE_MAIN_DB_ALIASES) {
      expect(result.childEnv?.[alias]).toBeUndefined();
    }
  });

  it('refuses without a child env when the snapshot lacks a valid explicit target', () => {
    const refused = buildVitestDbChildEnv(envWith({ DATABASE_URL: OK_TARGET }));
    expect(refused.ok).toBe(false);
    expect(refused.code).toBe('E2E_DATABASE_URL_REQUIRED');
    expect(refused.childEnv).toBeUndefined(); // nothing partially built leaks
  });

  it('strips aliases re-introduced after the .env merge (finalize revalidation)', () => {
    const plan = buildVitestDbChildEnv(
      envWith({ CIVICOS_E2E_DATABASE_URL: OK_TARGET }),
    );
    expect(plan.ok).toBe(true);
    const finalized = finalizeVitestDbChildEnv(
      plan.childEnv as Env,
      {
        ...plan.childEnv!,
        DEMO_DATABASE_URL:
          'postgresql://civicos:civicos@localhost:5432/civicos',
      } as NodeJS.ProcessEnv,
    );
    expect(finalized.ok).toBe(true);
    expect(finalized.environment?.DEMO_DATABASE_URL).toBeUndefined();
    expect(finalized.environment?.DATABASE_URL).toBe(OK_TARGET);
    expect(finalized.environment?.[VITEST_DB_LIFECYCLE_MARKER]).toBe('1');
  });

  it('never lets the merged .env DATABASE_URL override the validated target', () => {
    const plan = buildVitestDbChildEnv(
      envWith({ CIVICOS_E2E_DATABASE_URL: OK_TARGET }),
    );
    expect(plan.ok).toBe(true);
    const finalized = finalizeVitestDbChildEnv(
      plan.childEnv as Env,
      {
        ...plan.childEnv!,
        DATABASE_URL: 'postgresql://civicos:civicos@localhost:5432/civicos',
      } as NodeJS.ProcessEnv,
    );
    expect(finalized.ok).toBe(true);
    expect(finalized.environment?.DATABASE_URL).toBe(OK_TARGET);
  });
});

describe('vitestChildArgs (fixed invocation)', () => {
  it('never forwards caller CLI args', () => {
    expect(vitestChildArgs()).toEqual(['exec', '--', 'vitest', 'run']);
  });
});

describe('seedChildArgs (fixed seed invocation)', () => {
  it('runs the fixed tsx seed entrypoint with no caller args forwarded', () => {
    expect(seedChildArgs()).toEqual([
      'exec',
      '--',
      'tsx',
      'scripts/e2e/seed-vitest-db.ts',
    ]);
  });
});

describe('orchestrateVitestDbLifecycle', () => {
  function makeHandlers(fail: Record<string, string | undefined> = {}) {
    const called: string[] = [];
    const wasInterrupted: Record<string, boolean> = {};
    const step = (name: string): Promise<void> => {
      called.push(name);
      const failure = fail[name];
      return failure !== undefined
        ? Promise.reject(new Error(failure))
        : Promise.resolve();
    };
    return {
      called,
      wasInterrupted,
      handlers: {
        interrupted: () => false,
        migrate: () => step('migrate'),
        initialReset: () => step('initial_reset'),
        seed: () => step('fixture_seed'),
        tests: () => step('vitest'),
        finalReset: () => step('final_reset'),
      },
    };
  }

  it('runs migrate → initial_reset → fixture_seed → vitest → final_reset', async () => {
    const { called, handlers } = makeHandlers();
    const result = await orchestrateVitestDbLifecycle(handlers);
    expect(called).toEqual([
      'migrate',
      'initial_reset',
      'fixture_seed',
      'vitest',
      'final_reset',
    ]);
    expect(result.ok).toBe(true);
    expect(result.lifecycleStarted).toBe(true);
  });

  it('preserves the first failure yet still performs the final reset', async () => {
    const { called, handlers } = makeHandlers({ vitest: 'TESTS_FAILED' });
    const result = await orchestrateVitestDbLifecycle(handlers);
    expect(called).toEqual([
      'migrate',
      'initial_reset',
      'fixture_seed',
      'vitest',
      'final_reset',
    ]);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('TESTS_FAILED');
    expect(result.cleanupError).toBeUndefined();
    expect(result.lifecycleStarted).toBe(true);
  });

  it('reports both the first failure and a later cleanup failure', async () => {
    const { called, handlers } = makeHandlers({
      vitest: 'TESTS_FAILED',
      final_reset: 'E2E_RESET_FAILED',
    });
    const result = await orchestrateVitestDbLifecycle(handlers);
    expect(called).toEqual([
      'migrate',
      'initial_reset',
      'fixture_seed',
      'vitest',
      'final_reset',
    ]);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('TESTS_FAILED');
    expect(result.cleanupError).toBe('E2E_RESET_FAILED');
  });

  it('never starts tests or resets when migration fails', async () => {
    const { called, handlers } = makeHandlers({
      migrate: 'E2E_MIGRATE_FAILED',
    });
    const result = await orchestrateVitestDbLifecycle(handlers);
    expect(called).toEqual(['migrate']);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('E2E_MIGRATE_FAILED');
    expect(result.lifecycleStarted).toBe(false);
  });

  it('a failed initial reset does not trigger a (redundant) final reset', async () => {
    const { called, handlers } = makeHandlers({
      initial_reset: 'E2E_RESET_FAILED',
    });
    const result = await orchestrateVitestDbLifecycle(handlers);
    expect(called).toEqual(['migrate', 'initial_reset']);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('E2E_RESET_FAILED');
    expect(result.lifecycleStarted).toBe(false);
  });

  it('a failed fixture seed never starts Vitest but still owes the final reset', async () => {
    const { called, handlers } = makeHandlers({
      fixture_seed: 'E2E_SEED_FAILED',
    });
    const result = await orchestrateVitestDbLifecycle(handlers);
    expect(called).toEqual([
      'migrate',
      'initial_reset',
      'fixture_seed',
      'final_reset',
    ]);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('E2E_SEED_FAILED');
    expect(result.lifecycleStarted).toBe(true);
  });

  it('a signal during the fixture seed skips tests but still owes the final reset', async () => {
    const { called, handlers } = makeHandlers();
    handlers.interrupted = () => called.includes('fixture_seed');
    const result = await orchestrateVitestDbLifecycle(handlers);
    // Seed completed (no signal yet), then tests are aborted (signal during
    // the seed), final reset still runs.
    expect(called).toEqual([
      'migrate',
      'initial_reset',
      'fixture_seed',
      'final_reset',
    ]);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('E2E_LIFECYCLE_ABORTED');
    expect(result.lifecycleStarted).toBe(true);
  });

  it('aborts before any DB work when interrupted during pending acquisition', async () => {
    const called: string[] = [];
    const track = (name: string) => async () => {
      called.push(name);
    };
    const result = await orchestrateVitestDbLifecycle({
      interrupted: () => true,
      migrate: track('migrate'),
      initialReset: track('initial_reset'),
      tests: track('vitest'),
      finalReset: track('final_reset'),
    });
    expect(called).toEqual([]);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('E2E_LIFECYCLE_ABORTED');
    expect(result.lifecycleStarted).toBe(false);
  });

  it('a signal during migration cannot start the reset or tests', async () => {
    const { called, handlers } = makeHandlers();
    handlers.interrupted = () => called.includes('migrate'); // signal mid-migrate
    const result = await orchestrateVitestDbLifecycle(handlers);
    expect(called).toEqual(['migrate']);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('E2E_LIFECYCLE_ABORTED');
    expect(result.lifecycleStarted).toBe(false);
  });

  it('interruption after the initial reset skips tests but still owes the final reset', async () => {
    const { called, handlers } = makeHandlers();
    handlers.interrupted = () => called.includes('initial_reset');
    const result = await orchestrateVitestDbLifecycle(handlers);
    expect(called).toEqual(['migrate', 'initial_reset', 'final_reset']);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('E2E_LIFECYCLE_ABORTED');
    expect(result.lifecycleStarted).toBe(true);
  });
});

/** A fully fake lease: avoids Prisma entirely for lead-level tests. */
function makeFakeLease(calls: string[]) {
  let confirmed = false;
  return {
    // Mirrors the real store: ready() is idempotent (same settled promise).
    ready: async () => {
      if (!confirmed) {
        confirmed = true;
        calls.push('confirmed');
      }
    },
    release: async () => {
      calls.push('unlock');
      return 'released';
    },
  };
}

describe('runVitestDbLead (fake deps, no DB)', () => {
  function makeLeadDeps() {
    const calls: string[] = [];
    const envs: Array<unknown> = [];
    const recordEnv = (env: unknown) => {
      envs.push(env);
      return env;
    };
    const deps = (overrides: Record<string, string | undefined> = {}) => ({
      writeError: (message: string) => calls.push(`refused:${message}`),
      // Wiring check: the lead DOES pass the store it created to lockDeps.
      lockDeps: (store: unknown) => {
        calls.push(store ? 'lockDeps:store' : 'lockDeps:no-store');
        return {
          acquire: () => {
            calls.push('acquire');
            return makeFakeLease(calls);
          },
          release: () => {
            calls.push('release-lease');
            return Promise.resolve();
          },
        };
      },
      migrate: async (env: unknown) => {
        calls.push('migrate');
        recordEnv(env);
        if (overrides.migrateError) throw new Error(overrides.migrateError);
      },
      resetDatabaseData: async (env: unknown) => {
        calls.push('reset');
        recordEnv(env);
        if (overrides.resetError) throw new Error(overrides.resetError);
      },
      seedFixtures: async (env: unknown) => {
        calls.push('seed');
        recordEnv(env);
        if (overrides.seedError) throw new Error(overrides.seedError);
      },
      runTests: async (env: unknown) => {
        calls.push('vitest');
        recordEnv(env);
        if (overrides.testsError) throw new Error(overrides.testsError);
      },
      interrupted: () => false,
    });
    return { calls, envs, deps };
  }

  it('refuses the preflight and spawns no tests, resets or lock', async () => {
    const { calls, deps } = makeLeadDeps();
    const result = await runVitestDbLead(
      deps({}),
      envWith({ DATABASE_URL: OK_TARGET }),
    );
    expect(result.started).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('E2E_DATABASE_URL_REQUIRED');
    // Refusal message written, but ZERO lifecycle activity.
    expect(calls.some((call) => call.startsWith('refused:'))).toBe(true);
    expect(calls).not.toContain('acquire');
    expect(calls).not.toContain('confirmed');
    expect(calls).not.toContain('migrate');
    expect(calls).not.toContain('reset');
    expect(calls).not.toContain('vitest');
    expect(calls).not.toContain('release-lease');
  });

  it('aborts without any DB work when already interrupted before lock acquisition', async () => {
    const { calls, deps } = makeLeadDeps();
    const wired = deps({});
    wired.interrupted = () => true;
    const result = await runVitestDbLead(
      wired,
      envWith({ CIVICOS_E2E_DATABASE_URL: OK_TARGET }),
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe('E2E_LIFECYCLE_ABORTED');
    expect(result.started).toBe(false);
    expect(result.steps).toEqual([]);
    // No lock wiring, no acquire, no migrate, no reset, no vitest.
    expect(calls).toEqual([]);
  });

  it('wires lockDeps with the store the lead created (exactly one store argument)', async () => {
    const { calls, deps } = makeLeadDeps();
    let seenStore: unknown;
    const wired = deps({});
    wired.lockDeps = (store: unknown) => {
      seenStore = store;
      return {
        acquire: () => makeFakeLease(calls),
        release: () => Promise.resolve(),
      };
    };
    await runVitestDbLead(
      wired,
      envWith({ CIVICOS_E2E_DATABASE_URL: OK_TARGET }),
    );
    // The store must be a real object (not undefined) — this is the exact
    // defect where the entry-point closure received no argument.
    expect(seenStore).toBeTruthy();
    expect(typeof (seenStore as { build: unknown }).build).toBe('function');
    expect(typeof (seenStore as { release: unknown }).release).toBe('function');
  });

  it('serializes migrate → reset → seed → vitest → reset under the injected lock', async () => {
    const { calls, envs, deps } = makeLeadDeps();
    const result = await runVitestDbLead(
      deps({}),
      envWith({ CIVICOS_E2E_DATABASE_URL: OK_TARGET }),
    );
    expect(result.ok).toBe(true);
    expect(result.steps).toEqual([
      'migrate',
      'initial_reset',
      'fixture_seed',
      'vitest',
      'final_reset',
    ]);
    expect(calls).toEqual([
      'lockDeps:store',
      'acquire',
      'confirmed',
      'migrate',
      'reset',
      'seed',
      'vitest',
      'reset',
      'release-lease',
    ]);
    // migrate, seed and vitest all run with the EXACT same childEnv object.
    expect(envs[0]).toBe(envs[2]);
    expect(envs[2]).toBe(envs[3]);
  });

  it('never starts Vitest when the fixture seed fails, and still resets', async () => {
    const { calls, deps } = makeLeadDeps();
    const result = await runVitestDbLead(
      deps({ seedError: 'E2E_SEED_FAILED' }),
      envWith({ CIVICOS_E2E_DATABASE_URL: OK_TARGET }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe('E2E_SEED_FAILED');
    expect(result.steps).toEqual([
      'migrate',
      'initial_reset',
      'fixture_seed_failed',
      'tests_skipped',
      'final_reset',
    ]);
    // Seed ran, then cleanup; NO Vitest.
    expect(calls).toEqual([
      'lockDeps:store',
      'acquire',
      'confirmed',
      'migrate',
      'reset',
      'seed',
      'reset',
      'release-lease',
    ]);
    expect(calls).not.toContain('vitest');
  });

  it('still resets when Vitest fails and reports the first failure once', async () => {
    const { calls, deps } = makeLeadDeps();
    const result = await runVitestDbLead(
      deps({ testsError: 'TESTS_FAILED' }),
      envWith({ CIVICOS_E2E_DATABASE_URL: OK_TARGET }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe('TESTS_FAILED');
    // Final reset (lock still held) and release both happen after the failure.
    expect(calls).toEqual([
      'lockDeps:store',
      'acquire',
      'confirmed',
      'migrate',
      'reset',
      'seed',
      'vitest',
      'reset',
      'release-lease',
    ]);
  });

  it('aborts without any DB work when already interrupted before lock acquisition', async () => {
    const { calls, deps } = makeLeadDeps();
    const wired = deps({});
    wired.interrupted = () => true;
    const result = await runVitestDbLead(
      wired,
      envWith({ CIVICOS_E2E_DATABASE_URL: OK_TARGET }),
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe('E2E_LIFECYCLE_ABORTED');
    expect(result.started).toBe(false);
    expect(result.steps).toEqual([]);
    // No lock wiring, no acquire, no migrate, no reset, no vitest.
    expect(calls).toEqual([]);
  });

  it('uses the DEFAULT store closed over ownerClient when lockDeps is omitted', async () => {
    // This covers the real entry point's wiring shape (store + owner client).
    const { client, queries } = makeFakePrisma(true);
    const calls: string[] = [];
    const result = await runVitestDbLead(
      {
        ownerClient: client,
        writeError: () => undefined,
        migrate: async () => {
          calls.push('migrate');
        },
        resetDatabaseData: async () => {
          calls.push('reset');
        },
        seedFixtures: async () => {
          calls.push('seed');
        },
        runTests: async () => {
          calls.push('vitest');
        },
        interrupted: () => false,
      },
      envWith({ CIVICOS_E2E_DATABASE_URL: OK_TARGET }),
    );
    expect(result.ok).toBe(true);
    expect(calls).toEqual(['migrate', 'reset', 'seed', 'vitest', 'reset']);
    expect(queries.some((q) => q.sql === E2E_ADVISORY_LOCK_TRY_ACQUIRE_SQL)).toBe(
      true,
    );
    expect(queries.some((q) => q.sql === E2E_ADVISORY_LOCK_RELEASE_SQL)).toBe(
      true,
    );
  });
});

/** Fake Prisma client with an optional controllable acquire phase (no DB). */
function makeFakePrisma(acquired?: boolean, parkAcquire = false) {
  const queries: Array<{ owner: object; sql: string }> = [];
  const sharedOwner = { session: 'owner' };
  let openAcquireGate: (() => void) | undefined;
  const acquireGate = new Promise<void>((resolve) => {
    openAcquireGate = resolve;
  });
  const client = {
    $transaction: (callback: (tx: unknown) => Promise<void>) =>
      (async () => {
        const tx = {
          $queryRawUnsafe: async (sql: string) => {
            queries.push({ owner: sharedOwner, sql });
            if (sql === E2E_ADVISORY_LOCK_ACQUIRE_SQL || sql === E2E_ADVISORY_LOCK_TRY_ACQUIRE_SQL) {
              if (parkAcquire) await acquireGate; // parked to simulate pending
              return [{ acquired: acquired === false ? undefined : true }];
            }
            return [];
          },
        };
        await callback(tx);
      })(),
  };
  return { client, queries, openAcquireGate };
}

describe('createVitestDbLeaseStore (fake Prisma, no DB)', () => {
  it('uses cancellable nonblocking try-lock and aborts without lifecycle work when unavailable', async () => {
    const store = createVitestDbLeaseStore();
    const queries: string[] = [];
    const client = {
      $transaction: (callback: (tx: unknown) => Promise<void>) =>
        callback({ $queryRawUnsafe: async (sql: string) => { queries.push(sql); return [{ acquired: false }]; } }),
    };
    const lease = store.build(client as never);
    const ready = lease.ready();
    await Promise.resolve();
    await store.cancelPendingAcquisition();
    await expect(ready).rejects.toThrow('E2E_LIFECYCLE_ABORTED');
    expect(queries).toContain(E2E_ADVISORY_LOCK_TRY_ACQUIRE_SQL);
    expect(queries).not.toContain(E2E_ADVISORY_LOCK_ACQUIRE_SQL);
    expect(queries).not.toContain(E2E_ADVISORY_LOCK_RELEASE_SQL);
  });
  it('confirms { acquired: true } and unlocks on the SAME session at release', async () => {
    const store = createVitestDbLeaseStore();
    const { client, queries } = makeFakePrisma(true);
    let ran = false;
    await runWithE2EWholeRunLock(
      buildVitestDbLockDeps(store, client as never),
      async (lease: { ready(): Promise<unknown> }) => {
        await lease.ready();
        ran = true; // body may only run once ownership is confirmed
      },
    );
    expect(ran).toBe(true);
    const acquires = queries.filter(
      (q) => q.sql === E2E_ADVISORY_LOCK_TRY_ACQUIRE_SQL,
    );
    const unlocks = queries.filter(
      (q) => q.sql === E2E_ADVISORY_LOCK_RELEASE_SQL,
    );
    expect(acquires).toHaveLength(1);
    expect(unlocks).toHaveLength(1);
    expect(unlocks[0]?.owner).toBe(acquires[0]?.owner); // same owner session
  });

  it('never runs the body when ownership is not confirmed', async () => {
    const store = createVitestDbLeaseStore();
    const { client } = makeFakePrisma(false);
    let ran = false;
    await expect(
      runWithE2EWholeRunLock(
        buildVitestDbLockDeps(store, client as never),
        async () => {
          ran = true;
        },
      ),
    ).rejects.toThrow('E2E_ADVISORY_LOCK_FAILED');
    expect(ran).toBe(false);
  });

  it('performs the unlock exactly once over repeated releases', async () => {
    const store = createVitestDbLeaseStore();
    const { client, queries } = makeFakePrisma(true);
    const lease = store.build(client as never);
    await lease.ready();
    const outcomes = await Promise.all([lease.release(), lease.release()]);
    const unlocks = queries.filter(
      (q) => q.sql === E2E_ADVISORY_LOCK_RELEASE_SQL,
    );
    expect(unlocks).toHaveLength(1);
    expect(outcomes.every((o) => o === 'released' || o === 'latched')).toBe(
      true,
    );
    // References are cleared after settle: further releases are store no-ops.
    expect(await lease.release()).toBe('latched');
  });

  it('a release request BEFORE build latches and aborts ready once acquired', async () => {
    const store = createVitestDbLeaseStore();
    // Release before any lease exists — the request must not be forgotten.
    expect(await store.release()).toBe('latched');
    const { client, queries } = makeFakePrisma(true);
    const lease = store.build(client as never);
    await expect(lease.ready()).rejects.toThrow('E2E_LIFECYCLE_ABORTED');
    // The latched semantics unlock on that (single) owner session as soon as
    // acquisition confirms.
    const acquires = queries.filter(
      (q) => q.sql === E2E_ADVISORY_LOCK_TRY_ACQUIRE_SQL,
    );
    expect(acquires).toHaveLength(1);
    expect(
      queries.some(
        (q) =>
          q.sql === E2E_ADVISORY_LOCK_RELEASE_SQL &&
          q.owner === acquires[0]?.owner,
      ),
    ).toBe(true);
    // Wait for the owner transaction to fully settle, then confirm no body ran.
    await store.release(); // waits for the TransactionGuard to settle
  });

  it('a release request WHILE acquiring unlocks on the same session and fails ready', async () => {
    const store = createVitestDbLeaseStore();
    const { client, queries, openAcquireGate } = makeFakePrisma(true, true);
    const lease = store.build(client as never);
    const readyPromise = lease.ready();
    // Release arrives DURING the still-pending acquire SQL.
    const releasePromise = lease.release();
    openAcquireGate?.();
    await expect(readyPromise).rejects.toThrow('E2E_LIFECYCLE_ABORTED');
    expect(await releasePromise).toBe('released');
    const acquires = queries.filter(
      (q) => q.sql === E2E_ADVISORY_LOCK_TRY_ACQUIRE_SQL,
    );
    const unlocks = queries.filter(
      (q) => q.sql === E2E_ADVISORY_LOCK_RELEASE_SQL,
    );
    expect(acquires).toHaveLength(1);
    expect(unlocks).toHaveLength(1);
    expect(unlocks[0]?.owner).toBe(acquires[0]?.owner); // same owner session
  });

  it('cancels pending acquisition and unlocks on the owner session', async () => {
    const store = createVitestDbLeaseStore();
    const { client, queries, openAcquireGate } = makeFakePrisma(true, true);
    const lease = store.build(client as never);
    const readyPromise = lease.ready();
    const cancelPromise = store.cancelPendingAcquisition();
    openAcquireGate?.();
    await expect(readyPromise).rejects.toThrow('E2E_LIFECYCLE_ABORTED');
    await cancelPromise;
    expect(queries.filter((q) => q.sql === E2E_ADVISORY_LOCK_RELEASE_SQL)).toHaveLength(1);
  });

  it('cancellation after ready keeps the lock until normal release, without duplicate unlock', async () => {
    const store = createVitestDbLeaseStore();
    const { client, queries } = makeFakePrisma(true);
    const lease = store.build(client as never);
    await lease.ready();
    await store.cancelPendingAcquisition();
    expect(queries.filter((q) => q.sql === E2E_ADVISORY_LOCK_RELEASE_SQL)).toHaveLength(0);
    await lease.release();
    await store.release();
    expect(queries.filter((q) => q.sql === E2E_ADVISORY_LOCK_RELEASE_SQL)).toHaveLength(1);
  });
});
