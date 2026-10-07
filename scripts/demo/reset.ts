// Reset demo co guard: chi truncate dung database demo da chi dinh.
// Khong static-import Prisma o top-level: target phai duoc validate truoc khi mo connection.
import {
  type DemoEnv,
  type DemoTarget,
  applyDemoTargetToEnv,
  assertDemoTarget,
  resolveDemoTarget,
} from './demo-db';
import {
  cleanupDemoEvidenceFiles,
  LocalEvidenceStorage,
} from '@/modules/platform/evidence/storage-adapter';

export const BUSINESS_TABLES = [
  'Assignment',
  'OutboxMessage',
  'EventRecord',
  'ProjectionCheckpoint',
  'ProjectionRecord',
  'AuditEvent',
  'Evidence',
  'SlaInstance',
  'Notification',
  'OfflineCommand',
  'IntakeReport',
  'IntakeCommand',
  'Incident',
  'Approval',
  'Establishment',
  'ChecklistTemplate',
  'Inspection',
  'InspectionFinding',
  'EnforcementRecommendation',
  'SuspiciousVehicleEntry',
  'VehicleObservation',
  'VehicleVerification',
  'SubjectManagementActivity',
  'SubjectManagementRecord',
  'Subject',
  'ResidentMonthlyReport',
  'Session',
  'UserRole',
  'Role',
  'User',
  'OrganizationUnit',
  // Land inventory (leaf -> root; TRUNCATE ... CASCADE makes order safe).
  'LandNationalSync',
  'LandApplicationParcel',
  'LandApplicationParty',
  'LandEncumbrance',
  'LandRight',
  'LandChangeApplication',
  'LandParcel',
  'LandParty',
] as const;

export function resolveResetTarget(env: DemoEnv = process.env): DemoTarget {
  const target = resolveDemoTarget(env.DATABASE_URL, env.DEMO_DATABASE_URL);
  assertDemoTarget(target.url);
  return target;
}

export function requireResetConfirm(env: DemoEnv = process.env): void {
  if (env.DEMO_RESET_CONFIRM !== '1' && !process.argv.includes('--confirm')) {
    throw new Error(
      'DEMO_RESET_CONFIRM_REQUIRED: dat DEMO_RESET_CONFIRM=1 hoac --confirm truoc thao tac pha huy',
    );
  }
}

async function countRows(prisma: {
  $queryRawUnsafe: <T>(query: string) => Promise<T>;
}): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of BUSINESS_TABLES) {
    const rows = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*)::bigint AS count FROM "${table}"`,
    );
    counts[table] = Number(rows[0]?.count ?? 0);
  }
  return counts;
}

type ResetPrisma = Parameters<typeof countRows>[0] & {
  evidence: {
    findMany: (args: {
      where: { metadata: { path: string[]; equals: string } };
      select: { storageKey: true };
    }) => Promise<Array<{ storageKey: string }>>;
  };
  $executeRawUnsafe: (query: string) => Promise<unknown>;
};

export async function resetDemo(
  env: DemoEnv = process.env,
  database?: ResetPrisma,
): Promise<void> {
  const target = resolveResetTarget(env);
  console.log(
    `Demo reset target database: ${target.displayUrl} (name=${target.dbName})`,
  );
  requireResetConfirm(env);
  console.log(`Confirmed destructive reset on "${target.dbName}".`);
  let prisma = database;
  if (!prisma) {
    applyDemoTargetToEnv(target);
    const imported = await import('@/lib/prisma');
    prisma = imported.prisma;
  }
  const before = await countRows(prisma);
  const evidence = await prisma.evidence.findMany({
    where: { metadata: { path: ['demoNamespace'], equals: 'civicos-demo' } },
    select: { storageKey: true },
  });
  await cleanupDemoEvidenceFiles(
    new LocalEvidenceStorage(),
    evidence.map((row) => row.storageKey),
  );
  const tables = BUSINESS_TABLES.map((table) => `"${table}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`,
  );
  const after = await countRows(prisma);
  console.log(`Demo reset summary before: ${JSON.stringify(before)}`);
  console.log(
    `Demo reset summary after: ${JSON.stringify(after)}; evidenceFiles=${evidence.length}`,
  );
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/demo/reset.ts')) {
  void resetDemo().then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(error);
      process.exit(1);
    },
  );
}
