import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import * as platform from '@/modules/platform';

const repoRoot = path.resolve(__dirname, '..', '..');
const expectedIndexes = [
  'Evidence_actorId_receivedAt_idx',
  'SlaInstance_assigneeUserId_status_idx',
  'OfflineCommand_resourceType_resourceId_status_idx',
];

describe('shared field capabilities', () => {
  it('exposes only the public platform contract without persistence symbols', () => {
    const names = Object.keys(platform);
    expect(names).toEqual(
      expect.arrayContaining([
        'createEvidence',
        'getEvidence',
        'LocalEvidenceStorage',
        'createGeoArea',
        'createGeoPoint',
        'createInAppNotification',
        'listNotifications',
        'markNotificationRead',
        'createSla',
        'dueAt',
        'isOverdue',
        'markOverdue',
        'acceptOfflineCommand',
        'completeOfflineCommand',
        'failOfflineCommand',
        'listOfflineCommands',
        'markOfflineCommandSyncing',
        'rejectOfflineCommand',
        'assertOfflineCommandFresh',
      ]),
    );
    for (const name of names) {
      expect(name).not.toMatch(/prisma/i);
      expect(name).not.toMatch(/^(Incident|Inspection|VehicleObservation)/);
    }
  });

  it('keeps Incident, Inspection, and VehicleObservation writes outside the platform modules', () => {
    const roots = ['src/modules/platform', 'src/components/field'];
    const violations: string[] = [];
    const listSources = (root: string): string[] => {
      const absolute = path.join(repoRoot, root);
      const entries = readdirSync(absolute, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const candidate = path.join(absolute, entry.name);
        if (entry.isDirectory()) {
          for (const file of readdirSync(candidate))
            files.push(path.join(candidate, file));
        } else {
          files.push(candidate);
        }
      }
      return files.filter(
        (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
      );
    };
    for (const root of roots) {
      for (const file of listSources(root)) {
        const source = readFileSync(file, 'utf8');
        if (
          /@\/modules\/(incidents|inspections|vehicles)\b/.test(source) ||
          /prisma\.(incident|inspection|inspectionFinding|vehicleObservation|vehicleVerification)\s*\.\s*(create|update|upsert|delete)/.test(
            source,
          )
        )
          violations.push(path.relative(repoRoot, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it('ships a meaningful additive shared-capabilities migration that matches the schema', () => {
    const migrationsDir = path.join(repoRoot, 'prisma', 'migrations');
    const migration = readdirSync(migrationsDir).find((name) =>
      name.endsWith('_shared_field_capabilities'),
    );
    expect(migration).toBeTruthy();
    const sql = readFileSync(
      path.join(migrationsDir, migration as string, 'migration.sql'),
      'utf8',
    );
    expect(sql.trim().length).toBeGreaterThan(100);
    for (const index of expectedIndexes) {
      expect(sql).toContain(`IF NOT EXISTS "${index}"`);
    }
    const schema = readFileSync(
      path.join(repoRoot, 'prisma', 'schema.prisma'),
      'utf8',
    );
    for (const index of expectedIndexes) {
      expect(schema).toContain(`map: "${index}"`);
    }
  });
});
