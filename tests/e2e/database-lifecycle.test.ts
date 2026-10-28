import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  E2E_ADVISORY_LOCK_ACQUIRE_SQL,
  E2E_ADVISORY_LOCK_RELEASE_SQL,
  E2E_ADVISORY_LOCK_TRY_ACQUIRE_SQL,
  acquireE2EAdvisoryLockCancellable,
  applicationTablesFrom,
  acquireE2EAdvisoryLock,
  quotePostgresIdentifier,
  releaseE2EAdvisoryLock,
  resetE2EDatabaseData,
  runWithE2EWholeRunLock,
} from '../../scripts/e2e/database-lifecycle.mjs';

const VALID_ENV = {
  CIVICOS_E2E_DATABASE_URL:
    'postgresql://e2e:s3cret@127.0.0.1:5432/civicos_e2e',
};

describe('Playwright service shutdown source safety', () => {
  it('retries nonblocking acquisition until ownership is confirmed', async () => {
    const signal = new AbortController();
    const sql: string[] = [];
    let attempts = 0;
    const acquired = await acquireE2EAdvisoryLockCancellable(
      async (statement: string) => {
        sql.push(statement);
        return [{ acquired: ++attempts === 3 }];
      },
      signal.signal,
      async () => undefined,
    );
    expect(acquired).toBe(true);
    expect(sql).toEqual(Array(3).fill(E2E_ADVISORY_LOCK_TRY_ACQUIRE_SQL));
  });

  it('cancels without another attempt or ownership', async () => {
    const signal = new AbortController();
    let attempts = 0;
    const acquired = await acquireE2EAdvisoryLockCancellable(
      async () => {
        attempts++;
        return [{ acquired: false }];
      },
      signal.signal,
      async () => signal.abort(),
    );
    expect(acquired).toBe(false);
    expect(attempts).toBe(1);
  });

  it('unlocks on the same session if cancellation races successful acquisition', async () => {
    const signal = new AbortController();
    const sql: string[] = [];
    const acquired = await acquireE2EAdvisoryLockCancellable(
      async (statement: string) => {
        sql.push(statement);
        signal.abort();
        return [{ acquired: true }];
      },
      signal.signal,
    );
    expect(acquired).toBe(false);
    expect(sql).toEqual([
      E2E_ADVISORY_LOCK_TRY_ACQUIRE_SQL,
      E2E_ADVISORY_LOCK_RELEASE_SQL,
    ]);
  });

  it('serializes resets and leaves lock release to the whole-run callback owner', () => {
    const source = readFileSync(
      join(process.cwd(), 'scripts/e2e/playwright-services.mjs'),
      'utf8',
    );
    const reset = source.slice(
      source.indexOf('function resetSerialized()'),
      source.indexOf('\nfunction run(', source.indexOf('function resetSerialized()')),
    );
    const shutdown = source.slice(
      source.indexOf('async function shutdown('),
      source.indexOf('\nlet setupCompleted', source.indexOf('async function shutdown(')),
    );
    const acquire = source.slice(
      source.indexOf('function buildWholeRunLockLease('),
      source.indexOf('\n/** Resolve the parked transaction', source.indexOf('function buildWholeRunLockLease(')),
    );
    const lockGuard = source.slice(
      source.indexOf('lockGuardPromise.catch('),
      source.indexOf('\n  return {', source.indexOf('lockGuardPromise.catch(')),
    );
    const owner = source.slice(source.indexOf('runWithE2EWholeRunLock('));

    // Source-wiring coverage only; this is not a runtime signal test.
    expect(reset).toContain('resetQueue.then');
    expect(reset).toContain('resetQueue = reset.catch');
    expect(shutdown).not.toContain('releaseWholeRunAdvisoryLock(');
    expect(owner).toContain('runWithE2EWholeRunLock');
    expect(owner).toContain('runWithE2EWholeRunLock(\n');
    expect(acquire).toContain('acquireE2EAdvisoryLockCancellable(');
    expect(acquire).toContain('(sql) => tx.$queryRawUnsafe(sql)');
    expect(shutdown).toContain('lockAcquireAbort.abort()');
    expect(lockGuard).toContain("error?.message !== 'E2E_ADVISORY_LOCK_CANCELLED'");
  });
});

const APP_TABLES = [
  'audit_events',
  'citizens',
  'municipal_projects',
  '_prisma_migrations',
  'spatial_ref_sys',
];

/**
 * Minimal single-session fake client with an explicit disconnect contract.
 * `failOn` optionally makes one SQL stage reject, driving error paths.
 */
function fakeClient(
  dbName = 'civicos_e2e',
  tables = APP_TABLES,
  failOn: string | null = null,
) {
  const emitted: string[] = [];
  const state = { disconnected: false, disconnectCalls: 0 };
  const client = {
    emitted,
    state,
    async query(sql: string) {
      emitted.push(sql);
      if (failOn && sql.startsWith(failOn)) {
        throw new Error(`E2E_RESET_QUERY_FAILED (stage: ${failOn})`);
      }
      if (sql.startsWith('SELECT current_database')) {
        return { rows: [{ db: dbName }] };
      }
      if (sql.includes('FROM pg_tables')) {
        return { rows: tables.map((table_name) => ({ table_name })) };
      }
      return { rows: [{ status: 'ok' }] };
    },
  };
  const deps = {
    connectCalls: 0,
    async connect() {
      this.connectCalls += 1;
      return client;
    },
    async disconnect() {
      state.disconnectCalls += 1;
      state.disconnected = true;
    },
  };
  return { client, deps, state };
}

describe('resetE2EDatabaseData', () => {
  it('refuses a non-E2E target before any connection is opened', async () => {
    const { deps, state } = fakeClient();
    await expect(
      resetE2EDatabaseData(
        {
          CIVICOS_E2E_DATABASE_URL:
            'postgresql://app:pw@127.0.0.1:5432/civicos',
        },
        deps,
      ),
    ).rejects.toThrow('E2E_DATABASE_URL_REFUSED');
    expect(deps.connectCalls).toBe(0);
    expect(state.disconnected).toBe(false); // never connected, nothing to close
  });

  it('fails closed without a required connect/disconnect seam', async () => {
    await expect(resetE2EDatabaseData(VALID_ENV, {} as never)).rejects.toThrow(
      'E2E_RESET_CONNECT_REQUIRED',
    );
    const { deps } = fakeClient();
    await expect(
      resetE2EDatabaseData(VALID_ENV, { connect: deps.connect } as never),
    ).rejects.toThrow('E2E_RESET_CONNECT_REQUIRED');
  });

  it('disconnects a non-null malformed client instead of leaking it', async () => {
    let disconnectCalls = 0;
    await expect(
      resetE2EDatabaseData(VALID_ENV, {
        async connect() {
          return { notAQueryClient: true }; // non-null, no callable query
        },
        async disconnect() {
          disconnectCalls += 1;
        },
      } as never),
    ).rejects.toThrow('E2E_RESET_CONNECT_REQUIRED');
    expect(disconnectCalls).toBe(1);
  });

  it('never disconnects when connect returns null or undefined', async () => {
    for (const broken of [async () => null, async () => undefined]) {
      let disconnectCalls = 0;
      await expect(
        resetE2EDatabaseData(VALID_ENV, {
          connect: broken as never,
          async disconnect() {
            disconnectCalls += 1;
          },
        }),
      ).rejects.toThrow('E2E_RESET_CONNECT_REQUIRED');
      expect(disconnectCalls).toBe(0);
    }
  });

  it('refuses a connected database that is not civicos_e2e before any write', async () => {
    const { client, deps } = fakeClient('civicos');
    await expect(resetE2EDatabaseData(VALID_ENV, deps)).rejects.toThrow(
      'E2E_RESET_CONNECTED_DATABASE_REFUSED',
    );
    expect(client.emitted).toHaveLength(1);
    expect(client.emitted[0]).toContain('current_database()');
    expect(
      client.emitted.some((sql) => /TRUNCATE|DROP|CREATE/i.test(sql)),
    ).toBe(false);
  });

  it('truncates every application table with identity restart and cascade', async () => {
    const { client, deps, state } = fakeClient();
    const result = await resetE2EDatabaseData(VALID_ENV, deps);
    expect(result.truncated).toEqual([
      'audit_events',
      'citizens',
      'municipal_projects',
    ]);
    const truncate = client.emitted.find((sql) => sql.startsWith('TRUNCATE'));
    expect(truncate).toBe(
      'TRUNCATE TABLE "audit_events", "citizens", "municipal_projects" ' +
        'RESTART IDENTITY CASCADE',
    );
    expect(state.disconnected).toBe(true);
  });

  it('excludes Prisma migration history, PostGIS references, and pg_ tables', () => {
    expect(applicationTablesFrom(APP_TABLES)).toEqual([
      'audit_events',
      'citizens',
      'municipal_projects',
    ]);
    expect(
      applicationTablesFrom(['pg_catalog_marker', '_prisma_migrations']),
    ).toEqual([]);
  });

  it('fails closed on malformed non-protected discovered table names', () => {
    expect(() => applicationTablesFrom(['citizens', 'bad-name'])).toThrow(
      'E2E_RESET_TABLE_NAME_REFUSED',
    );
    expect(() => applicationTablesFrom(['citizens', 42 as never])).toThrow(
      'E2E_RESET_TABLE_NAME_REFUSED',
    );
    expect(() => applicationTablesFrom(['ok"quote'])).toThrow(
      'E2E_RESET_TABLE_NAME_REFUSED',
    );
  });

  it('rejects an invalid discovered table name before any TRUNCATE SQL', async () => {
    const { client, deps, state } = fakeClient('civicos_e2e', [
      'citizens',
      'legit"table',
    ]);
    await expect(resetE2EDatabaseData(VALID_ENV, deps)).rejects.toThrow(
      'E2E_RESET_TABLE_NAME_REFUSED',
    );
    expect(client.emitted.some((sql) => sql.startsWith('TRUNCATE'))).toBe(
      false,
    );
    expect(state.disconnected).toBe(true);
  });

  it('emits no DROP, CREATE, ALTER, DELETE or migration/PostGIS table name', async () => {
    const { client, deps } = fakeClient();
    await resetE2EDatabaseData(VALID_ENV, deps);
    for (const sql of client.emitted) {
      expect(sql).not.toMatch(/\b(DROP|CREATE|ALTER)\b/i);
      expect(sql).not.toContain('_prisma_migrations');
      expect(sql).not.toContain('spatial_ref_sys');
    }
  });

  it('performs NO nested advisory-lock acquisition or release', async () => {
    const { client, deps } = fakeClient();
    await resetE2EDatabaseData(VALID_ENV, deps);
    expect(client.emitted.some((sql) => sql.includes('pg_advisory_lock'))).toBe(
      false,
    );
    expect(
      client.emitted.some((sql) => sql.includes('pg_advisory_unlock')),
    ).toBe(false);
    expect(client.emitted).toEqual([
      expect.stringContaining('current_database()'),
      expect.stringContaining('FROM pg_tables'),
      expect.stringContaining('TRUNCATE'),
    ]);
  });

  it('disconnects after success', async () => {
    const { deps, state } = fakeClient();
    await resetE2EDatabaseData(VALID_ENV, deps);
    expect(state.disconnected).toBe(true);
    expect(state.disconnectCalls).toBe(1);
  });

  it('disconnects after an identity failure', async () => {
    const { deps, state } = fakeClient('civicos');
    await expect(resetE2EDatabaseData(VALID_ENV, deps)).rejects.toThrow(
      'E2E_RESET_CONNECTED_DATABASE_REFUSED',
    );
    expect(state.disconnected).toBe(true);
    expect(state.disconnectCalls).toBe(1);
  });

  it('disconnects after an enumeration or truncate failure without masking it', async () => {
    for (const failStage of ['SELECT tablename', 'TRUNCATE']) {
      const { deps, state } = fakeClient('civicos_e2e', APP_TABLES, failStage);
      await expect(resetE2EDatabaseData(VALID_ENV, deps)).rejects.toThrow(
        'E2E_RESET_QUERY_FAILED',
      );
      expect(state.disconnected).toBe(true);
    }
  });

  it('keeps the primary error even when disconnect itself throws', async () => {
    const { deps } = fakeClient('civicos');
    deps.disconnect = async () => {
      throw new Error('disconnect blew up');
    };
    await expect(resetE2EDatabaseData(VALID_ENV, deps)).rejects.toThrow(
      'E2E_RESET_CONNECTED_DATABASE_REFUSED',
    );
  });

  it('fails closed as a leak when disconnect fails on an otherwise-successful run', async () => {
    const { deps } = fakeClient();
    deps.disconnect = async () => {
      throw new Error('disconnect blew up');
    };
    await expect(resetE2EDatabaseData(VALID_ENV, deps)).rejects.toThrow(
      'E2E_RESET_DISCONNECT_FAILED',
    );
  });

  it('emits no SQL at all when the target URL is missing', async () => {
    let connectCalls = 0;
    await expect(
      resetE2EDatabaseData(
        {},
        {
          async connect() {
            connectCalls += 1;
            return {
              async query() {
                return { rows: [] };
              },
            };
          },
          async disconnect() {},
        },
      ),
    ).rejects.toThrow('E2E_DATABASE_URL_REQUIRED');
    expect(connectCalls).toBe(0);
  });
});

describe('advisory lock seam', () => {
  it('uses the stable shared key consumable by the Python runner', () => {
    expect(E2E_ADVISORY_LOCK_ACQUIRE_SQL).toBe(
      'SELECT pg_advisory_lock(1128236101) IS NOT NULL AS acquired',
    );
    expect(E2E_ADVISORY_LOCK_RELEASE_SQL).toBe(
      'SELECT pg_advisory_unlock(1128236101)',
    );
  });

  it('fails closed when the lock cannot be acquired', async () => {
    await expect(
      acquireE2EAdvisoryLock({
        async query() {
          return { rows: [] };
        },
      } as never),
    ).rejects.toThrow('E2E_ADVISORY_LOCK_FAILED');
  });

  it('acquire/release helpers emit the session lock SQL on the given client', async () => {
    const emitted: string[] = [];
    const client = {
      async query(sql: string) {
        emitted.push(sql);
        return { rows: [{ status: 'ok' }] };
      },
    };
    const same = await acquireE2EAdvisoryLock(client);
    expect(same).toBe(client);
    expect(emitted).toEqual([
      'SELECT pg_advisory_lock(1128236101) IS NOT NULL AS acquired',
    ]);
    await releaseE2EAdvisoryLock(client);
    expect(emitted).toEqual([
      'SELECT pg_advisory_lock(1128236101) IS NOT NULL AS acquired',
      'SELECT pg_advisory_unlock(1128236101)',
    ]);
  });
});

describe('quotePostgresIdentifier', () => {
  it('quotes plain names and rejects unsafe ones', () => {
    expect(quotePostgresIdentifier('citizens')).toBe('"citizens"');
    expect(() => quotePostgresIdentifier('bad-name')).toThrow(
      'E2E_RESET_TABLE_NAME_REFUSED',
    );
    expect(() => quotePostgresIdentifier('x"')).toThrow(
      'E2E_RESET_TABLE_NAME_REFUSED',
    );
    expect(() => quotePostgresIdentifier('x; DROP TABLE citizens')).toThrow(
      'E2E_RESET_TABLE_NAME_REFUSED',
    );
  });
});

describe('runWithE2EWholeRunLock', () => {
  function deferred() {
    let resolve!: (value?: unknown) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise((res, rej) => {
      resolve = res as typeof resolve;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  function makeLease(acquireGate: ReturnType<typeof deferred> | null) {
    const events: string[] = [];
    let released = false;
    return {
      deps: {
        acquire: async () => ({
          ready: async () => {
            if (acquireGate) await acquireGate.promise;
            events.push('ready');
          },
          release: async () => {
            released = true;
            events.push('release');
          },
        }),
        release: async (lease: { release: () => Promise<void> }) => {
          await lease.release();
        },
      },
      events,
      isReleased: () => released,
    };
  }

  it('starts the run callback only after the lock acquisition is ready', async () => {
    const gate = deferred();
    const { deps, events, isReleased } = makeLease(gate);
    let started = false;
    const run = runWithE2EWholeRunLock(deps, async () => {
      expect(events).toContain('ready');
      started = true;
    });
    // Even after several macrotasks, `run` must NOT start before `ready`.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(started).toBe(false);
    expect(isReleased()).toBe(false);
    gate.resolve();
    await run;
    expect(started).toBe(true);
    expect(events).toEqual(['ready', 'release']);
  });

  it('holds the lock until the callback settles and releases afterwards', async () => {
    const { deps, events } = makeLease(null);
    await runWithE2EWholeRunLock(deps, async () => {
      expect(events).toEqual(['ready']);
      // The lock is still held while the callback runs.
      expect(events).not.toContain('release');
    });
    expect(events[events.length - 1]).toBe('release');
  });

  it('propagates run errors but still releases the lock', async () => {
    const { deps, events } = makeLease(null);
    await expect(
      runWithE2EWholeRunLock(deps, async () => {
        throw new Error('E2E_LOCK_RUN_FAILED');
      }),
    ).rejects.toThrow('E2E_LOCK_RUN_FAILED');
    expect(events[events.length - 1]).toBe('release');
  });

  it('propagates acquisition failure and never starts or releases (nothing owned)', async () => {
    const events: string[] = [];
    await expect(
      runWithE2EWholeRunLock(
        {
          acquire: async () => {
            throw new Error('E2E_ADVISORY_LOCK_FAILED');
          },
          release: async () => {
            events.push('release');
          },
        },
        async () => {
          events.push('run');
        },
      ),
    ).rejects.toThrow('E2E_ADVISORY_LOCK_FAILED');
    expect(events).toEqual([]);
  });

  it('fails closed on invalid deps or lease', async () => {
    const { deps } = makeLease(deferred());
    await expect(
      runWithE2EWholeRunLock(undefined as never, async () => undefined),
    ).rejects.toThrow('E2E_LOCK_DEPS_INVALID');
    await expect(
      runWithE2EWholeRunLock(deps, undefined as never),
    ).rejects.toThrow('E2E_LOCK_DEPS_INVALID');
    await expect(
      runWithE2EWholeRunLock(
        { acquire: async () => null, release: async () => undefined },
        async () => undefined,
      ),
    ).rejects.toThrow('E2E_LOCK_LEASE_INVALID');
  });
});
