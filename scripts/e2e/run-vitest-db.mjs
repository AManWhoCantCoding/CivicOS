// Direct Node runner for database-backed Vitest work (database-consolidation
// slice). It is the ONLY supported lifecycle for DB-backed Vitest suites:
//
//   node scripts/e2e/run-vitest-db.mjs
//
// Contract (mirrors scripts/e2e/playwright-services.mjs, PS-E1-007):
// - Snapshots the process-only `CIVICOS_E2E_DATABASE_URL` and validates the
//   exact 127.0.0.1:5432/civicos_e2e target BEFORE loading any .env file or
//   importing/constructing Prisma. There is no fallback to .env, DATABASE_URL,
//   DEMO_DATABASE_URL or any other alias — see scripts/e2e/e2e-target.mjs.
// - Builds a child env that sets `DATABASE_URL` and the explicit target to the
//   validated URL, `RUN_DB_TESTS=1` and the `CIVICOS_E2E_LIFECYCLE=1` marker,
//   and strips main-db aliases (`DEMO_DATABASE_URL`, `CIVICOS_DATABASE_URL`,
//   `CIVICOS_TEST_DATABASE_URL`) so no test-consumed alias can point at the
//   production/demo `civicos` database. The Vitest setup file
//   (tests/e2e/vitest-db-safety.ts) re-validates marker + explicit target +
//   effective DATABASE_URL agreement before DB-backed suites are imported.
// - Holds the shared whole-run advisory lock (key 1128236101, same as the
//   Playwright/Python runners) on ONE persistent Prisma interactive
//   transaction for migrate → initial reset → vitest → final reset. Resets
//   use separate short-lived Prisma clients and never run without the lock.
// - Never creates/drops databases and never resets `civicos` or replay DBs.
//
// Error output carries stable codes only — never a URL, credentials or
// connection strings.

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

import { resolveE2EDatabaseTarget } from './e2e-target.mjs';
import {
  E2E_ADVISORY_LOCK_RELEASE_SQL,
  acquireE2EAdvisoryLockCancellable,
  runWithE2EWholeRunLock,
  resetE2EDatabaseData,
} from './database-lifecycle.mjs';

const require = createRequire(import.meta.url);

/** Lifecycle marker the child env must carry for DB-backed Vitest suites. */
export const VITEST_DB_LIFECYCLE_MARKER = 'CIVICOS_E2E_LIFECYCLE';
export const VITEST_DB_LIFECYCLE_MARKER_VALUE = '1';
/** Process-run gate for DB-backed Vitest suites. */
export const VITEST_DB_RUN_FLAG = 'RUN_DB_TESTS';

/**
 * Aliases that may point at the main/demo `civicos` database. In DB-test mode
 * they are refused by the strict gate and stripped from the runner child env:
 * only the validated civicos_e2e URL may ever reach a suite.
 */
export const UNSAFE_MAIN_DB_ALIASES = Object.freeze([
  'DEMO_DATABASE_URL',
  'CIVICOS_DATABASE_URL',
  'CIVICOS_TEST_DATABASE_URL',
]);

/**
 * Strict, credential-free gate used by BOTH the runner preflight and the
 * Vitest setup file. Behavior:
 * - `RUN_DB_TESTS !== '1'` → ok, DB tests are not requested (ordinary runs
 *   stay DB-free and remain untouched).
 * - Otherwise ALL of the following must agree before any DB suite is
 *   imported: the explicit lifecycle marker, a valid explicit
 *   `CIVICOS_E2E_DATABASE_URL`, and an effective `DATABASE_URL` equal to
 *   that exact validated target. Any main-db alias present is refused.
 * Never includes a URL or credentials in refusal codes.
 */
export function validateVitestDbLifecycleEnv(env) {
  if (env?.[VITEST_DB_RUN_FLAG] !== '1') {
    return { ok: true, dbTestsRequested: false };
  }
  for (const alias of UNSAFE_MAIN_DB_ALIASES) {
    if (typeof env[alias] === 'string' && env[alias] !== '') {
      return {
        ok: false,
        dbTestsRequested: true,
        code: 'E2E_MAIN_DB_ALIAS_REFUSED',
      };
    }
  }
  if (env?.[VITEST_DB_LIFECYCLE_MARKER] !== VITEST_DB_LIFECYCLE_MARKER_VALUE) {
    return {
      ok: false,
      dbTestsRequested: true,
      code: 'E2E_LIFECYCLE_MARKER_REQUIRED',
    };
  }
  let targetUrl;
  try {
    targetUrl = resolveTargetHref(env);
  } catch (error) {
    return {
      ok: false,
      dbTestsRequested: true,
      code: error instanceof Error ? error.message : 'E2E_DATABASE_URL_REFUSED',
    };
  }
  if (env.DATABASE_URL !== targetUrl) {
    return {
      ok: false,
      dbTestsRequested: true,
      code: 'E2E_DATABASE_URL_TARGET_MISMATCH',
    };
  }
  return { ok: true, dbTestsRequested: true, targetUrl };
}

function resolveTargetHref(env) {
  const url = resolveE2EDatabaseTarget(env);
  return url.href;
}

/**
 * Build the child process env for the DB-backed Vitest run. Pure with respect
 * to its input: the caller passes a SNAPSHOT of process.env taken BEFORE any
 * env-file load, so a variable that only exists in .env can never become the
 * explicit target. Strips unsafe main-db aliases, then forces the validated
 * target onto `DATABASE_URL` and `CIVICOS_E2E_DATABASE_URL`, plus
 * `RUN_DB_TESTS=1` and the lifecycle marker. The result is re-validated with
 * the strict gate, so a returned ok childEnv always passes the setup file.
 */
export function buildVitestDbChildEnv(snapshot) {
  const childEnv = { ...snapshot };
  for (const alias of UNSAFE_MAIN_DB_ALIASES) delete childEnv[alias];
  childEnv[VITEST_DB_RUN_FLAG] = '1';
  childEnv[VITEST_DB_LIFECYCLE_MARKER] = VITEST_DB_LIFECYCLE_MARKER_VALUE;

  // Fail closed on the EXPLICIT target first: snapshot-based, credential-free.
  let targetHref;
  try {
    targetHref = resolveTargetHref(childEnv);
  } catch (error) {
    return {
      ok: false,
      code: error instanceof Error ? error.message : 'E2E_DATABASE_URL_REFUSED',
    };
  }
  childEnv.CIVICOS_E2E_DATABASE_URL = targetHref;
  childEnv.DATABASE_URL = targetHref;
  const validated = validateVitestDbLifecycleEnv(childEnv);
  if (!validated.ok) return { ok: false, code: validated.code };
  return { ok: true, targetUrl: validated.targetUrl, childEnv };
}

/**
 * Finalize the child run env AFTER env files have been merged into
 * process.env: merge fresh values, then re-apply the validated target and
 * strip main-db aliases that may have arrived from .env. The validated target
 * never comes from .env (it was fixed by buildVitestDbChildEnv).
 */
export function finalizeVitestDbChildEnv(childEnv, mergedEnv) {
  const environment = { ...mergedEnv, ...childEnv };
  for (const alias of UNSAFE_MAIN_DB_ALIASES) delete environment[alias];
  const validated = validateVitestDbLifecycleEnv(environment);
  if (!validated.ok) return { ok: false, code: validated.code };
  return { ok: true, environment };
}

/**
 * Orchestrates the DB lifecycle steps. Pure with respect to the injected
 * handlers, so step ordering, final-reset guarantees and failure reporting
 * can be verified without any database access:
 * - Baseline fixture seeding (optional `seed` handler) runs strictly between
 *   the initial reset and Vitest, under the same whole-run advisory lock; a
 *   failed seed never starts Vitest and does not cancel the owed final reset.
 * - Never reaches the test phase unless migrate AND the initial reset were
 *   attempted (fail closed: a preflight failure spawns no tests and performs
 *   no resets).
 * - Only once the initial reset SUCCEEDED is the final reset owed — a failed
 *   initial reset does not trigger a second (redundant) reset. After a
 *   successful reset the final reset is attempted on every path — after
 *   fixture-seed failure, Vitest failure, interruption alike.
 * - Preserves the FIRST meaningful failure and still reports a cleanup
 *   failure separately.
 *
 * @param {{
 *   migrate: () => Promise<unknown>,
 *   initialReset: () => Promise<unknown>,
 *   seed?: () => Promise<unknown>,
 *   tests: () => Promise<unknown>,
 *   finalReset: () => Promise<unknown>,
 *   interrupted?: () => boolean,
 * }} handlers
 * @param {string[]} [steps] optional recorder for pure-seam tests
 * @returns {Promise<{ ok: boolean, error?: string, cleanupError?: string,
 *   lifecycleStarted: boolean }>}
 */
export async function orchestrateVitestDbLifecycle(handlers, steps = []) {
  let lifecycleStarted = false;
  let firstError;
  let cleanupError;
  const fail = (error) => {
    firstError = firstError ?? error;
  };
  const interrupted = () => handlers.interrupted?.() === true;
  try {
    if (interrupted()) throw new Error('E2E_LIFECYCLE_ABORTED');
    await handlers.migrate();
    steps.push('migrate');
    // Check again at each boundary: a signal during migration must not start
    // the initial reset or tests. Nothing was seeded yet, so no reset is owed.
    if (interrupted()) throw new Error('E2E_LIFECYCLE_ABORTED');
    await handlers.initialReset();
    steps.push('initial_reset');
    // Owed from here on: the initial reset SUCCEEDED, so application rows may
    // exist (tests/seed may run) and the final reset is due on every path —
    // including interruption and test failure below.
    lifecycleStarted = true;
    // Once the initial reset succeeded, the final reset is owed even if the
    // fixture seed or tests are then aborted/failed — interruption here only
    // skips the later phases.
    if (interrupted()) {
      fail(new Error('E2E_LIFECYCLE_ABORTED'));
      steps.push('tests_aborted');
    } else {
      // Baseline fixture seed, still under the acquired whole-run lock and
      // STRICTLY between the initial reset and Vitest. Optional seam so the
      // pure orchestrator tests can exercise both shapes. On seed failure the
      // failure is recorded, Vitest is NOT started, and the final reset is
      // still attempted in `finally`.
      try {
        await handlers.seed?.();
        steps.push('fixture_seed');
      } catch (error) {
        fail(error);
        steps.push('fixture_seed_failed');
      }
      // Nothing new was seeded on failure, but the initial reset already ran:
      // a signal during the seed still skips tests and owes the final reset.
      if (firstError) {
        steps.push('tests_skipped');
      } else if (interrupted()) {
        fail(new Error('E2E_LIFECYCLE_ABORTED'));
        steps.push('tests_aborted');
      } else {
        try {
          await handlers.tests();
          steps.push('vitest');
        } catch (error) {
          fail(error);
          steps.push('vitest_failed');
        }
      }
    }
  } catch (error) {
    fail(error);
  } finally {
    if (lifecycleStarted) {
      try {
        await handlers.finalReset();
        steps.push('final_reset');
      } catch (error) {
        if (!cleanupError) cleanupError = error;
        steps.push('final_reset_failed');
      }
    }
  }
  if (firstError) {
    return {
      ok: false,
      error:
        firstError instanceof Error ? firstError.message : String(firstError),
      cleanupError: cleanupError ? messageOf(cleanupError) : undefined,
      lifecycleStarted,
    };
  }
  if (cleanupError) {
    return {
      ok: false,
      error: messageOf(cleanupError),
      cleanupError: messageOf(cleanupError),
      lifecycleStarted,
    };
  }
  return { ok: true, lifecycleStarted };
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Whole-run lease on ONE persistent Prisma client. Mirrors the Playwright
 * runner: ownership is only confirmed when the acquire SQL returns
 * `{ acquired: true }` on the transaction session, the unlock SQL runs on
 * that SAME session before the transaction closes, and the transaction
 * reference is cleared only AFTER it has fully settled.
 *
 * Abort/release semantics: a release request may arrive at ANY time, even
 * before a lease is ever built. It is LATCHED store-wide, forwarded to the
 * gate the moment one exists, and honored by the owner transaction as soon as
 * acquisition confirms — unlocking on that same session and failing the
 * pending `ready()` closed instead of starting the run unowned/then-abandoned.
 */
export function createVitestDbLeaseStore() {
  let guardPromise = null;
  let releaseGate = null; // { promise, resolve } — created inside build()
  let releaseRequested = false;
  let acquisitionCancelled = false;
  let ownershipConfirmed = false;
  let acquisitionController = null;

  function build(client) {
    const readySignal = {};
    const ready = new Promise((resolve, reject) => {
      Object.assign(readySignal, { resolve, reject });
    });
    // Release gate created BEFORE the transaction starts, honoring any latch
    // that arrived before build: an already-latched request resolves it now.
    releaseGate = { promise: null, resolve: null };
    releaseGate.promise = new Promise((resolve) => {
      releaseGate.resolve = resolve;
    });
    if (releaseRequested || acquisitionCancelled) releaseGate.resolve();
    acquisitionController = new AbortController();
    guardPromise = client.$transaction(
      async (tx) => {
        const acquired = await acquireE2EAdvisoryLockCancellable(
          (sql) => tx.$queryRawUnsafe(sql),
          acquisitionController.signal,
        );
        if (!acquired) {
          readySignal.reject(new Error('E2E_LIFECYCLE_ABORTED'));
          throw new Error('E2E_LIFECYCLE_ABORTED');
        }
        // A request latched while acquisition was pending must NOT confirm
        // ownership to the run: unlock on THIS session right away and fail
        // ready closed.
        if (releaseRequested || acquisitionCancelled) {
          releaseGate.resolve();
          await releaseGate.promise;
          await tx.$queryRawUnsafe(E2E_ADVISORY_LOCK_RELEASE_SQL);
          readySignal.reject(new Error('E2E_LIFECYCLE_ABORTED'));
          throw new Error('E2E_LIFECYCLE_ABORTED');
        }
        ownershipConfirmed = true;
        readySignal.resolve();
        // Park on the pre-created gate; release() resolves it at any time.
        await releaseGate.promise;
        // Release on the SAME owner session before the transaction closes.
        await tx.$queryRawUnsafe(E2E_ADVISORY_LOCK_RELEASE_SQL);
      },
      { timeout: 2_147_483_647 },
    );
    // A lost/failing owner session must fail closed: `ready()` races the
    // guard, so the run aborts instead of proceeding unowned.
    guardPromise.catch(() => undefined);
    return {
      // Fail closed even for a release that raced just after resolve: a
      // latched request aborts the run instead of proceeding unowned; the
      // orchestrator boundary checks then prevent any DB work.
      ready: () =>
        Promise.race([ready, guardPromise]).then((outcome) => {
          if (releaseRequested) throw new Error('E2E_LIFECYCLE_ABORTED');
          return outcome;
        }),
      release: releaseOnce,
    };
  }

  /**
   * Idempotent release. Latches the request even before a lease exists
   * (returns 'latched'), resolves the gate while the owner transaction may
   * still be acquiring, and clears references only AFTER the transaction has
   * fully settled.
   */
  async function releaseOnce() {
    releaseRequested = true;
    if (!guardPromise) return 'latched';
    const pending = guardPromise;
    releaseGate?.resolve?.();
    await pending.catch(() => undefined);
    releaseGate = null;
    guardPromise = null;
    return 'released';
  }

  async function cancelPendingAcquisition() {
    if (ownershipConfirmed || releaseRequested) return 'owned';
    acquisitionCancelled = true;
    acquisitionController?.abort();
    if (!guardPromise) return 'latched';
    const pending = guardPromise;
    releaseGate?.resolve?.();
    await pending.catch(() => undefined);
    releaseGate = null;
    guardPromise = null;
    return 'cancelled';
  }

  return { build, release: releaseOnce, cancelPendingAcquisition };
}

/**
 * Build the advisory-lock deps for runWithE2EWholeRunLock from a lease store.
 * Exported so the store itself stays injectable in DB-free tests.
 */
export function buildVitestDbLockDeps(leaseStore, owner) {
  return {
    acquire: () => leaseStore.build(owner),
    release: (lease) => lease.release(),
  };
}

/**
 * Parameterized lead routine shared by main() and DB-free unit tests.
 * `snapshot` MUST be the process-only env snapshot (before env-file loading).
 * Returns `{ started: false, code }` on preflight failure — no test spawn, no
 * lock acquisition, no DB work.
 *
 * `deps.lockDeps` (optional) is invoked as `deps.lockDeps(leaseStore)` with
 * EXACTLY one argument — the lease store the lead created for this run — so
 * the real entry point wires its closure over that same store and its owner
 * client. Omitting it uses the default store closed over `deps.ownerClient`.
 */
export async function runVitestDbLead(deps, snapshot) {
  const plan = buildVitestDbChildEnv(snapshot);
  const steps = [];
  if (!plan.ok) {
    deps.writeError?.(
      `vitest-db runner refused: ${plan.code}\n` +
        'Set the explicit CIVICOS_E2E_DATABASE_URL target (127.0.0.1:5432/civicos_e2e) and rerun via scripts/e2e/run-vitest-db.mjs.\n',
    );
    return { ...plan, started: false, steps };
  }
  // A signal that arrived before lock acquisition begins aborts here:
  // no lock acquire, no migrate, no reset. (A signal DURING pending
  // acquisition is handled by the store's release latch, forwarded by the
  // signal handler to the active lease.)
  if (deps.interrupted?.()) {
    return {
      ok: false,
      code: 'E2E_LIFECYCLE_ABORTED',
      started: false,
      steps,
    };
  }
  const leaseStore = createVitestDbLeaseStore();
  const lockDeps =
    deps.lockDeps?.(leaseStore) ??
    buildVitestDbLockDeps(leaseStore, deps.ownerClient);
  const withSteps = await runWithE2EWholeRunLock(lockDeps, async (lease) => {
    // `interrupted` is re-checked by the orchestrator at every boundary;
    // a release latched during pending acquisition fails `ready()` here.
    await lease.ready();
    return orchestrateVitestDbLifecycle(
      {
        interrupted: () => deps.interrupted?.() === true,
        migrate: () => deps.migrate(plan.childEnv),
        initialReset: () => deps.resetDatabaseData(plan.targetUrl),
        // Seed fires with the SAME sanitized lifecycle env, strictly between
        // the initial reset and Vitest, while the lock is held.
        seed: () => deps.seedFixtures(plan.childEnv),
        tests: () => deps.runTests(plan.childEnv),
        finalReset: () => deps.resetDatabaseData(plan.targetUrl),
      },
      steps,
    );
  });
  return { ...withSteps, steps };
}

/**
 * Separate-client adapter for resetE2EDatabaseData: EVERY reset connection is
 * short-lived and closed exactly once; the persistent owner transaction that
 * holds the lock is never used for resets. Mirrors prismaResetDeps() in
 * playwright-services.mjs.
 */
function prismaResetDeps(targetUrl) {
  return {
    connect: async () => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient({
        // Prisma needs the URL STRING, not a URL object.
        datasources: { db: { url: String(targetUrl) } },
      });
      let connected = false;
      try {
        await prisma.$connect();
        connected = true;
      } finally {
        if (!connected) await prisma.$disconnect().catch(() => undefined);
      }
      return {
        prisma,
        query: async (sql) => {
          const statement = String(sql).trim();
          if (/^(SELECT|WITH)\b/i.test(statement)) {
            const rows = await prisma.$queryRawUnsafe(statement);
            return { rows: Array.isArray(rows) ? rows : [] };
          }
          await prisma.$executeRawUnsafe(statement);
          return { rows: [] };
        },
      };
    },
    disconnect: async (client) => {
      await client?.prisma?.$disconnect();
    },
  };
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * Fixed Vitest child argv: caller CLI args are NEVER forwarded. Tests may
 * only run through the attached vitest config (with the DB-lifecycle safety
 * setup file), so a caller-supplied `--config` or file subset can never
 * bypass the safety gate.
 */
export function vitestChildArgs() {
  return ['exec', '--', 'vitest', 'run'];
}

/** Fixed seed invocation: caller CLI args are never forwarded (tsx, TS seam). */
export function seedChildArgs() {
  return ['exec', '--', 'tsx', 'scripts/e2e/seed-vitest-db.ts'];
}

const winShell = process.platform === 'win32';
const children = new Set();

/** Spawn a child with databases explicitly pointed at the validated target. */
function spawnWithEnv(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      shell: winShell,
      stdio: 'inherit',
    });
    children.add(child);
    child.once('error', (error) => {
      children.delete(child);
      reject(error);
    });
    child.once('exit', (code, signal) => {
      children.delete(child);
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

/** Signal-safe child teardown (taskkill tree on Windows). */
export function waitForChildStop(child, terminate) {
  if (child.exitCode !== null || child.signalCode !== null)
    return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    child.once('exit', done);
    child.once('error', () => {
      if (child.pid == null) done();
    });
    try {
      terminate();
    } catch {
      // Even if termination races with exit, wait for the child's terminal event.
    }
  });
}

async function stopChildren() {
  const current = [...children];
  await Promise.all(
    current.map((child) =>
      waitForChildStop(child, () => {
        if (winShell) {
          const kill = spawn(
            'taskkill.exe',
            ['/pid', String(child.pid), '/t', '/f'],
            {
              shell: false,
              stdio: 'ignore',
            },
          );
          kill.once('exit', () => {});
          kill.once('error', () => {});
        } else {
          child.kill('SIGTERM');
        }
      }),
    ),
  );
}

let abortRequested = false;

async function main() {
  // Signal listeners are registered ONLY for direct CLI execution (inside
  // main, removed in its outer finally on EVERY path) — never as an
  // import-time side effect; the Vitest setup file imports this module in
  // every ordinary worker.
  let activeLeaseStore;
  let ownerClient;
  const signalHandler = () => {
    abortRequested = true;
    const stopping = stopChildren();
    const store = activeLeaseStore;
    if (store)
      void stopping
        .then(() => store.cancelPendingAcquisition())
        .catch(() => undefined);
  };
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, signalHandler);
  try {
    // Process-only snapshot BEFORE any env-file load or Prisma import.
    const snapshot = { ...process.env };
    const plan = buildVitestDbChildEnv(snapshot);
    if (!plan.ok) {
      process.stderr.write(
        `vitest-db runner refused: ${plan.code}\n` +
          'Provide CIVICOS_E2E_DATABASE_URL (exact 127.0.0.1:5432/civicos_e2e target) in the process env; no .env or DATABASE_URL fallback exists.\n',
      );
      process.exitCode = 1;
      return;
    }
    // Only AFTER validation may env files be loaded and Prisma be imported.
    require('@next/env').loadEnvConfig(process.cwd());
    const finalized = finalizeVitestDbChildEnv(plan.childEnv, process.env);
    if (!finalized.ok) {
      process.stderr.write(
        `vitest-db runner refused post-load: ${finalized.code}\n`,
      );
      process.exitCode = 1;
      return;
    }
    const environment = finalized.environment;

    const { PrismaClient } = await import('@prisma/client');
    const owner = new PrismaClient({
      datasources: { db: { url: String(plan.targetUrl) } },
    });
    ownerClient = owner;
    const migrateDeploy = () =>
      spawnWithEnv(
        npm,
        ['exec', '--', 'prisma', 'migrate', 'deploy'],
        environment,
      );
    // Fixed invocation: caller CLI args are never forwarded — the attached
    // vitest config (with the DB-lifecycle safety setup) is part of the
    // supported lifecycle contract.
    const runVitest = () => spawnWithEnv(npm, vitestChildArgs(), environment);
    // Baseline Identity fixture seed: fixed tsx entrypoint, same sanitized
    // lifecycle env (validated target on DATABASE_URL), under the whole-run
    // lock, strictly between the initial reset and Vitest.
    const seedFixtures = () => spawnWithEnv(npm, seedChildArgs(), environment);
    const resetTarget = (targetUrl) =>
      resetE2EDatabaseData(
        { CIVICOS_E2E_DATABASE_URL: targetUrl },
        prismaResetDeps(targetUrl),
      );

    // From this point every exit unwinds through the outer finally: children
    // stopped, lease released (owner-transaction settle awaited), owner
    // disconnected, signal listeners removed.
    const lead = await runVitestDbLead(
      {
        // Wire the lead's store to THIS run's owner client with a closure;
        // the lead passes the store in explicitly as the single argument.
        lockDeps: (store) => {
          activeLeaseStore = store;
          return buildVitestDbLockDeps(store, owner);
        },
        migrate: () => migrateDeploy(),
        resetDatabaseData: (targetUrl) => resetTarget(targetUrl),
        seedFixtures: () => seedFixtures(),
        runTests: () => runVitest(),
        writeError: (message) => process.stderr.write(message),
        interrupted: () => abortRequested,
      },
      snapshot,
    );
    if (lead.started === false) {
      process.exitCode = 1;
      return;
    }
    if (!lead.ok) {
      if (lead.error)
        process.stderr.write(`vitest-db run failed: ${lead.error}\n`);
      if (lead.cleanupError && lead.cleanupError !== lead.error)
        process.stderr.write(
          `vitest-db cleanup failed: ${lead.cleanupError}\n`,
        );
      process.exitCode = 1;
    } else {
      process.stderr.write(
        `vitest-db run completed: ${lead.steps.join(' → ')}\n`,
      );
    }
  } catch (error) {
    process.stderr.write(`vitest-db runner failed: ${messageOf(error)}\n`);
    process.exitCode = 1;
  } finally {
    // Runs on EVERY direct-main path (refusals, env/Prisma setup exceptions,
    // normal completion). Stop children first, then release the lease
    // (awaiting full owner-transaction settle), THEN disconnect the owner,
    // then remove the signal listeners.
    await stopChildren().catch(() => undefined);
    await activeLeaseStore?.release().catch(() => undefined);
    await ownerClient?.$disconnect().catch(() => undefined);
    for (const signal of ['SIGINT', 'SIGTERM'])
      process.off(signal, signalHandler);
  }
}

// Executed only when run directly (`node scripts/e2e/run-vitest-db.mjs`);
// seam exports stay side-effect free for DB-free unit tests.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('run-vitest-db.mjs')) {
  main().catch((error) => {
    process.stderr.write(`vitest-db runner crashed: ${messageOf(error)}\n`);
    process.exitCode = 1;
  });
}
