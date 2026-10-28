// Pure, fail-closed allowlist for the database-backed test harnesses' shared
// database target. The Python Playwright runner consumes the SAME
// consolidation contract (exact target below and the shared advisory-lock
// key in database-lifecycle.mjs) through playwright/conftest.py.
//
// Contract (PS-E1-007 test-infrastructure slice):
// - The target must be explicitly supplied per process via
//   CIVICOS_E2E_DATABASE_URL. Callers decide when to snapshot the value; a
//   caller that needs "process-only" semantics must pass a snapshot taken
//   BEFORE loading any .env files, so a variable that only exists in .env can
//   never act as the target.
// - There is NO fallback to DEMO_DATABASE_URL or DATABASE_URL. Those may point
//   at the demo database (Pilot01 / civicos_demo); a missing or empty explicit
//   target fails closed before any fixture write.
// - Only the exact loopback target below is accepted (the internal PostgreSQL
//   port 5432 on loopback, database civicos_e2e). Anything else — other host,
//   port, database name, protocol, or a fragment — is refused before any
//   connection is opened.
// - Error messages never contain the URL or its credentials.
export const E2E_TARGET_HOST = '127.0.0.1';
export const E2E_TARGET_PORT = '5432';
export const E2E_TARGET_DATABASE = 'civicos_e2e';

const ALLOWED_QUERY_KEYS = new Set(['schema', 'connection_limit']);

/**
 * Validate an already-parsed URL's query string against the safe allowlist.
 * Rejects unknown/duplicate keys, non-`public` schemas, and non-positive-
 * integer connection limits with the credential-free refusal code.
 */
function assertAllowedQuery(url) {
  const allKeys = [...url.searchParams.keys()];
  if (new Set(allKeys).size !== allKeys.length) {
    throw new Error('E2E_DATABASE_URL_REFUSED');
  }
  for (const [key, value] of url.searchParams.entries()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      throw new Error('E2E_DATABASE_URL_REFUSED');
    }
    if (key === 'schema' && value !== 'public') {
      throw new Error('E2E_DATABASE_URL_REFUSED');
    }
    if (key === 'connection_limit' && !/^[1-9][0-9]*$/.test(value)) {
      throw new Error('E2E_DATABASE_URL_REFUSED');
    }
  }
}

/**
 * Validate and resolve the explicit E2E database target from a caller-supplied
 * env snapshot. Returns the parsed URL on success. AssertionError messages are
 * stable error codes only.
 */
export function resolveE2EDatabaseTarget(env) {
  const raw = env?.CIVICOS_E2E_DATABASE_URL;
  if (typeof raw !== 'string' || raw.trim() === '')
    throw new Error('E2E_DATABASE_URL_REQUIRED');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('E2E_DATABASE_URL_MALFORMED');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.hostname !== E2E_TARGET_HOST ||
    url.port !== E2E_TARGET_PORT ||
    url.pathname !== `/${E2E_TARGET_DATABASE}` ||
    url.hash
  )
    throw new Error('E2E_DATABASE_URL_REFUSED');
  assertAllowedQuery(url);
  return url;
}
