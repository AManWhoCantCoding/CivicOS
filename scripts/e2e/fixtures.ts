import { loadEnvConfig } from '@next/env';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const type = 'Karaoke — Đ3 khoản 21(a)';
const runId = process.env.CIVICOS_E2E_RUN_ID ?? '';
const password = process.env.CIVICOS_E2E_FIXTURE_PASSWORD ?? '';
const emails = ['commander', 'field', 'unassigned'].map(
  (role) => `ps007-e2e-${runId}-${role}@example.test`,
);
const ouId = `ps007-e2e-${runId}`;
const checklistId = `${ouId}-checklist`;
const roleIds = ['commander', 'field_officer'].map(
  (role) => `${ouId}-role-${role}`,
);
const checkpointPath = resolve(
  process.cwd(),
  `.brain/evidence/03-ps-e1005-intake-report/logs/${runId}.projection-checkpoints.json`,
);

function checkpointSnapshot(
  rows: Array<{
    name: string;
    lastRecordedAt: Date | null;
    processedEventIds: unknown;
    updatedAt: Date;
  }>,
): string {
  const canonical = rows
    .map((row) => ({
      name: row.name,
      lastRecordedAt: row.lastRecordedAt?.toISOString() ?? null,
      processedEventIds: row.processedEventIds,
      updatedAt: row.updatedAt.toISOString(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return JSON.stringify(canonical);
}

function validate(): void {
  if (process.env.CIVICOS_E2E_RUN !== '1')
    throw new Error('E2E_FIXTURE_RUN_REQUIRED');
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      runId,
    )
  )
    throw new Error('E2E_FIXTURE_RUN_ID_INVALID');
  if (Buffer.byteLength(password) < 32)
    throw new Error('E2E_FIXTURE_PASSWORD_WEAK');
}

async function main(action: string): Promise<void> {
  validate();
  loadEnvConfig(process.cwd());
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('E2E_DATABASE_URL_REQUIRED');
  const target = new URL(raw);
  if (
    target.hostname !== '127.0.0.1' ||
    target.port !== '5433' ||
    target.pathname !== '/civicos_demo'
  )
    throw new Error('E2E_DATABASE_URL_REFUSED');
  const url = new URL(raw);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.hostname !== '127.0.0.1' ||
    url.port !== '5433' ||
    url.pathname !== '/civicos_demo' ||
    url.hash
  )
    throw new Error('E2E_DATABASE_URL_TARGET_REJECTED');
  const [{ PrismaClient }, { hashPassword }, { checklistForType }] =
    await Promise.all([
      import('@prisma/client'),
      import('../../src/modules/identity/local-provider'),
      import('../../src/modules/inspections/checklist-catalog'),
    ]);
  const prisma = new PrismaClient();
  try {
    const identity = await prisma.$queryRaw<
      Array<{ database: string; port: number; address: string | null }>
    >`SELECT current_database() AS database, (SELECT setting::int FROM pg_settings WHERE name='port') AS port, inet_server_addr()::text AS address`;
    if (
      identity[0]?.database !== 'civicos_demo' ||
      identity[0]?.port !== 5432 ||
      !identity[0]?.address
    )
      throw new Error('E2E_SQL_IDENTITY_REJECTED');
    const migration = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT count(*)::bigint AS count FROM "_prisma_migrations" WHERE migration_name='20260925000000_ps_e1007_completion' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    const roles = await prisma.role.findMany({
      where: { name: { in: ['commander', 'field_officer'] } },
      select: { id: true, name: true },
    });
    if (Number(migration[0]?.count ?? 0) !== 1)
      throw new Error('E2E_E1007_PREFLIGHT_FAILED');

    if (action === 'setup') {
      const checkpoints = await prisma.projectionCheckpoint.findMany();
      mkdirSync(resolve(checkpointPath, '..'), { recursive: true });
      writeFileSync(checkpointPath, checkpointSnapshot(checkpoints), {
        flag: 'wx',
      });
      await prisma.$transaction(async (tx) => {
        const userIds = [0, 1, 2].map((index) => `ps007-e2e-${runId}-${index}`);
        const collision = await tx.organizationUnit.findUnique({
          where: { id: ouId },
        });
        const userIdCollision = await tx.user.findFirst({
          where: { id: { in: userIds } },
        });
        const roleIdCollision = await tx.role.findFirst({
          where: { id: { in: roleIds } },
        });
        if (
          collision ||
          userIdCollision ||
          roleIdCollision ||
          (await tx.user.findFirst({ where: { email: { in: emails } } }))
        )
          throw new Error('E2E_FIXTURE_COLLISION');
        await tx.organizationUnit.create({
          data: {
            id: ouId,
            name: `PS007 E2E ${runId}`,
            level: 'district',
            active: true,
          },
        });
        const roleMap = new Map(roles.map((r) => [r.name, r.id]));
        for (const [index, name] of ['commander', 'field_officer'].entries()) {
          if (roleMap.has(name)) continue;
          const role = await tx.role.create({
            data: {
              id: roleIds[index],
              name,
              description: `Synthetic E2E fixture role ${runId}`,
            },
          });
          roleMap.set(name, role.id);
        }
        for (const [index, role] of [
          'commander',
          'field_officer',
          'field_officer',
        ].entries()) {
          const user = await tx.user.create({
            data: {
              id: `ps007-e2e-${runId}-${index}`,
              email: emails[index],
              name: `PS007 E2E ${role}`,
              passwordHash: hashPassword(password),
              organizationUnitId: ouId,
            },
          });
          await tx.userRole.create({
            data: { userId: user.id, roleId: roleMap.get(role)! },
          });
        }
        if (
          !(await tx.checklistTemplate.findUnique({
            where: {
              establishmentType_version: {
                establishmentType: type,
                version: 2,
              },
            },
          }))
        ) {
          if (
            await tx.checklistTemplate.findUnique({
              where: { id: checklistId },
            })
          )
            throw new Error('E2E_FIXTURE_COLLISION');
          const items = checklistForType(type);
          if (!items) throw new Error('E2E_CHECKLIST_UNAVAILABLE');
          await tx.checklistTemplate.create({
            data: {
              id: checklistId,
              establishmentType: type,
              version: 2,
              title: `LOCAL/DEMO — ${type} (bản dự thảo không đầy đủ)`,
              items,
            },
          });
        }
      });
      return;
    }
    if (action !== 'cleanup') throw new Error('E2E_FIXTURE_ACTION_INVALID');
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const actors = users.map((u) => u.id);
    const establishments = await prisma.establishment.findMany({
      where: { organizationId: ouId },
      select: { id: true },
    });
    const establishmentIds = establishments.map((r) => r.id);
    const inspections = await prisma.inspection.findMany({
      where: { establishmentId: { in: establishmentIds } },
      select: { id: true },
    });
    const inspectionIds = inspections.map((r) => r.id);
    const findings = await prisma.inspectionFinding.findMany({
      where: { inspectionId: { in: inspectionIds } },
      select: { id: true },
    });
    const recommendations = await prisma.enforcementRecommendation.findMany({
      where: { inspectionId: { in: inspectionIds } },
      select: { id: true },
    });
    const resources = [
      ...establishmentIds,
      ...inspectionIds,
      ...findings.map((r) => r.id),
      ...recommendations.map((r) => r.id),
    ];
    const auditIds = (
      await prisma.auditEvent.findMany({
        where: {
          OR: [{ actorId: { in: actors } }, { resourceId: { in: resources } }],
        },
        select: { id: true },
      })
    ).map((r) => r.id);
    const assignmentIds = (
      await prisma.assignment.findMany({
        where: {
          OR: [
            { assigneeUserId: { in: actors } },
            { resourceId: { in: resources } },
          ],
        },
        select: { id: true },
      })
    ).map((r) => r.id);
    const slaIds = (
      await prisma.slaInstance.findMany({
        where: { resourceId: { in: resources } },
        select: { id: true },
      })
    ).map((r) => r.id);
    const evidence = await prisma.evidence.findMany({
      where: {
        OR: [{ actorId: { in: actors } }, { resourceId: { in: resources } }],
      },
      select: { id: true, storageKey: true },
    });
    const ownedEvents = await prisma.eventRecord.findMany({
      where: {
        OR: [
          { organizationId: ouId },
          { actorId: { in: actors } },
          {
            aggregateId: {
              in: [...resources, ...auditIds, ...assignmentIds, ...slaIds],
            },
          },
        ],
      },
      select: {
        eventId: true,
        aggregateType: true,
        aggregateId: true,
        recordedAt: true,
      },
    });
    const eventIds = ownedEvents.map((r) => r.eventId);
    const projectionTuples = [
      ...new Map(
        ownedEvents.map((r) => [
          `${r.aggregateType}\0${r.aggregateId}`,
          { aggregateType: r.aggregateType, aggregateId: r.aggregateId },
        ]),
      ).values(),
    ];
    const { LocalEvidenceStorage, cleanupDemoEvidenceFiles } =
      await import('../../src/modules/platform/evidence/storage-adapter');
    await cleanupDemoEvidenceFiles(
      new LocalEvidenceStorage(),
      evidence.map((r) => r.storageKey),
    );
    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({
        where: {
          OR: [
            { userId: { in: actors } },
            { resourceId: { in: resources } },
            { sourceEventId: { in: eventIds } },
          ],
        },
      });
      await tx.offlineCommand.deleteMany({
        where: { actorId: { in: actors } },
      });
      await tx.approval.deleteMany({
        where: {
          OR: [
            { requestedById: { in: actors } },
            { decidedById: { in: actors } },
            { resourceId: { in: resources } },
          ],
        },
      });
      await tx.evidence.deleteMany({
        where: { id: { in: evidence.map((r) => r.id) } },
      });
      await tx.outboxMessage.deleteMany({
        where: { eventId: { in: eventIds } },
      });
      await tx.eventRecord.deleteMany({ where: { eventId: { in: eventIds } } });
      for (const tuple of projectionTuples)
        await tx.projectionRecord.deleteMany({ where: tuple });
      await tx.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
      await tx.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
      await tx.slaInstance.deleteMany({ where: { id: { in: slaIds } } });
      await tx.enforcementRecommendation.deleteMany({
        where: { id: { in: recommendations.map((r) => r.id) } },
      });
      await tx.inspectionFinding.deleteMany({
        where: { id: { in: findings.map((r) => r.id) } },
      });
      await tx.inspection.deleteMany({ where: { id: { in: inspectionIds } } });
      await tx.establishment.deleteMany({
        where: { id: { in: establishmentIds } },
      });
      await tx.checklistTemplate.deleteMany({
        where: { id: checklistId, establishmentType: type, version: 2 },
      });
      await tx.user.deleteMany({ where: { id: { in: actors } } });
      for (const id of roleIds) {
        const role = await tx.role.findUnique({ where: { id } });
        if (role && !(await tx.userRole.findFirst({ where: { roleId: id } })))
          await tx.role.delete({ where: { id } });
      }
      await tx.organizationUnit.deleteMany({ where: { id: ouId } });
    });
    const baseline = readFileSync(checkpointPath, 'utf8');
    const baselineRows = JSON.parse(baseline) as Array<{
      name: string;
      lastRecordedAt: string | null;
      processedEventIds: unknown;
      updatedAt: string;
    }>;
    const checkpoints = await prisma.projectionCheckpoint.findMany();
    const baselineByName = new Map(baselineRows.map((row) => [row.name, row]));
    const currentByName = new Map(checkpoints.map((row) => [row.name, row]));
    const ownedEventSet = new Set(eventIds);
    const invalid =
      baselineRows.some((base) => {
        const row = currentByName.get(base.name);
        if (!row) return true;
        const ids = row.processedEventIds;
        const baseIds = base.processedEventIds;
        if (!Array.isArray(ids) || !Array.isArray(baseIds)) return true;
        const unchanged = JSON.stringify(ids) === JSON.stringify(baseIds);
        if (unchanged)
          return checkpointSnapshot([row]) !== JSON.stringify([base]);
        if (
          ids.length < baseIds.length ||
          !baseIds.every((id, index) => ids[index] === id)
        )
          return true;
        const appended = ids.slice(baseIds.length);
        if (
          !appended.every(
            (id) => typeof id === 'string' && ownedEventSet.has(id),
          )
        )
          return true;
        const appendedEvents = ownedEvents.filter((event) =>
          appended.includes(event.eventId),
        );
        const expectedRecorded =
          [
            base.lastRecordedAt,
            ...appendedEvents.map((event) => event.recordedAt.toISOString()),
          ]
            .filter((value): value is string => value !== null)
            .sort()
            .at(-1) ?? null;
        return (
          row.lastRecordedAt?.toISOString() !== expectedRecorded ||
          row.updatedAt < new Date(base.updatedAt)
        );
      }) ||
      checkpoints.some((row) => {
        if (baselineByName.has(row.name)) return false;
        return (
          !Array.isArray(row.processedEventIds) ||
          row.processedEventIds.length === 0 ||
          !row.processedEventIds.every(
            (id) => typeof id === 'string' && ownedEventSet.has(id),
          )
        );
      });
    if (invalid) {
      const current = checkpointSnapshot(checkpoints);
      const evidence = {
        expectedSha256: createHash('sha256').update(baseline).digest('hex'),
        actualSha256: createHash('sha256').update(current).digest('hex'),
      };
      writeFileSync(
        `${checkpointPath}.mismatch`,
        JSON.stringify(evidence, null, 2),
        { flag: 'wx' },
      );
      throw new Error('E2E_PROJECTION_CHECKPOINT_DRIFT');
    }
    await prisma.$transaction(async (tx) => {
      for (const base of baselineRows) {
        const row = currentByName.get(base.name)!;
        if (checkpointSnapshot([row]) !== JSON.stringify([base]))
          await tx.projectionCheckpoint.update({
            where: { name: base.name },
            data: {
              lastRecordedAt: base.lastRecordedAt
                ? new Date(base.lastRecordedAt)
                : null,
              processedEventIds: base.processedEventIds as never,
              updatedAt: new Date(base.updatedAt),
            },
          });
      }
      for (const row of checkpoints)
        if (!baselineByName.has(row.name))
          await tx.projectionCheckpoint.delete({ where: { name: row.name } });
    });
    const restored = checkpointSnapshot(
      await prisma.projectionCheckpoint.findMany({ orderBy: { name: 'asc' } }),
    );
    if (restored !== baseline) {
      writeFileSync(
        `${checkpointPath}.mismatch`,
        JSON.stringify(
          {
            expectedSha256: createHash('sha256').update(baseline).digest('hex'),
            actualSha256: createHash('sha256').update(restored).digest('hex'),
          },
          null,
          2,
        ),
        { flag: 'wx' },
      );
      throw new Error('E2E_PROJECTION_CHECKPOINT_RESTORE_FAILED');
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main(process.argv[2] ?? '').catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'E2E_FIXTURE_FAILED'}\n`,
  );
  process.exitCode = 1;
});
