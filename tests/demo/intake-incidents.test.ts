import { describe, expect, it } from 'vitest';

import {
  DEMO_INTAKE_INCIDENT_MANIFEST,
  assertIntakeIncidentsKeysUnique,
  intakeCommandKey,
  intakeIncidentsStableKeys,
} from '../../scripts/demo/manifest';
import {
  DEMO_INTAKE_SCENARIOS,
  DEMO_INTAKE_SENSITIVE,
  intakeScenarioContent,
  intakeScenarioKey,
  intakeScenarioReceivedAt,
} from '../../scripts/demo/seed-intake-incidents';

const DEMO_NOW = new Date('2026-09-28T08:00:00.000Z');

// Closed work-item keys that must never be reused (demo-seed-complete plus
// the pre-restart direct-write helper ids).
const LEGACY_KEYS = new Set([
  'demo-incident-01',
  'demo-observation-01',
  'DEMO-PARTY-001',
  'DEMO-PARCEL-001',
  'demo-seed-restart-incident-01',
  'demo-seed-restart-observation-01',
]);

describe('intake/incidents demo manifest', () => {
  it('keeps every stable key synthetic, unique and distinct from legacy fixtures', () => {
    const keys = intakeIncidentsStableKeys();
    expect(keys).toHaveLength(6);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key.startsWith('demo-seed-restart-intake-')).toBe(true);
      expect(LEGACY_KEYS.has(key)).toBe(false);
    }
    expect(() => assertIntakeIncidentsKeysUnique()).not.toThrow();
    expect(() =>
      assertIntakeIncidentsKeysUnique([...keys, keys[0] as string]),
    ).toThrow('DEMO_INTAKE_MANIFEST_DUPLICATE_KEY');
  });

  it('derives stable confirm/convert idempotency keys per intake', () => {
    const processed = DEMO_INTAKE_INCIDENT_MANIFEST.processedKey;
    expect(intakeCommandKey(processed, 'confirm')).toBe(`${processed}:confirm`);
    expect(intakeCommandKey(processed, 'convert')).toBe(`${processed}:convert`);
    expect(intakeCommandKey(processed, 'confirm')).not.toBe(
      intakeCommandKey(processed, 'convert'),
    );
  });

  it('covers four scenarios with distinct statuses and one linked processed intake', () => {
    expect(DEMO_INTAKE_SCENARIOS).toHaveLength(4);
    const statuses = DEMO_INTAKE_SCENARIOS.map((entry) => entry.wantStatus);
    expect(new Set(statuses).size).toBe(4);
    expect(statuses).toContain('PROCESSED');
    const linked = DEMO_INTAKE_SCENARIOS.filter((entry) => entry.linked);
    expect(linked).toHaveLength(1);
    expect(linked[0]?.wantStatus).toBe('PROCESSED');
    for (const entry of DEMO_INTAKE_SCENARIOS) {
      expect(intakeScenarioKey(entry.name)).toContain(
        'demo-seed-restart-intake-',
      );
    }
  });

  it('derives deterministic receivedAt timestamps from DEMO_NOW', () => {
    const first = DEMO_INTAKE_SCENARIOS.map((entry) =>
      intakeScenarioReceivedAt(entry.name, DEMO_NOW),
    );
    const second = DEMO_INTAKE_SCENARIOS.map((entry) =>
      intakeScenarioReceivedAt(
        entry.name,
        new Date('2026-09-28T08:00:00.000Z'),
      ),
    );
    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(4);
    for (const value of first) {
      const parsed = new Date(value);
      expect(Number.isNaN(parsed.getTime())).toBe(false);
      expect(parsed.getTime()).toBeLessThanOrEqual(DEMO_NOW.getTime());
    }
  });

  it('marks every synthetic value so no real PII can slip in', () => {
    for (const entry of DEMO_INTAKE_SCENARIOS) {
      expect(intakeScenarioContent(entry.name)).toContain('[DEMO-RESTART]');
    }
    for (const sensitive of Object.values(DEMO_INTAKE_SENSITIVE)) {
      for (const value of Object.values(sensitive)) {
        expect(value).toContain('[DEMO-RESTART]');
      }
    }
  });
});
