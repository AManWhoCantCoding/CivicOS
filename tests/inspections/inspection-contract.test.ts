import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  INSPECTION_DOMAIN_EVENTS,
  isInspectionResult,
} from '@/modules/inspections';
import { assertInspectionTransition } from '@/modules/inspections';

function readSchema(): string {
  return readFileSync(
    path.join(process.cwd(), 'prisma', 'schema.prisma'),
    'utf8',
  );
}

function readContractMigration(): string {
  return readFileSync(
    path.join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260922070000_ps_e1_007_inspection_contract',
      'migration.sql',
    ),
    'utf8',
  );
}

describe('PS-E1-007 slices 1-3 inspection contract', () => {
  it('restricts InspectionResult to pass, reminder, or needs_action', () => {
    expect(isInspectionResult('pass')).toBe(true);
    expect(isInspectionResult('reminder')).toBe(true);
    expect(isInspectionResult('needs_action')).toBe(true);
    expect(isInspectionResult('sanction')).toBe(false);
    expect(isInspectionResult('violation')).toBe(false);
    expect(isInspectionResult('approved')).toBe(false);
  });

  it('keeps the scheduled -> in_progress -> completed lifecycle', () => {
    expect(() =>
      assertInspectionTransition('scheduled', 'in_progress'),
    ).not.toThrow();
    expect(() =>
      assertInspectionTransition('in_progress', 'completed'),
    ).not.toThrow();
    expect(() => assertInspectionTransition('scheduled', 'completed')).toThrow(
      'INVALID_INSPECTION_TRANSITION',
    );
    expect(() => assertInspectionTransition('completed', 'scheduled')).toThrow(
      'INVALID_INSPECTION_TRANSITION',
    );
  });

  it('owns the required domain events at version 1', () => {
    expect(Object.keys(INSPECTION_DOMAIN_EVENTS).sort()).toEqual(
      [
        'EnforcementApproved',
        'EnforcementRejected',
        'EnforcementRecommendationSubmitted',
        'EnforcementTransferred',
        'EstablishmentRegistered',
        'EstablishmentUpdated',
        'InspectionScheduled',
        'InspectionStarted',
        'InspectionChecklistSaved',
        'InspectionCompleted',
        'InspectionFindingRecorded',
      ].sort(),
    );
    expect(INSPECTION_DOMAIN_EVENTS.EstablishmentRegistered).toEqual({
      aggregateType: 'Establishment',
      eventVersion: 1,
    });
    expect(INSPECTION_DOMAIN_EVENTS.EstablishmentUpdated).toEqual({
      aggregateType: 'Establishment',
      eventVersion: 1,
    });
    expect(INSPECTION_DOMAIN_EVENTS.InspectionChecklistSaved).toEqual({
      aggregateType: 'Inspection',
      eventVersion: 1,
    });
    expect(INSPECTION_DOMAIN_EVENTS.InspectionScheduled).toEqual({
      aggregateType: 'Inspection',
      eventVersion: 1,
    });
    expect(INSPECTION_DOMAIN_EVENTS.InspectionStarted).toEqual({
      aggregateType: 'Inspection',
      eventVersion: 1,
    });
    expect(INSPECTION_DOMAIN_EVENTS.InspectionCompleted).toEqual({
      aggregateType: 'Inspection',
      eventVersion: 1,
    });
    expect(INSPECTION_DOMAIN_EVENTS.InspectionFindingRecorded).toEqual({
      aggregateType: 'Inspection',
      eventVersion: 1,
    });
    expect(INSPECTION_DOMAIN_EVENTS.EnforcementRecommendationSubmitted).toEqual(
      {
        aggregateType: 'Inspection',
        eventVersion: 1,
      },
    );
    expect(INSPECTION_DOMAIN_EVENTS.EnforcementApproved).toEqual({
      aggregateType: 'Inspection',
      eventVersion: 1,
    });
    expect(INSPECTION_DOMAIN_EVENTS.EnforcementRejected).toEqual({
      aggregateType: 'Inspection',
      eventVersion: 1,
    });
  });

  it('preserves checklist template version on each Inspection', () => {
    const schema = readSchema();
    expect(schema).toContain('model ChecklistTemplate');
    expect(schema).toContain('@@unique([establishmentType, version])');
    expect(schema).toContain('model Inspection');
    expect(schema).toMatch(
      /model Inspection[\s\S]*templateId[\s\S]*templateVersion/,
    );
  });

  it('models findings and enforcement with shared Evidence and Approval boundaries', () => {
    const schema = readSchema();
    expect(schema).toContain('model InspectionFinding');
    expect(schema).toContain('model EnforcementRecommendation');
    expect(schema).toContain('model Evidence');
    expect(schema).toContain('model Assignment');
    expect(schema).toContain('model Approval');
    expect(schema).toMatch(
      /model InspectionFinding[\s\S]*checklistKey[\s\S]*evidenceIds/,
    );
    expect(schema).toMatch(
      /model EnforcementRecommendation[\s\S]*findingIds[\s\S]*pending_approval/,
    );
  });

  it('ships an additive PS-E1-007 migration that hardens the contract', () => {
    const migration = readContractMigration();
    expect(migration).toContain('templateVersion');
    expect(migration).toMatch(/pass[\s\S]*reminder[\s\S]*needs_action/);
    expect(migration).toContain('InspectionFinding');
    expect(migration).toContain('EnforcementRecommendation');
  });

  it('renders Inspection and Land detail sections without adding mutation or exposing payload/PII fields', () => {
    const detail = readFileSync(
      path.join(
        process.cwd(),
        'src',
        'components',
        'inspections',
        'InspectionDetail.tsx',
      ),
      'utf8',
    );
    expect(detail).toContain('var(--civicos-');
    expect(detail).not.toMatch(
      /slate-(950|900|800|700)|cyan-(300|200)|amber-(400|300|200|100)|emerald-(400|300|200)|rose-(400|300|200|100)/,
    );
    expect(detail).not.toMatch(/gradient|neon|glow/i);
    expect(detail).not.toMatch(/changePayload|storageKey|syncPayload/i);
    expect(detail).toContain('min-h-[44px]');
  });

  it('clearly identifies displayed checklist templates as local/demo, not legal guidance', () => {
    const checklist = readFileSync(
      path.join(
        process.cwd(),
        'src',
        'components',
        'inspections',
        'ChecklistForm.tsx',
      ),
      'utf8',
    );
    expect(checklist).toContain('Mẫu checklist nội bộ/dùng thử');
    expect(checklist).toContain('không phải checklist pháp lý chính thức');
    expect(checklist).toContain('không chứng minh việc tuân thủ pháp luật');
  });
});
