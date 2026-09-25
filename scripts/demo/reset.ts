// Reset demo co guard: chi truncate dung database demo da chi dinh.
// Khong static-import Prisma o top-level: target phai duoc resolve +
// validate + ap vao env TRUOC khi connection duoc mo.
import {
  type DemoEnv,
  type DemoTarget,
  applyDemoTargetToEnv,
  assertDemoTarget,
  resolveDemoTarget,
} from './demo-db';

const BUSINESS_TABLES = [
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
  'Incident',
  'Approval',
  'Establishment',
  'Inspection',
  'InspectionFinding',
  'EnforcementRecommendation',
  'SuspiciousVehicleEntry',
  'VehicleObservation',
  'VehicleVerification',
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

export async function resetDemo(env: DemoEnv = process.env): Promise<void> {
  const target = resolveResetTarget(env);
  console.log(
    `Demo reset target database: ${target.displayUrl} (name=${target.dbName})`,
  );
  requireResetConfirm(env);
  console.log(`Confirmed destructive reset on "${target.dbName}".`);
  applyDemoTargetToEnv(target);
  const { prisma } = await import('@/lib/prisma');
  const tables = BUSINESS_TABLES.map((table) => `"${table}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`,
  );
  console.log(
    'demo business data truncated; Role/User/OrganizationUnit duoc giu lai.',
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
