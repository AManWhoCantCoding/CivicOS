import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';

function migrationNames(): string[] {
  const root = path.join(process.cwd(), 'prisma', 'migrations');
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readMigrationSql(name: string): string {
  return readFileSync(
    path.join(process.cwd(), 'prisma', 'migrations', name, 'migration.sql'),
    'utf8',
  );
}

function readSchema(): string {
  return readFileSync(
    path.join(process.cwd(), 'prisma', 'schema.prisma'),
    'utf8',
  );
}

const expectedMigrationChain = [
  '0001_event_first',
  '20260919042323_incident_approval',
  '20260919050000_approval_organization_scope',
  '20260919052000_inspection_cadence',
  '20260921090000_shared_field_capabilities',
  '20260922070000_ps_e1_007_inspection_contract',
  '20260922080000_ps_e1_009_vehicle_watch_contract',
  '20260922090000_ps_e1_009_vehicle_active_identity',
  '20260922092751_civicos',
  '20260922100000_ps_e1_009_vehicle_owner_lookup',
  '20260922_identity_role_catalog',
  '20260923090000_ps_e1004_resident_management',
  '20260924090000_ps_e1005_intake_report',
  '20260924100000_ps_e1005_canonical_channel',
];

const expectedModels = [
  'User',
  'Role',
  'UserRole',
  'OrganizationUnit',
  'Assignment',
  'Session',
  'EventRecord',
  'OutboxMessage',
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
  'ChecklistTemplate',
  'Inspection',
  'InspectionFinding',
  'EnforcementRecommendation',
  'SuspiciousVehicleEntry',
  'VehicleObservation',
  'VehicleVerification',
];

describe('database migration contract', () => {
  it('uses PostgreSQL as the configured production datasource', () => {
    expect(process.env.DATABASE_URL ?? 'postgresql://test').toContain(
      'postgresql',
    );
  });

  it('ships a clean-database migration for the event-first schema', () => {
    const migration = readMigrationSql('0001_event_first');
    expect(migration).toContain('CREATE TABLE "EventRecord"');
    expect(migration).toContain('CREATE TABLE "OutboxMessage"');
    expect(migration).toContain('CREATE TABLE "ProjectionRecord"');
  });

  it('applies Event kernel, Identity, platform, PS-E1-005, PS-E1-007 and PS-E1-009 migrations in dependency order', () => {
    expect(migrationNames()).toEqual(expectedMigrationChain);
  });

  it('keeps every migration additive with no destructive SQL', () => {
    for (const name of migrationNames()) {
      const sql = readMigrationSql(name);
      expect(sql).not.toMatch(/DROP\s+TABLE/i);
      expect(sql).not.toMatch(/DROP\s+COLUMN/i);
      expect(sql).not.toMatch(/ALTER\s+TABLE[^;]*\sDROP\s+COLUMN/i);
      expect(sql).not.toMatch(/\bTRUNCATE\b/i);
      expect(sql).not.toMatch(/DELETE\s+FROM/i);
      expect(sql).not.toMatch(/DROP\s+DATABASE/i);
      if (/DROP\s+INDEX/i.test(sql)) {
        const drops = sql.match(/DROP\s+INDEX[^\n;]*/gi) ?? [];
        expect(drops.length).toBeGreaterThan(0);
        for (const drop of drops) {
          expect(drop).toMatch(/IF\s+EXISTS/i);
        }
      }
    }
  });

  it('keeps the Prisma schema and migration lock on the PostgreSQL contract', () => {
    const schema = readSchema();
    expect(schema).toContain('provider = "postgresql"');
    for (const model of expectedModels) {
      expect(schema).toMatch(new RegExp(`model\\s+${model}\\s*\\{`));
    }
    const lock = readFileSync(
      path.join(process.cwd(), 'prisma', 'migrations', 'migration_lock.toml'),
      'utf8',
    );
    expect(lock).toContain('provider = "postgresql"');
  });

  it.skipIf(!postgresEnabled)(
    'keeps applied database migrations aligned with the committed chain',
    async () => {
      const applied = await prisma.$queryRawUnsafe<
        Array<{ migration_name: string }>
      >(
        'SELECT migration_name FROM "_prisma_migrations" ORDER BY migration_name ASC',
      );
      expect(applied.map((row) => row.migration_name)).toEqual(
        migrationNames(),
      );
    },
  );

  it.skipIf(!postgresEnabled)(
    'reports a second migrate status run as a no-op',
    { timeout: 120000 },
    () => {
      const first = execSync('npx prisma migrate status', {
        encoding: 'utf8',
        timeout: 120000,
      });
      const second = execSync('npx prisma migrate status', {
        encoding: 'utf8',
        timeout: 120000,
      });
      expect(first).toContain('Database schema is up to date');
      expect(second).toContain('Database schema is up to date');
    },
  );

  afterAll(async () => {
    if (!postgresEnabled) return;
    await prisma.$disconnect();
  });
});
