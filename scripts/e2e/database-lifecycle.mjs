// Shared, fail-closed E2E application-data reset seam
// (database-consolidation plan, Task 1).
//
// Contract:
// - The ONLY reset target is the explicit CIVICOS_E2E_DATABASE_URL for
//   PostgreSQL 127.0.0.1:5432/civicos_e2e, validated by
//   resolveE2EDatabaseTarget(). The target is never derived from
//   DATABASE_URL or DEMO_DATABASE_URL, and error paths never print
//   credentials.
// - Before ANY write SQL, the connected server must report
//   current_database() = 'civicos_e2e'. URL validation and network-level
//   identity validation both happen before the first statement that can
//   mutate data.
// - The reset touches application rows only: schema, `_prisma_migrations`,
//   and PostGIS reference data (`spatial_ref_sys`) are never dropped,
//   created, or altered. Tables in `public` are enumerated dynamically so
//   new application tables are covered without code changes.
// - This module never opens a connection with its own driver/library: the
//   caller
//   supplies `connect(parsedUrl)` returning a single-session client with an
//   async `query(sql)` method AND `disconnect(client)` releasing that exact
//   client. disconnect runs on success and on every post-connect error
//   path; a disconnect failure never masks the primary error, and a
//   disconnect failure on an otherwise-successful run is a hard
//   `E2E_RESET_DISCONNECT_FAILED` (never a silent leak).
//
// Cross-runner advisory lock (WHOLE-RUN OWNERSHIP BELONGS TO THE CALLER):
// - Node and Python runners must serialize complete database-backed runs
//   (prepare → test → cleanup) with the SAME session-level advisory lock on
//   one persistent runner connection: 1128236101 (ASCII "CIVI" as a 32-bit
//   integer). The runner holds that lock on its persistent session across
//   prepare, test, and cleanup; only fully disconnected runner
//   processes hold it at a time.
// - resetE2EDatabaseData opens and disconnects its OWN SQL client (it does
//   not share the runner's lock session) and never requires that client to
//   likewise hold the run lock. It performs NO advisory-lock acquisition or
//   release internally — a runner that holds the run lock must be able to
//   call the reset without deadlocking against its own held session lock.
//   The runner acquires via acquireE2EAdvisoryLock before prepare and
//   releases via releaseE2EAdvisoryLock after cleanup.

import { resolveE2EDatabaseTarget } from './e2e-target.mjs';

/** Stable advisory-lock key shared with the Python runner (0x43495649). */
export const E2E_ADVISORY_LOCK_KEY = 1128236101;

/**
 * SQL that acquires the session lock; the Python runner must use the same key.
 * `pg_advisory_lock(bigint)` returns Postgres `void`, which Prisma raw queries
 * reject as an unsupported type — `IS NOT NULL` on the void return is a
 * supported scalar producing boolean `acquired: true`, while Postgres still
 * executes and blocks on the lock on that same session. Session-level
 * semantics and key unchanged.
 */
export const E2E_ADVISORY_LOCK_ACQUIRE_SQL = `SELECT pg_advisory_lock(${E2E_ADVISORY_LOCK_KEY}) IS NOT NULL AS acquired`;
/** Nonblocking variant used by the cancellable JavaScript runner. */
export const E2E_ADVISORY_LOCK_TRY_ACQUIRE_SQL = `SELECT pg_try_advisory_lock(${E2E_ADVISORY_LOCK_KEY}) AS acquired`;
/** SQL that releases the session lock on the same connection. */
export const E2E_ADVISORY_LOCK_RELEASE_SQL = `SELECT pg_advisory_unlock(${E2E_ADVISORY_LOCK_KEY})`;

/** Poll a single session without blocking PostgreSQL, honoring cancellation. */
export async function acquireE2EAdvisoryLockCancellable(
  query,
  signal,
  delay = () => new Promise((resolve) => setTimeout(resolve, 100)),
) {
  if (typeof query !== 'function') throw new Error('E2E_LOCK_DEPS_INVALID');
  while (!signal?.aborted) {
    const rows = await query(E2E_ADVISORY_LOCK_TRY_ACQUIRE_SQL);
    if (
      !Array.isArray(rows) ||
      rows.length !== 1 ||
      typeof rows[0]?.acquired !== 'boolean'
    ) {
      throw new Error('E2E_ADVISORY_LOCK_FAILED');
    }
    if (rows[0].acquired) {
      if (signal?.aborted) {
        await query(E2E_ADVISORY_LOCK_RELEASE_SQL);
        return false;
      }
      return true;
    }
    if (!signal?.aborted) await delay();
  }
  return false;
}

/**
 * `public` tables that are NOT application data: Prisma's migration history
 * and PostGIS reference rows. Schema/migration state survives every reset.
 */
export const PROTECTED_TABLES = Object.freeze([
  '_prisma_migrations',
  'spatial_ref_sys',
]);

/** Restrictive identifier shape; anything else fails closed unquoted. */
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Quote a PostgreSQL identifier with basic escaping after validating it is a
 * plain-name identifier. Malformed names throw E2E_RESET_TABLE_NAME_REFUSED
 * and abort before any SQL is emitted.
 */
export function quotePostgresIdentifier(name) {
  if (typeof name !== 'string' || !IDENTIFIER_PATTERN.test(name)) {
    throw new Error('E2E_RESET_TABLE_NAME_REFUSED');
  }
  return `"${name.replaceAll('"', '""')}"`;
}

/**
 * Filter a `public`-schema table list to application tables only, dropping
 * the protected migration/PostGIS names regardless of what the server
 * returned (defense in depth in addition to the SQL-side exclusion).
 */
export function applicationTablesFrom(tablenames) {
  if (!Array.isArray(tablenames)) throw new Error('E2E_RESET_QUERY_FAILED');
  /** Only reserved/protected names are excluded; anything else must clear. */
  const isExcluded = (name) =>
    name.startsWith('pg_') || PROTECTED_TABLES.includes(name);
  return Object.freeze(
    tablenames
      .map((name) => {
        if (typeof name !== 'string' || !IDENTIFIER_PATTERN.test(name)) {
          if (typeof name === 'string' && isExcluded(name)) return name;
          // A legitimate application table with a non-restrictive identifier
          // must never be silently skipped — fail closed instead.
          throw new Error('E2E_RESET_TABLE_NAME_REFUSED');
        }
        return name;
      })
      .filter((name) => typeof name === 'string' && !isExcluded(name)),
  );
}

/**
 * Acquire the shared session-level advisory lock (1128236101) on the runner's
 * persistent run connection. Returns the same client so the run body can use,
 * then release it via releaseE2EAdvisoryLock. Refusal to acquire is a hard
 * failure (E2E_ADVISORY_LOCK_FAILED) — never a silent continue.
 */
export async function acquireE2EAdvisoryLock(client) {
  const result = client && (await client.query(E2E_ADVISORY_LOCK_ACQUIRE_SQL));
  if (!result || !Array.isArray(result.rows) || result.rows.length !== 1) {
    throw new Error('E2E_ADVISORY_LOCK_FAILED');
  }
  return client;
}

/** Release the session advisory lock; ignores "not held" errors. */
export async function releaseE2EAdvisoryLock(client) {
  await client?.query?.(E2E_ADVISORY_LOCK_RELEASE_SQL);
}

/**
 * Reset application rows in the explicit E2E database.
 *
 * LOCKING: the runner must already hold the shared whole-run advisory lock
 * (key 1128236101) on its persistent run session, held across prepare, test,
 * and cleanup; the reset's SQL may run on a separate connection and the
 * helper never acquires or releases the lock itself. See the module header.
 *
 * @param {Record<string, string|undefined>} env caller-supplied env snapshot
 * @param {{
 *   connect: (url: URL) => Promise<{ query: (sql: string) => Promise<{ rows: unknown[] }> }>,
 *   disconnect: (client: unknown) => Promise<void>,
 * }} deps
 *   inject the connection seam so this module stays dependency-free and
 *   tests can run without PostgreSQL. `connect` MUST return a
 *   single-session client; `disconnect(client)` releases that exact client
 *   and is invoked in `finally` on success and on every post-connect error.
 * @returns {{ truncated: string[] }} the application tables that were cleared
 */
export async function resetE2EDatabaseData(env, deps) {
  const targetUrl = resolveE2EDatabaseTarget(env); // fail closed on target first
  if (
    typeof deps?.connect !== 'function' ||
    typeof deps?.disconnect !== 'function'
  ) {
    throw new Error('E2E_RESET_CONNECT_REQUIRED');
  }
  const client = deps.connect ? await deps.connect(targetUrl) : undefined;

  let primaryError;
  try {
    if (!client || typeof client.query !== 'function') {
      throw new Error('E2E_RESET_CONNECT_REQUIRED');
    }

    // Identity check BEFORE any mutating statement.
    const identity = await client.query('SELECT current_database() AS db');
    const connected = identity?.rows?.[0]?.db;
    if (connected !== 'civicos_e2e') {
      throw new Error('E2E_RESET_CONNECTED_DATABASE_REFUSED');
    }

    // The runner already holds the whole-run advisory lock on its own
    // persistent session; this helper performs no nested lock SQL.

    // Dynamic enumeration of application tables in `public`, with the
    // protected migration/PostGIS names excluded.
    const listing = await client.query(
      'SELECT tablename AS table_name FROM pg_tables ' +
        "WHERE schemaname = 'public' " +
        'ORDER BY tablename',
    );
    const tablenames = listing?.rows?.map((row) => row?.table_name) ?? [];
    const appTables = applicationTablesFrom(tablenames);

    const quoted = appTables.map(quotePostgresIdentifier);
    const truncateSql = `TRUNCATE TABLE ${quoted.join(', ')} RESTART IDENTITY CASCADE`;

    // Single round of mutating SQL, only if at least one application table
    // exists; protected tables are excluded above and in the query.
    if (appTables.length > 0) await client.query(truncateSql);
    return { truncated: [...appTables] };
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    // Every non-null post-connect client is disconnected exactly once,
    // including the malformed-client path inside the try above.
    // connect() returning null/undefined never reaches disconnect().
    if (client != null) {
      try {
        await deps.disconnect(client);
      } catch {
        // Never mask a primary failure; a leave-success failure is a leak.
        if (!primaryError) {
          throw new Error('E2E_RESET_DISCONNECT_FAILED');
        }
      }
    }
  }
}

/**
 * Run a whole-run callback under an advisory lock that is held for the FULL
 * callback lifetime (prepare → seed → build → app/test runtime → cleanup).
 * Injectable so it can be unit-tested without any database connection.
 *
 * `deps.acquire()` must return a lease object:
 *   - `ready(): Promise<void>` resolving ONLY after the lock has been
 *     confirmed acquired on the persistent owner session (and rejecting with
 *     the first acquisition/transaction failure otherwise);
 *   - `release(): Promise<void>` unlocking that same session.
 * The `run` callback starts only after `ready` resolves and the lock stays
 * held until `run` settles — acquire/run/release are never interleaved. The
 * first acquire or run error is propagated; release is always attempted.
 */
export async function runWithE2EWholeRunLock(deps, run) {
  if (
    typeof deps?.acquire !== 'function' ||
    typeof deps?.release !== 'function' ||
    typeof run !== 'function'
  ) {
    throw new Error('E2E_LOCK_DEPS_INVALID');
  }
  const lease = await deps.acquire();
  if (
    !lease ||
    typeof lease.ready !== 'function' ||
    typeof lease.release !== 'function'
  ) {
    throw new Error('E2E_LOCK_LEASE_INVALID');
  }
  try {
    await lease.ready();
    return await run(lease);
  } finally {
    await deps.release(lease);
  }
}
