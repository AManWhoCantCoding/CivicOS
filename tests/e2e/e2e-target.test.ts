import { describe, expect, it } from 'vitest';

import {
  E2E_TARGET_DATABASE,
  E2E_TARGET_HOST,
  E2E_TARGET_PORT,
  resolveE2EDatabaseTarget,
} from '../../scripts/e2e/e2e-target.mjs';

function env(value: string | undefined): Record<string, string | undefined> {
  return { CIVICOS_E2E_DATABASE_URL: value };
}

const VALID = 'postgresql://e2e:s3cret@127.0.0.1:5432/civicos_e2e';

function refuseMessage(raw: string | undefined): string {
  let message: string | undefined;
  try {
    resolveE2EDatabaseTarget(env(raw));
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).toBeDefined();
  return message as string;
}

describe('resolveE2EDatabaseTarget', () => {
  it('accepts the exact loopback civicos_e2e target', () => {
    const target = resolveE2EDatabaseTarget(
      env(`${VALID}?schema=public&connection_limit=1`),
    );
    expect(target.hostname).toBe(E2E_TARGET_HOST);
    expect(target.hostname).toBe('127.0.0.1');
    expect(target.port).toBe(E2E_TARGET_PORT);
    expect(target.port).toBe('5432');
    expect(target.pathname).toBe(`/${E2E_TARGET_DATABASE}`);
    expect(target.pathname).toBe('/civicos_e2e');
    expect(target.searchParams.get('schema')).toBe('public');
  });

  it('fails closed when no explicit process-only target is supplied', () => {
    expect(refuseMessage(undefined)).toBe('E2E_DATABASE_URL_REQUIRED');
    expect(refuseMessage('')).toBe('E2E_DATABASE_URL_REQUIRED');
    expect(refuseMessage('   ')).toBe('E2E_DATABASE_URL_REQUIRED');
  });

  it.each([
    [
      'postgresql://127.0.0.1:5432/civicos',
      'main application database (civicos)',
    ],
    [
      'postgresql://127.0.0.1:5432/civicos_test',
      'legacy test database (civicos_test)',
    ],
    [
      'postgresql://127.0.0.1:5432/civicos_demo',
      'wrong DB name (civicos_demo)',
    ],
    [
      'postgresql://127.0.0.1:5432/civicos_demo?schema=public',
      'wrong DB name with query',
    ],
    [
      'postgresql://127.0.0.1:5432/civicos_e2e_test',
      'DB name prefix collision',
    ],
    ['postgresql://127.0.0.1:5432/CIVICOS_E2E', 'DB name case mismatch'],
    ['postgresql://127.0.0.1:5432/civicos_e2e/', 'trailing slash path'],
    ['postgresql://127.0.0.1:5432/civicos_e2e/extra', 'extra path segments'],
    ['postgresql://127.0.0.1:5433/civicos_e2e', 'legacy mapped port 5433'],
    ['postgresql://127.0.0.1:5434/civicos_e2e', 'other wrong port'],
    ['postgresql://[::1]:5432/civicos_e2e', 'IPv6 loopback not on allowlist'],
    ['postgresql://localhost:5432/civicos_e2e', 'hostname localhost'],
    ['postgresql://0.0.0.0:5432/civicos_e2e', 'wildcard bind hostname'],
    ['postgresql://10.1.2.3:5432/civicos_e2e', 'remote hostname'],
    ['postgresql://example.test:5432/civicos_e2e', 'non-IP hostname'],
    ['http://127.0.0.1:5432/civicos_e2e', 'wrong protocol'],
    ['mysql://127.0.0.1:5432/civicos_e2e', 'other protocol'],
    ['postgresql:', 'bare scheme, no host'],
    [`${VALID}#fragment`, 'URL fragment'],
  ])('refuses %s (%s)', (raw) => {
    expect(refuseMessage(raw)).toBe('E2E_DATABASE_URL_REFUSED');
  });

  it.each([
    ['not-a-url', 'plain text'],
    [':///civicos_e2e', 'empty authority'],
  ])('rejects malformed target %s (%s)', (raw) => {
    expect(refuseMessage(raw)).toBe('E2E_DATABASE_URL_MALFORMED');
  });

  it('only accepts the postgres protocol family', () => {
    const loopback = resolveE2EDatabaseTarget(
      env('postgres://e2e@127.0.0.1:5432/civicos_e2e'),
    );
    expect(loopback.pathname).toBe('/civicos_e2e');
  });

  it('never includes the URL or its credentials in error messages', () => {
    const leaked = 'postgresql://e2e:supersecret@10.1.2.3:5432/civicos_demo';
    expect(refuseMessage(leaked)).toBe('E2E_DATABASE_URL_REFUSED');
  });

  it('fails closed for a snapshot without the target variable', () => {
    expect(() => resolveE2EDatabaseTarget({})).toThrow(
      'E2E_DATABASE_URL_REQUIRED',
    );
  });

  it('accepts the canonical safe query parameters', () => {
    for (const query of [
      '',
      '?schema=public',
      '?connection_limit=1',
      '?schema=public&connection_limit=7',
    ]) {
      const target = resolveE2EDatabaseTarget(env(`${VALID}${query}`));
      expect(target.pathname).toBe('/civicos_e2e');
    }
  });

  it.each([
    ['postgresql://127.0.0.1:5432/civicos_e2e?host=10.1.2.3', 'host override'],
    ['postgresql://127.0.0.1:5432/civicos_e2e?port=5433', 'port override'],
    [
      'postgresql://127.0.0.1:5432/civicos_e2e?dbname=civicos',
      'dbname override',
    ],
    ['postgresql://127.0.0.1:5432/civicos_e2e?sslmode=disable', 'unknown key'],
    [
      'postgresql://127.0.0.1:5432/civicos_e2e?schema=public&schema=public',
      'duplicate schema key',
    ],
    [
      'postgresql://127.0.0.1:5432/civicos_e2e?connection_limit=1&connection_limit=1',
      'duplicate connection_limit key',
    ],
    [
      'postgresql://127.0.0.1:5432/civicos_e2e?schema=demo',
      'non-public schema',
    ],
    ['postgresql://127.0.0.1:5432/civicos_e2e?schema=', 'empty schema value'],
    [
      'postgresql://127.0.0.1:5432/civicos_e2e?connection_limit=0',
      'zero connection limit',
    ],
    [
      'postgresql://127.0.0.1:5432/civicos_e2e?connection_limit=-2',
      'negative connection limit',
    ],
    [
      'postgresql://127.0.0.1:5432/civicos_e2e?connection_limit=1.5',
      'non-integer connection limit',
    ],
    [
      'postgresql://127.0.0.1:5432/civicos_e2e?connection_limit=abc',
      'non-numeric connection limit',
    ],
  ])('refuses unsafe query: %s (%s)', (raw) => {
    expect(refuseMessage(raw)).toBe('E2E_DATABASE_URL_REFUSED');
  });
});
