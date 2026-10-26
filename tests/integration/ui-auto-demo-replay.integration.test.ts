import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { evaluateLiveMutation } from '@/modules/demo/live-mutation';

// T-007 AC-4: safe replay reuses the existing domain dedupe/version
// contract; unsafe replay never runs a duplicate mutation. The DB-backed
// section below is explicitly gated: without RUN_DB_TESTS=1 and a database
// URL it reports skipped, never a faked pass, and it refuses the demo
// database (`civicos`) before opening any connection.

describe('T-007 AC-4 replay policy mirrors the existing domain contract', () => {
  const policy = {
    fixtureRef: 'demo-incident-01',
    idempotencyStrategy: 'existing-idempotency-key',
    replay: 'safe',
    cleanup: 'operator',
  };
  const base = {
    demoModeEnabled: true,
    targetName: 'civicos',
    surface: 'web',
    mutationClass: 'create',
    action: 'submit',
    manifestVersion: '1',
  };

  it('permits replay only with an explicit safe existing strategy', () => {
    expect(evaluateLiveMutation({ ...base, policy, isReplay: true })).toEqual({
      ok: true,
      reason: 'LIVE_MUTATION_READY',
    });
    expect(
      evaluateLiveMutation({
        ...base,
        policy: { ...policy, replay: 'blocked' },
        isReplay: true,
      }),
    ).toEqual({ ok: false, reason: 'LIVE_MUTATION_BLOCKED_REPLAY' });
  });

  it('traces safe replay to the existing intake dedupe/version implementation', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/modules/incidents/commands.ts'),
      'utf8',
    );
    // Existing idempotency-key lookup returning the same aggregate.
    expect(source).toContain('idempotencyKey: input.idempotencyKey');
    expect(source).toContain('reportId_command_idempotencyKey');
    // Existing optimistic version check on state transitions.
    expect(source).toContain(
      'where: { id: reportId, version: report.version }',
    );
    // Conflicts surface as errors, never fake success.
    expect(source).toContain('INVALID_INTAKE_CONFIRMATION');
  });
});

const enabled = process.env.RUN_DB_TESTS === '1' && !!process.env.DATABASE_URL;

const stamp = randomUUID().replace(/-/g, '').slice(0, 8);
const replayOrgId = `t007-org-${stamp}`;
const replayUserId = `t007-commander-${stamp}`;
const replayKey = `t007-replay:${stamp}`;

function dbNameOf(url: string): string {
  const afterSlash = url.split('/').pop() ?? '';
  return afterSlash.split('?')[0] ?? '';
}

describe.skipIf(!enabled)(
  'T-007 AC-4 existing intake dedupe/version/conflict on a safe database',
  () => {
    let prisma: Awaited<typeof import('@/lib/prisma')>['prisma'];
    let commands: typeof import('@/modules/incidents');
    let reportId = '';

    const actor = {
      id: replayUserId,
      email: `${replayUserId}@civicos.local`,
      name: replayUserId,
      roles: ['commander'] as 'commander'[],
      organizationUnitId: replayOrgId,
    };

    beforeAll(async () => {
      const url = process.env.DATABASE_URL ?? '';
      const name = dbNameOf(url);
      if (name === 'civicos_demo' || name === 'civicos' || !name) {
        throw new Error(
          `T007_REPLAY_REFUSED: refusing database "${name || '<empty>'}"`,
        );
      }
      ({ prisma } = await import('@/lib/prisma'));
      commands = await import('@/modules/incidents');
      const current = await prisma.$queryRaw<
        [{ database: string }]
      >`SELECT current_database() AS database`;
      expect(['civicos_demo', 'civicos']).not.toContain(current[0]?.database);
      await prisma.organizationUnit.upsert({
        where: { id: replayOrgId },
        update: { active: true },
        create: { id: replayOrgId, name: 'T007 Replay', level: 'unit' },
      });
      await prisma.user.create({
        data: {
          id: replayUserId,
          email: actor.email,
          name: actor.name,
          passwordHash: `t007-hash-${stamp}`,
          organizationUnitId: replayOrgId,
        },
      });
    });

    afterAll(async () => {
      if (!prisma) return;
      const tracked = reportId ? [reportId] : [];
      await prisma.notification.deleteMany({
        where: {
          OR: [{ resourceId: { in: tracked } }, { userId: replayUserId }],
        },
      });
      await prisma.slaInstance.deleteMany({
        where: { resourceId: { in: tracked } },
      });
      await prisma.auditEvent.deleteMany({
        where: { resourceId: { in: tracked } },
      });
      const eventRows = tracked.length
        ? await prisma.eventRecord.findMany({
            where: { aggregateId: { in: tracked } },
            select: { eventId: true },
          })
        : [];
      const eventIds = eventRows.map(({ eventId }) => eventId);
      if (eventIds.length) {
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: eventIds } },
        });
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: eventIds } },
        });
      }
      await prisma.intakeCommand.deleteMany({
        where: { reportId: { in: tracked } },
      });
      await prisma.intakeReport.deleteMany({
        where: { id: { in: tracked } },
      });
      await prisma.session.deleteMany({ where: { userId: replayUserId } });
      await prisma.user.deleteMany({ where: { id: replayUserId } });
      await prisma.organizationUnit.deleteMany({
        where: { id: replayOrgId },
      });
      await prisma.$disconnect();
    });

    it(
      'replays a create with the same idempotency key into the same aggregate',
      { timeout: 60000 },
      async () => {
        const first = await commands.registerIntakeReport(
          {
            channel: 'in_person',
            receivedAt: new Date().toISOString(),
            content: `T007 replay probe ${stamp}`,
            sourceName: 'Nguyen Van A',
            latitude: 21.01,
            longitude: 106.02,
            idempotencyKey: replayKey,
          },
          actor,
        );
        const second = await commands.registerIntakeReport(
          {
            channel: 'in_person',
            receivedAt: new Date().toISOString(),
            content: `T007 replay probe ${stamp}`,
            sourceName: 'Nguyen Van A',
            latitude: 21.01,
            longitude: 106.02,
            idempotencyKey: replayKey,
          },
          actor,
        );
        expect(second.reportId).toBe(first.reportId);
        reportId = first.reportId;
        expect(
          await prisma.intakeReport.count({
            where: { idempotencyKey: replayKey },
          }),
        ).toBe(1);
      },
    );

    it(
      'keeps conflict and stale-version errors visible instead of fake success',
      { timeout: 60000 },
      async () => {
        expect(reportId).toBeTruthy();
        await commands.verifyIntakeReport(reportId, actor, {
          classification: 'sufficient',
          verificationNote: 'T007 verification.',
        });
        const confirmed = await commands.confirmIntakeReport(reportId, actor, {
          idempotencyKey: `${replayKey}:confirm`,
        });
        const replayed = await commands.confirmIntakeReport(reportId, actor, {
          idempotencyKey: `${replayKey}:confirm`,
        });
        expect(replayed).toEqual(confirmed);
        await expect(
          commands.verifyIntakeReport(reportId, actor, {
            classification: 'sufficient',
            verificationNote: 'T007 duplicate verify.',
          }),
        ).rejects.toThrow();
        await expect(
          prisma.intakeReport.update({
            where: { id: reportId, version: 999999 },
            data: { status: 'VERIFIED' },
          }),
        ).rejects.toThrow();
      },
    );
  },
);
