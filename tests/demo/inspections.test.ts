import { describe, expect, it } from 'vitest';

import {
  DEMO_FOUNDATION_MANIFEST,
  DEMO_INTAKE_INCIDENT_MANIFEST,
  DEMO_INSPECTION_MANIFEST,
  assertInspectionsKeysUnique,
  foundationStableKeys,
  intakeIncidentsStableKeys,
  inspectionsStableKeys,
} from '../../scripts/demo/manifest';
import {
  DEMO_INSPECTION_RECOMMENDATIONS,
  DEMO_INSPECTION_REJECTION_REASON,
  DEMO_INSPECTION_SCENARIOS,
  inspectionEvidenceBytes,
  inspectionEvidenceCapturedAt,
  inspectionEvidenceFileName,
  inspectionScenarioEstablishmentAddress,
  inspectionScenarioEstablishmentName,
  inspectionScenarioEstablishmentType,
  inspectionScenarioFindings,
  inspectionScenarioKey,
  inspectionScenarioResponses,
  inspectionScenarioScheduledAt,
} from '../../scripts/demo/seed-inspections';

const DEMO_NOW = new Date('2026-09-28T08:00:00.000Z');

describe('inspections demo manifest', () => {
  it('keeps every stable key synthetic, unique and distinct from other manifests', () => {
    const keys = inspectionsStableKeys();
    expect(keys).toEqual([
      DEMO_INSPECTION_MANIFEST.scheduledKey,
      DEMO_INSPECTION_MANIFEST.inProgressKey,
      DEMO_INSPECTION_MANIFEST.completedKey,
    ]);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key.startsWith('demo-seed-restart-inspection-')).toBe(true);
    }
    const otherKeys = new Set([
      ...foundationStableKeys(),
      ...intakeIncidentsStableKeys(),
      DEMO_FOUNDATION_MANIFEST.evidenceNamespace,
      DEMO_INTAKE_INCIDENT_MANIFEST.receivedKey,
    ]);
    for (const key of keys) {
      expect(otherKeys.has(key)).toBe(false);
    }
    expect(() => assertInspectionsKeysUnique()).not.toThrow();
    expect(() =>
      assertInspectionsKeysUnique([...keys, keys[0] as string]),
    ).toThrow('DEMO_INSPECTION_MANIFEST_DUPLICATE_KEY');
  });

  it('covers scheduled, in-progress and completed scenarios', () => {
    expect(DEMO_INSPECTION_SCENARIOS).toHaveLength(3);
    const statuses = DEMO_INSPECTION_SCENARIOS.map((entry) => entry.wantStatus);
    expect(new Set(statuses).size).toBe(3);
    expect(statuses).toEqual(
      expect.arrayContaining(['scheduled', 'in_progress', 'completed']),
    );
    for (const entry of DEMO_INSPECTION_SCENARIOS) {
      expect(inspectionScenarioKey(entry.name)).toContain(
        'demo-seed-restart-inspection-',
      );
    }
    expect(inspectionScenarioKey('in_progress')).toBe(
      DEMO_INSPECTION_MANIFEST.inProgressKey,
    );
  });

  it('derives deterministic establishment tuples with karaoke templates', () => {
    const first = DEMO_INSPECTION_SCENARIOS.map((entry) => ({
      name: inspectionScenarioEstablishmentName(entry.name),
      address: inspectionScenarioEstablishmentAddress(entry.name),
      type: inspectionScenarioEstablishmentType(entry.name),
      scheduledAt: inspectionScenarioScheduledAt(
        entry.name,
        new Date(DEMO_NOW.getTime()),
      ),
    }));
    const second = DEMO_INSPECTION_SCENARIOS.map((entry) => ({
      name: inspectionScenarioEstablishmentName(entry.name),
      address: inspectionScenarioEstablishmentAddress(entry.name),
      type: inspectionScenarioEstablishmentType(entry.name),
      scheduledAt: inspectionScenarioScheduledAt(entry.name, DEMO_NOW),
    }));
    expect(second).toEqual(first);
    expect(new Set(first.map((entry) => entry.name)).size).toBe(3);
    expect(new Set(first.map((entry) => entry.scheduledAt)).size).toBe(3);
    for (const entry of first) {
      expect(entry.name).toContain('[DEMO-RESTART]');
      expect(entry.address).toContain('[DEMO-RESTART]');
      expect(entry.type.toLowerCase()).toContain('karaoke');
      expect(Number.isNaN(new Date(entry.scheduledAt).getTime())).toBe(false);
    }
    expect(
      new Date(inspectionScenarioScheduledAt('scheduled', DEMO_NOW)).getTime(),
    ).toBeGreaterThan(DEMO_NOW.getTime());
    expect(
      new Date(inspectionScenarioScheduledAt('completed', DEMO_NOW)).getTime(),
    ).toBeLessThan(DEMO_NOW.getTime());
  });

  it('keeps checklist responses and findings inside the required/evidence invariant', () => {
    const responses = inspectionScenarioResponses();
    expect(responses.map((entry) => entry.key).sort()).toEqual([
      'license',
      'safety',
      'security',
    ]);
    for (const response of responses) {
      expect(response.value).toContain('[DEMO-RESTART]');
    }
    const inProgress = inspectionScenarioFindings('in_progress');
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0]?.checklistKey).toBe('safety');
    const completed = inspectionScenarioFindings('completed');
    expect(completed.map((entry) => entry.checklistKey).sort()).toEqual([
      'safety',
      'security',
    ]);
    expect(
      completed.find((entry) => entry.checklistKey === 'security')?.result,
    ).toBe('needs_action');
    for (const entry of [...inProgress, ...completed]) {
      expect(entry.description).toContain('[DEMO-RESTART]');
      expect(['pass', 'reminder', 'needs_action']).toContain(entry.result);
    }
  });

  it('marks evidence and recommendation fixtures synthetic and deterministic', () => {
    for (const entry of DEMO_INSPECTION_SCENARIOS) {
      const bytes = new TextDecoder().decode(
        inspectionEvidenceBytes(entry.name),
      );
      expect(bytes).toContain('[DEMO-RESTART]');
      expect(bytes).toContain(entry.name);
      expect(inspectionEvidenceFileName(entry.name)).toContain(
        `demo-restart-inspection-${entry.name}-01.jpg`,
      );
      const capturedAt = inspectionEvidenceCapturedAt(entry.name, DEMO_NOW);
      expect(capturedAt).toBe(
        inspectionEvidenceCapturedAt(
          entry.name,
          new Date('2026-09-28T08:00:00.000Z'),
        ),
      );
      expect(new Date(capturedAt).getTime()).toBeGreaterThan(
        new Date(inspectionScenarioScheduledAt(entry.name, DEMO_NOW)).getTime(),
      );
    }
    expect(
      new Set(
        DEMO_INSPECTION_SCENARIOS.map((entry) =>
          Buffer.from(inspectionEvidenceBytes(entry.name)).toString('base64'),
        ),
      ).size,
    ).toBe(3);
    for (const recommendation of Object.values(
      DEMO_INSPECTION_RECOMMENDATIONS,
    )) {
      expect(recommendation.action).toContain('[DEMO-RESTART]');
      expect(recommendation.reason).toContain('[DEMO-RESTART]');
    }
    expect(DEMO_INSPECTION_REJECTION_REASON).toContain('[DEMO-RESTART]');
  });
});
