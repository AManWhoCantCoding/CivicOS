import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { FEATURES } from '@/components/navigation/feature-registry';
import {
  DEMO_ACTIONS,
  DEMO_MANIFEST_VERSION,
  validateDemoManifest,
} from '@/modules/demo/manifest';
import { isDemoPersonaAlias } from '@/modules/demo/persona-broker';
import {
  BLOCKED_WEB_SCENARIOS,
  WEB_SCENARIO_CATALOG,
  WEB_SCENARIO_CATALOG_VERSION,
  resolveWebScenario,
} from '@/modules/demo/scenarios/web-catalog';

const READ_SAFE_ACTIONS: readonly string[] = [
  'navigate',
  'click',
  'wait-ready',
  'assert-state',
];

// UAD-03 narrator policy: human-facing manifest text is Vietnamese.
const VIETNAMESE_TEXT =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const LIVE_MUTATION_ACTIONS: readonly string[] = [
  'submit',
  'fill',
  'open-select',
  'choose-option',
  'check',
  'native-tap',
];

const UNSAFE_TEXT = [
  /password/i,
  /passwd/i,
  /secret/i,
  /credential/i,
  /postgresql:\/\//i,
  /<script/i,
  /javascript:/i,
  /@civicos\.local/i,
];

function catalogText(entry: (typeof WEB_SCENARIO_CATALOG)[number]): string {
  return [
    entry.id,
    entry.personaAlias,
    entry.entryRoute,
    entry.featureId,
    entry.heading,
    entry.manifest.precondition,
    entry.manifest.explanation,
    entry.manifest.cleanupPolicy,
    entry.manifest.blockedPolicy,
    ...entry.manifest.steps.flatMap((step) => [step.id, step.detail ?? '']),
    ...entry.evidence.sources,
    ...entry.evidence.tests,
    ...entry.evidence.docs,
  ].join('\n');
}

describe('T-006 AC-1/AC-4 web scenario catalog trace', () => {
  it('uses unique ids and the current manifest version', () => {
    const ids = WEB_SCENARIO_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(WEB_SCENARIO_CATALOG_VERSION).toBe(DEMO_MANIFEST_VERSION);
    for (const entry of WEB_SCENARIO_CATALOG) {
      expect(entry.manifest.version).toBe(DEMO_MANIFEST_VERSION);
    }
  });

  it('validates every catalog manifest and keeps every scene on web', () => {
    expect(WEB_SCENARIO_CATALOG.length).toBeGreaterThan(0);
    for (const entry of WEB_SCENARIO_CATALOG) {
      expect(validateDemoManifest(entry.manifest)).toEqual({ ok: true });
      expect(entry.manifest.surface).toBe('web');
      expect(entry.manifest.scenarioId).toBe(entry.id);
      expect(isDemoPersonaAlias(entry.manifest.personaAlias)).toBe(true);
    }
  });

  it('uses only read-safe allowlisted actions and no live mutation', () => {
    for (const entry of WEB_SCENARIO_CATALOG) {
      expect(entry.manifest.mutationClass).toBe('none');
      for (const step of entry.manifest.steps) {
        expect(DEMO_ACTIONS as readonly string[]).toContain(step.action);
        expect(READ_SAFE_ACTIONS).toContain(step.action);
        expect(LIVE_MUTATION_ACTIONS).not.toContain(step.action);
      }
    }
  });

  it('keeps narrator-facing manifest text in Vietnamese', () => {
    for (const entry of WEB_SCENARIO_CATALOG) {
      for (const field of [
        entry.manifest.precondition,
        entry.manifest.explanation,
        entry.manifest.cleanupPolicy,
        entry.manifest.blockedPolicy,
      ]) {
        expect(VIETNAMESE_TEXT.test(field)).toBe(true);
      }
    }
  });

  it('covers all seven domain clusters with source evidence', () => {
    const domains = new Set(WEB_SCENARIO_CATALOG.map((entry) => entry.domain));
    for (const domain of [
      'incident',
      'inspection',
      'vehicle',
      'resident',
      'map',
      'identity',
      'land',
    ]) {
      expect(domains.has(domain as never)).toBe(true);
    }
    for (const entry of WEB_SCENARIO_CATALOG) {
      expect(entry.evidence.sources.length).toBeGreaterThan(0);
      expect(entry.evidence.tests.length).toBeGreaterThan(0);
      expect(entry.evidence.docs.length).toBeGreaterThan(0);
    }
  });

  it('traces every evidence path to a file on disk', () => {
    for (const entry of WEB_SCENARIO_CATALOG) {
      for (const path of [
        ...entry.evidence.sources,
        ...entry.evidence.tests,
        ...entry.evidence.docs,
      ]) {
        expect(existsSync(path)).toBe(true);
      }
    }
  });

  it('agrees with the existing feature registry routes', () => {
    for (const entry of WEB_SCENARIO_CATALOG) {
      // Public routes have no registry entry; everything else must match
      // an existing feature href path exactly.
      if (entry.featureId === null) {
        expect(entry.entryRoute.startsWith('/public/')).toBe(true);
        continue;
      }
      const feature = FEATURES.find((item) => item.id === entry.featureId);
      expect(feature).toBeDefined();
      const hrefPath = (feature?.href ?? '').split('#')[0];
      expect(hrefPath).toBe(entry.entryRoute);
    }
  });

  it('starts registry scenes with a visible-link navigate; operator-entry scenes without one', () => {
    for (const entry of WEB_SCENARIO_CATALOG) {
      const actions = entry.manifest.steps.map((step) => step.action);
      if (entry.featureId === null) {
        // No nav entry exists, so no synthetic visible-link navigate step.
        expect(actions).not.toContain('navigate');
        expect(actions[0]).toBe('wait-ready');
      } else {
        expect(actions[0]).toBe('navigate');
      }
    }
  });

  it('carries no unsafe text, credentials, or raw payloads', () => {
    for (const entry of WEB_SCENARIO_CATALOG) {
      const text = catalogText(entry);
      for (const pattern of UNSAFE_TEXT) {
        expect(pattern.test(text)).toBe(false);
      }
    }
    for (const blocked of BLOCKED_WEB_SCENARIOS) {
      expect(UNSAFE_TEXT.some((pattern) => pattern.test(blocked.detail))).toBe(
        false,
      );
    }
  });

  it('resolves unknown scenes to unsupported before execution', () => {
    expect(resolveWebScenario('web-scene-that-does-not-exist')).toEqual({
      status: 'unsupported',
      reason: 'UNKNOWN_SCENARIO',
    });
    expect(resolveWebScenario('')).toEqual({
      status: 'unsupported',
      reason: 'UNKNOWN_SCENARIO',
    });
  });

  it('blocks the internal land path without brokered persona evidence', () => {
    expect(BLOCKED_WEB_SCENARIOS.length).toBeGreaterThan(0);
    const land = BLOCKED_WEB_SCENARIOS.find(
      (item) => item.id === 'web-land-internal-parcels',
    );
    expect(land).toBeDefined();
    expect(resolveWebScenario('web-land-internal-parcels')).toEqual({
      status: 'blocked',
      reason: 'NO_BROKERED_LAND_PERSONA',
    });
  });

  it('resolves every catalogued scene to ready without executing it', () => {
    for (const entry of WEB_SCENARIO_CATALOG) {
      expect(resolveWebScenario(entry.id)).toEqual({
        status: 'ready',
        entry,
      });
    }
  });
});
