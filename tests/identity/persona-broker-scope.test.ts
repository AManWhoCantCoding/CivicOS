import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { switchDemoPersona } from '@/modules/demo/persona-broker';
import { requireRole } from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';

function userRef(id: string, roles: IdentityUser['roles']): IdentityUser {
  return {
    id,
    email: `${id}@civicos.local`,
    name: id,
    roles,
    organizationUnitId: 'unit-nghia-tru',
  };
}

describe('T-003 AC-3 persona switch preserves authorization boundaries', () => {
  it('reloads fresh scope per persona; no scope is carried or granted', async () => {
    const scopes = [
      { organizationUnitId: 'unit-nghia-tru', assignmentCount: 2 },
      { organizationUnitId: 'unit-nghia-tru', assignmentCount: 0 },
    ];
    let scopeIndex = 0;
    const reloadScope = vi.fn(async () => scopes[scopeIndex++]);
    const base = {
      providerAvailable: true,
      endCurrentSession: vi.fn(),
      establishSession: vi.fn(async () => ({
        expiresAt: new Date('2026-10-20T00:00:00.000Z'),
      })),
    };
    const first = await switchDemoPersona(
      {
        alias: 'commander',
        mode: 'LIVE_DEMO',
        guardState: 'ready',
        target: 'civicos',
      },
      {
        ...base,
        authenticate: async () => ({
          displayName: 'Commander demo',
          roleLabel: 'commander',
        }),
        reloadScope,
      },
    );
    const second = await switchDemoPersona(
      {
        alias: 'unassigned',
        mode: 'LIVE_DEMO',
        guardState: 'ready',
        target: 'civicos',
      },
      {
        ...base,
        authenticate: async () => ({
          displayName: 'Unassigned demo',
          roleLabel: 'field_officer',
        }),
        reloadScope,
      },
    );
    expect(first.status).toBe('authenticated');
    expect(second.status).toBe('authenticated');
    if (first.status !== 'authenticated' || second.status !== 'authenticated') {
      return;
    }
    expect(first.scope.assignmentState).toBe('ready');
    expect(second.scope.assignmentState).toBe('empty');
    expect(reloadScope).toHaveBeenCalledTimes(2);

    // Existing authorization stays authoritative after the switch: the
    // assignment-less persona still fails the commander gate.
    expect(() =>
      requireRole(
        userRef('persona-unassigned', ['field_officer']),
        'commander',
      ),
    ).toThrow('FORBIDDEN');
    expect(() =>
      requireRole(userRef('persona-commander', ['commander']), 'commander'),
    ).not.toThrow();
  });

  it('broker and route add no grant, role, cookie or schema seam', () => {
    const broker = readFileSync(
      join(process.cwd(), 'src/modules/demo/persona-broker.ts'),
      'utf8',
    );
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/demo/persona/route.ts'),
      'utf8',
    );
    for (const source of [broker, route]) {
      expect(source).not.toContain('grantAssignments');
      expect(source).not.toContain('createAssignments');
      expect(source).not.toContain('hashPassword');
      expect(source).not.toContain('passwordHash');
      expect(source).not.toContain('tokenHash');
      expect(source).not.toContain('randomBytes');
    }
    expect(broker).not.toContain('process.env');
    expect(broker).not.toContain('@/lib/prisma');
    // The dev fixture default stays server-side: never in JSON, cookie, or log.
    expect(route).not.toMatch(/json\([^)]*demoPassword/);
    expect(route).not.toMatch(/console\./);
    expect(route).toContain("=== 'production'");
    expect(route).toContain('evaluateDemoTargetGuard');
    expect(route).toContain('deleteCurrentSession');
    expect(route).toContain('httpOnly: true');
  });
});
