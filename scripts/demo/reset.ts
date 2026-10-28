// DB-CONSOLIDATION SLICE (Task 4): demo reset retired. The shared E2E
// lifecycle is now the only owner of app-row resets, and `demo:reset` must
// never truncate `civicos` again. resetDemo rejects before target resolution,
// confirmation, Prisma import, database connection, evidence cleanup or write.
// Pure helpers (resolveResetTarget, requireResetConfirm) and BUSINESS_TABLES
// stay exported for existing pure tests; nothing here touches a database.
// demo-db itself is leaf-pure (no Prisma/domain), so its static import is safe.
import {
  type DemoEnv,
  type DemoTarget,
  assertDemoTarget,
  resolveDemoTarget,
} from './demo-db';

export const DEMO_RESET_RETIRED_CODE = 'DEMO_RESET_RETIRED_USE_E2E_LIFECYCLE';

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
  // Land inventory (leaf -> root; TRUNCATE ... CASCADE made order safe).
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

type ResetPrisma = {
  $queryRawUnsafe: <T>(query: string) => Promise<T>;
  $executeRawUnsafe: (query: string) => Promise<unknown>;
  evidence: {
    findMany: (args: {
      where: { metadata: { path: string[]; equals: string } };
      select: { storageKey: true };
    }) => Promise<Array<{ storageKey: string }>>;
  };
};

/**
 * Retired: always rejects, before any database, Prisma, or evidence activity.
 * The injected (or real) Prisma handle is never touched.
 */
export async function resetDemo(
  _env: DemoEnv = process.env,
  _database?: ResetPrisma,
): Promise<void> {
  throw new Error(DEMO_RESET_RETIRED_CODE);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/demo/reset.ts')) {
  resetDemo().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
