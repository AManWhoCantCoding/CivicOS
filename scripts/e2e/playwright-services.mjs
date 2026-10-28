import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

import {
  E2E_ADVISORY_LOCK_RELEASE_SQL,
  acquireE2EAdvisoryLockCancellable,
  resetE2EDatabaseData,
  runWithE2EWholeRunLock,
} from './database-lifecycle.mjs';
import { resolveE2EDatabaseTarget } from './e2e-target.mjs';
import { ensurePrismaGenerated } from './prisma-generate.mjs';
import { createShutdownExitStatus } from './shutdown-exit-status.mjs';

const require = createRequire(import.meta.url);
// Process-only capture: snapshot the explicit target BEFORE @next/env merges
// .env into process.env. A variable that only exists in .env — or the removed
// DEMO_DATABASE_URL/DATABASE_URL fallback — must never act as the PS-E1-007
// E2E target (Pilot01 / civicos_demo is off-limits); see e2e-target.mjs.
const explicitTargetUrl = process.env.CIVICOS_E2E_DATABASE_URL;
// Validate the raw snapshot BEFORE loading .env (fail closed): only the exact
// loopback 127.0.0.1:5432/civicos_e2e target is accepted — never inferred from
// DATABASE_URL or DEMO_DATABASE_URL. Error messages carry no credentials.
const target = resolveE2EDatabaseTarget({
  CIVICOS_E2E_DATABASE_URL: explicitTargetUrl,
});
const e2eWorkerIntervalMs = process.env.CIVICOS_E2E_WORKER_INTERVAL_MS ?? '100';
require('@next/env').loadEnvConfig(process.cwd());

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const environment = { ...process.env };
environment.PORT = '3001';
environment.EVENT_WORKER_INTERVAL_MS = e2eWorkerIntervalMs;
environment.CIVICOS_E2E_RUN = '1';
const tracePath = resolve(
  process.cwd(),
  '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-trace.jsonl',
);
const runId = process.env.CIVICOS_E2E_RUN_ID;
if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    runId ?? '',
  )
) {
  throw new Error('Invalid E2E run ID');
}
const controlDir = resolve(
  process.cwd(),
  '.brain/evidence/03-ps-e1005-intake-report/logs',
);
const control = (name) => resolve(controlDir, `${runId}.${name}`);
const startedPath = control('started');
const stopPath = control('stop');
const donePath = control('done');
const httpTracePath = resolve(
  process.cwd(),
  '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-http.jsonl',
);
mkdirSync(dirname(tracePath), { recursive: true });
const traceRunId = randomUUID();
writeFileSync(
  tracePath,
  `${JSON.stringify({
    recordedAt: new Date().toISOString(),
    runId: traceRunId,
    kind: 'run',
    operation: 'start',
    status: 'started',
  })}\n`,
  'utf8',
);
writeFileSync(
  httpTracePath,
  `${JSON.stringify({
    recordedAt: new Date().toISOString(),
    runId: traceRunId,
    kind: 'run',
    operation: 'start',
    status: 'started',
  })}\n`,
  'utf8',
);
environment.CIVICOS_E2E_TRACE_FILE = tracePath;
environment.CIVICOS_E2E_TRACE_RUN_ID = traceRunId;
environment.CIVICOS_E2E_HTTP_TRACE_FILE = httpTracePath;
const children = new Set();
let shuttingDown = false;
let shutdownPromise;
const shutdownExitStatus = createShutdownExitStatus();

// Whole-run advisory lock (key 1128236101, shared with the Python runner):
// held on ONE Prisma session for the entire prepare → seed → build → app/test
// runtime → cleanup → final-reset path. Technique with only existing deps
// (no `pg`, no `psql`): an interactive $transaction whose callback confirms
// ownership after the acquire SQL, then parks on a never-resolved promise
// until shutdown, so Prisma keeps a single dedicated connection open the
// whole time and the lock is genuinely held across child processes. The
// session-level lock only serializes holders, so the short-lived reset
// connections below may run while this owner session stays held.
let lockGuardPromise;
// Release gate is created before the transaction; acquisition itself polls
// nonblocking so cancellation can promptly stop before ownership.
let releaseGate = null; // { promise, resolve } | null
let lockLostError = null;
let lockAcquired = false;
const lockAcquireAbort = new AbortController();
let resetQueue = Promise.resolve();
// Resolves on the first recorded lock loss; used to abort DB-writing work
// (e.g. a cleanup child) the moment ownership disappears.
let notifyLockLost;
const lockLostSignal = new Promise((resolve) => {
  notifyLockLost = resolve;
});

function recordLockLost(error) {
  lockLostError ??= error;
  if (lockLostError === error) {
    process.stderr.write(`E2E advisory lock lost: ${error.message}\n`);
    // Fail closed immediately: never let writes continue unowned. Stop the
    // app/children and run the failure shutdown (its reset block is refused
    // by the lockLost() guard). Forcing exitCode here covers loss detected
    // after shutdown() already computed its local exit code (e.g. the parked
    // session failing while shutdown is releasing).
    process.exitCode = 1;
    notifyLockLost();
    void shutdown(1);
  }
}

/**
 * Build the whole-run lock lease on `prisma` (the persistent owner client).
 * `ready` resolves ONLY once the acquire SQL has confirmed ownership inside
 * the transaction; a transaction failure (e.g. lock refused) rejects the
 * same promise, so `runWithE2EWholeRunLock` never starts `run` unowned.
 */
function buildWholeRunLockLease(prisma) {
  const readySignal = {};
  const ready = new Promise((resolve, reject) => {
    Object.assign(readySignal, { resolve, reject });
  });
  // Build the release gate before anything starts: `release` may resolve it
  // at any time — even while the acquire SQL below is still pending.
  releaseGate = { promise: null, resolve: null };
  releaseGate.promise = new Promise((resolve) => {
    releaseGate.resolve = resolve;
  });
  lockGuardPromise = prisma.$transaction(
    async (tx) => {
      const acquired = await acquireE2EAdvisoryLockCancellable(
        (sql) => tx.$queryRawUnsafe(sql),
        lockAcquireAbort.signal,
      );
      if (!acquired) throw new Error('E2E_ADVISORY_LOCK_CANCELLED');
      // Ownership confirmed on this session — now (and only now) may the
      // whole-run callback start.
      readySignal.resolve();
      // Park on the pre-created gate. A shutdown request that arrived before
      // this point already resolved it, so the callback can never park
      // forever; otherwise it stays parked until shutdown resolves the gate.
      await releaseGate.promise;
      // Release on the SAME session before the commit closes it, so the lock
      // is never leaked onto a pooled idle connection.
      await tx.$queryRawUnsafe(E2E_ADVISORY_LOCK_RELEASE_SQL);
    },
    // Keep the interactive transaction alive for the full run (ms).
    { timeout: 2_147_483_647 },
  );
  // Guard against an unhandled rejection if the session is lost mid-run
  // (fail closed: the run aborts at the next ownership check).
  lockGuardPromise.catch((error) => {
    if (error?.message !== 'E2E_ADVISORY_LOCK_CANCELLED') recordLockLost(error);
    return undefined;
  });
  return {
    ready: () => Promise.race([ready, lockGuardPromise]),
    release: releaseWholeRunAdvisoryLock,
  };
}

/** Resolve the parked transaction, wait for the unlock on the SAME session. */
async function releaseWholeRunAdvisoryLock() {
  if (!lockGuardPromise) return;
  const pending = lockGuardPromise;
  // Resolve the gate even while the acquire SQL is still pending: the
  // callback reaches `await releaseGate.promise` later and sees it resolved.
  // The transaction reference is cleared only AFTER the transaction has
  // fully settled, so shutdown always awaits the real lock completion
  // (never relies on $disconnect() to cancel a parked transaction). Once the
  // transaction settles the reference is undefined and repeats are no-ops.
  releaseGate?.resolve?.();
  await pending.catch(() => undefined);
  releaseGate = null;
  lockGuardPromise = undefined;
}

/** True when the persistent owner session lost the lock mid-run. */
function lockLost() {
  return lockLostError != null;
}

/**
 * Reset adapter for resetE2EDatabaseData: every reset gets its OWN
 * short-lived PrismaClient pinned to the exact validated target, connected
 * on `connect` and disconnected in all paths via `disconnect`. The
 * lock-owner client is never touched, so the advisory lock survives resets.
 * SELECT reads go through $queryRawUnsafe (wrapped so the helper sees
 * `.rows`); the TRUNCATE the helper builds goes through $executeRawUnsafe.
 * The helper re-verifies `current_database()` before truncating.
 */
function prismaResetDeps() {
  return {
    connect: async (targetUrl) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient({
        // Prisma's datasource override must be the URL STRING (the helper
        // supplies a parsed URL object; `.href` is the connection string).
        datasources: { db: { url: targetUrl.href } },
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

function resetSerialized() {
  const reset = resetQueue.then(() =>
    resetE2EDatabaseData(process.env, prismaResetDeps()),
  );
  resetQueue = reset.catch(() => undefined);
  return reset;
}

function run(command, args, allowDuringShutdown = false, onChild = null) {
  return new Promise((resolve, reject) => {
    if (shuttingDown && !allowDuringShutdown) {
      reject(new Error('E2E service shutdown requested'));
      return;
    }
    const child = spawn(command, args, {
      env: environment,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
    children.add(child);
    if (typeof onChild === 'function') onChild(child);
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

function start(command, args) {
  if (shuttingDown) throw new Error('E2E service shutdown requested');
  const child = spawn(command, args, {
    detached: process.platform !== 'win32',
    env: environment,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null || child.killed) {
    if (child.exitCode === null && child.signalCode === null)
      await new Promise((resolve) => child.once('exit', resolve));
    return;
  }
  if (process.platform === 'win32') {
    await run(
      'taskkill.exe',
      ['/pid', String(child.pid), '/t', '/f'],
      true,
    ).catch(() => undefined);
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
  if (child.exitCode === null && child.signalCode === null)
    await new Promise((resolve) => child.once('exit', resolve));
}

async function shutdown(code = 0) {
  shutdownExitStatus.request(code);
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = (async () => {
    shuttingDown = true;
    lockAcquireAbort.abort();
    await Promise.all([...children].map(stop));
    // With a known-lost lock no DB-writing work is safe — not the exact
    // fixture cleanup, not the final reset: both would race another holder
    // of the same key. Abandon them and fail closed instead.
    if (lockLostError) shutdownExitStatus.request(1);
    if (setupCompleted && !lockLostError) {
      // If ownership is lost while the cleanup child runs, stop it promptly;
      // its rejection just marks the failure — never a retry without
      // ownership. Normal path remains: stop app → exact fixture cleanup →
      // full app-data reset → unlock.
      let cleanupChild = null;
      void lockLostSignal.then(() => {
        if (
          cleanupChild &&
          cleanupChild.exitCode === null &&
          cleanupChild.signalCode === null &&
          !cleanupChild.killed
        )
          void stop(cleanupChild);
      });
      try {
        await run(
          npm,
          ['exec', '--', 'tsx', 'scripts/e2e/fixtures.ts', 'cleanup'],
          true,
          (child) => {
            cleanupChild = child;
          },
        );
      } catch (error) {
        process.stderr.write(`E2E fixture cleanup failed: ${error.message}\n`);
        shutdownExitStatus.request(1);
      }
    }
    // Final full E2E test-data reset, after the exact fixture cleanup, on both
    // the success and failure paths: truncates ONLY application tables in
    // `public` (resetE2EDatabaseData excludes `_prisma_migrations`,
    // `spatial_ref_sys`, and reserved `pg_` tables) so migration history and
    // PostGIS reference data survive. Never touches `civicos`.
    // Fail closed: if the whole-run lock was never confirmed owned, or was
    // lost mid-run, the reset is refused — never an unlocked truncate.
    let resetRan = false;
    if (lockAcquired && !lockLost()) {
      try {
        await resetSerialized();
        resetRan = true;
      } catch (error) {
        process.stderr.write(`E2E final reset failed: ${error.message}\n`);
        shutdownExitStatus.request(1);
      }
    }
    // Release the whole-run advisory lock ONLY after cleanup + reset; the
    // owner-transaction teardown finishes here on the lock-loss path too.
    // runWithE2EWholeRunLock releases after callback settlement. Avoid an
    // explicit unlock here: the callback can itself be awaiting shutdown.
    // Fail closed: a lock loss detected during release forces a non-zero exit
    // regardless of the local success/failure code above.
    if (lockLostError) {
      shutdownExitStatus.request(1);
    }
    shutdownExitStatus.finalize((finalCode) => {
      if (existsSync(startedPath))
        writeFileSync(donePath, finalCode === 0 ? 'ok\n' : 'failed\n', 'utf8');
      process.exitCode = finalCode;
    });
    if (!resetRan && lockLostError)
      process.stderr.write('E2E_ADVISORY_LOCK_LOST: final reset refused\n');
  })();
  return shutdownPromise;
}

let setupCompleted = false;
let prismaClient;
async function main() {
  // Fail closed before spawning any child process (migrations, fixture setup,
  // build, app start): only the explicit loopback civicos_e2e target passes,
  // and children re-validate the identical process-only URL (never a .env
  // value).
  environment.DATABASE_URL = target.href;
  environment.CIVICOS_E2E_DATABASE_URL = target.href;
  // The runner process itself also targets civicos_e2e: it is the persistent
  // whole-run advisory-lock owner; migrations, fixture setup, and the app all
  // inherit this child env, while every reset uses its own short-lived
  // connection (see prismaResetDeps).
  process.env.DATABASE_URL = target.href;
  process.env.CIVICOS_E2E_DATABASE_URL = target.href;
  // Shutdown may be requested before the lock is acquired; never connect,
  // migrate, reset, or seed the lock owner once it has been requested.
  if (shuttingDown) return;
  await ensurePrismaGenerated({
    runGenerate: () => run(npm, ['exec', '--', 'prisma', 'generate']),
  });
  if (shuttingDown) return;
  const { PrismaClient } = await import('@prisma/client');
  prismaClient = new PrismaClient();
  try {
    await prismaClient.$connect();
    // Shutdown requested while $connect() was awaiting: disconnect here and
    // return without ever opening a lock transaction.
    if (shuttingDown) {
      await prismaClient.$disconnect().catch(() => undefined);
      return;
    }
    await runWithE2EWholeRunLock(
      {
        acquire: () => buildWholeRunLockLease(prismaClient),
        release: releaseWholeRunAdvisoryLock,
      },
      // The callback below runs ONLY after advisory ownership is confirmed
      // (lease.ready) and the lock stays held until it settles.
      async () => {
        lockAcquired = true;
        if (lockLost() || shuttingDown)
          throw new Error('E2E_ADVISORY_LOCK_LOST');
        try {
          // Migrate against the validated target (no create/drop/recreate),
          // then clear leftover E2E application rows before seeding.
          await run(npm, ['exec', '--', 'prisma', 'migrate', 'deploy']);
          if (lockLost()) throw new Error('E2E_ADVISORY_LOCK_LOST');
          await resetSerialized();
          await run(npm, [
            'exec',
            '--',
            'tsx',
            'scripts/e2e/fixtures.ts',
            'setup',
          ]);
          setupCompleted = true;
          await run(npm, ['run', 'build']);
          if (lockLost()) throw new Error('E2E_ADVISORY_LOCK_LOST');
          if (shuttingDown) return;

          // Bind the production test server to loopback only: `next start`
          // defaults to 0.0.0.0 (see node_modules/next/dist/docs ...
          // 06-cli/next.md), which would expose the PS-E1-007 test app on the
          // LAN. `npm run X -- args` forwards the trailing arguments to the
          // script (npm documented behavior).
          const app = start(npm, [
            'run',
            'start',
            '--',
            '--hostname',
            '127.0.0.1',
          ]);
          start(npm, ['run', 'worker']);
          if (shuttingDown) return;
          writeFileSync(startedPath, 'started\n', { flag: 'wx' });
          const stopPoll = (async () => {
            while (!shuttingDown) {
              if (existsSync(stopPath)) {
                await shutdown(0);
                return;
              }
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          })();
          await Promise.race([
            new Promise((resolve) => app.once('exit', () => resolve(1))),
          ]).then((code) => shutdown(code));
          await stopPoll;
        } catch (error) {
          // Failure inside the lock: run the full shutdown (children stop,
          // fixture cleanup, final reset) WHILE the lock is still held —
          // the helper releases only after this callback settles.
          process.stderr.write(`${error.message}\n`);
          await shutdown(1);
        }
      },
    );
  } finally {
    // The helper has released the lock; now (and only now) disconnect the
    // owner session on every path.
    await prismaClient.$disconnect().catch(() => undefined);
  }
}

process.once('SIGINT', () => void shutdown(1));
process.once('SIGTERM', () => void shutdown(1));

main().catch(async (error) => {
  process.stderr.write(`${error.message}\n`);
  await shutdown(1);
  // Even if an earlier shutdown promise (e.g. a stop-file-initiated one)
  // already computed a success code, a subsequent observed main failure must
  // leave a non-zero exit. The normal stop-file success path never reaches
  // this handler without also failing, so the explicit success path is
  // untouched.
  if (process.exitCode === 0 || process.exitCode == null) process.exitCode = 1;
});
