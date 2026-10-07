import { describe, expect, it } from 'vitest';

import { ROLE_CATALOG } from '@/modules/identity';
import { RESIDENT_SUBJECT_TYPES } from '@/modules/residents/contracts';
import {
  DEMO_RESIDENT_PERSONAS,
  DEMO_RESIDENT_SUBJECTS,
  NEGATIVE_PERSONA_EMAIL,
  assertIdentityResidentsKeysUnique,
  identityResidentsStableKeys,
  residentReportIdempotencyKey,
  residentReportPeriods,
} from '../../scripts/demo/seed-identity-residents';

const DEMO_NOW = new Date('2026-09-28T08:00:00.000Z');

// Closed work-item keys that must never be reused (demo-seed-complete plus
// the pre-restart direct-write helper ids).
const LEGACY_KEYS = new Set([
  'demo-incident-01',
  'demo-observation-01',
  'DEMO-PARTY-001',
  'DEMO-PARCEL-001',
  'seed-subject-tam-tru',
  'seed-subject-nuoc-ngoai',
  'seed-subject-tai-hoa-nhap',
]);

describe('identity/residents demo manifest', () => {
  it('covers exactly the three resident subject types', () => {
    expect(
      DEMO_RESIDENT_SUBJECTS.map((entry) => entry.subjectType).sort(),
    ).toEqual([...RESIDENT_SUBJECT_TYPES].sort());
    for (const entry of DEMO_RESIDENT_SUBJECTS) {
      expect(entry.purpose).toBe(entry.subjectType);
    }
  });

  it('keeps every stable key synthetic and distinct from legacy fixtures', () => {
    const keys = identityResidentsStableKeys(DEMO_NOW);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(LEGACY_KEYS.has(key)).toBe(false);
    }
    expect(() => assertIdentityResidentsKeysUnique(DEMO_NOW)).not.toThrow();
    expect(() =>
      assertIdentityResidentsKeysUnique(new Date(DEMO_NOW.getTime())),
    ).not.toThrow();
  });

  it('derives three deterministic report periods ending at DEMO_NOW', () => {
    expect(residentReportPeriods(DEMO_NOW)).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(residentReportPeriods(DEMO_NOW)).toEqual(
      residentReportPeriods(new Date('2026-09-28T08:00:00.000Z')),
    );
    expect(residentReportPeriods(new Date('2026-01-15T00:00:00.000Z'))).toEqual(
      ['2025-11', '2025-12', '2026-01'],
    );
    for (const period of residentReportPeriods(DEMO_NOW)) {
      expect(residentReportIdempotencyKey(period)).toBe(
        `demo-seed-restart-resident-report-${period}`,
      );
    }
  });

  it('adds land personas without sessions, passwords, or capability changes', () => {
    expect(DEMO_RESIDENT_PERSONAS.landOfficer.role).toBe('land_officer');
    expect(DEMO_RESIDENT_PERSONAS.communeLeader.role).toBe('commune_leader');
    for (const persona of Object.values(DEMO_RESIDENT_PERSONAS)) {
      expect(ROLE_CATALOG).toContain(persona.role);
      expect(persona.email).toContain('civicos.local');
      expect(persona).not.toHaveProperty('password');
      expect(persona).not.toHaveProperty('session');
    }
    expect(DEMO_RESIDENT_PERSONAS.landOfficer.email).not.toBe(
      DEMO_RESIDENT_PERSONAS.communeLeader.email,
    );
    expect(NEGATIVE_PERSONA_EMAIL).toBe('khongduocphancong@civicos.local');
  });

  it('marks every synthetic value so no real PII can slip in', () => {
    for (const entry of DEMO_RESIDENT_SUBJECTS) {
      expect(entry.displayName).toContain('[DEMO-RESTART]');
      expect(entry.sensitiveProfile).toContain('[DEMO-RESTART]');
      expect(entry.activityContent).toContain('[DEMO-RESTART]');
    }
    for (const persona of Object.values(DEMO_RESIDENT_PERSONAS)) {
      expect(persona.name).toContain('[DEMO-RESTART]');
    }
  });
});
