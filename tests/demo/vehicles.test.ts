import { describe, expect, it } from 'vitest';

import { isRegistryActive } from '@/modules/vehicles/domain';
import {
  assertPlateFormat,
  normalizePlate,
} from '@/modules/vehicles/contracts';

import {
  DEMO_FOUNDATION_MANIFEST,
  DEMO_INTAKE_INCIDENT_MANIFEST,
  DEMO_INSPECTION_MANIFEST,
  DEMO_VEHICLE_MANIFEST,
  assertVehiclesKeysUnique,
  foundationStableKeys,
  intakeIncidentsStableKeys,
  inspectionsStableKeys,
  vehiclesStableKeys,
} from '../../scripts/demo/manifest';
import {
  DEMO_VEHICLE_ESCALATION_TARGET,
  DEMO_VEHICLE_LOCATION,
  DEMO_VEHICLE_REGISTRY_SOURCE,
  DEMO_VEHICLE_SCENARIOS,
  DEMO_VEHICLE_VERIFICATION,
  vehicleEvidenceBytes,
  vehicleEvidenceCapturedAt,
  vehicleEvidenceFileName,
  vehicleEvidenceHash,
  vehicleRegistryValidFrom,
  vehicleRegistryValidUntil,
  vehicleScenarioDescription,
  vehicleScenarioKey,
  vehicleScenarioObservedAt,
  vehicleScenarioPlate,
  vehicleScenarioReason,
  vehicleScenarioRegistryKey,
} from '../../scripts/demo/seed-vehicles';

const DEMO_NOW = new Date('2026-09-28T08:00:00.000Z');

// Closed work-item keys that must never be reused (demo-seed-complete plus
// the pre-restart direct-write helper ids and the legacy inline seed plate).
const LEGACY_KEYS = new Set([
  'demo-incident-01',
  'demo-observation-01',
  'DEMO-PARTY-001',
  'DEMO-PARCEL-001',
  'demo-seed-restart-incident-01',
  'demo-seed-restart-observation-01',
  '43DEMO01',
]);

describe('vehicles demo manifest', () => {
  it('keeps every stable key synthetic, unique and distinct from legacy fixtures', () => {
    const keys = vehiclesStableKeys();
    expect(keys).toHaveLength(9);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(
        key.startsWith('demo-seed-restart-vehicle-') || /^[0-9A-Z]+$/.test(key),
      ).toBe(true);
      expect(LEGACY_KEYS.has(key)).toBe(false);
    }
    const otherKeys = new Set([
      ...foundationStableKeys(),
      ...intakeIncidentsStableKeys(),
      ...inspectionsStableKeys(),
      DEMO_FOUNDATION_MANIFEST.evidenceNamespace,
      DEMO_FOUNDATION_MANIFEST.observationKey,
      DEMO_INTAKE_INCIDENT_MANIFEST.receivedKey,
      DEMO_INSPECTION_MANIFEST.scheduledKey,
    ]);
    for (const key of keys) {
      expect(otherKeys.has(key)).toBe(false);
    }
    expect(() => assertVehiclesKeysUnique()).not.toThrow();
    expect(() =>
      assertVehiclesKeysUnique([...keys, keys[0] as string]),
    ).toThrow('DEMO_VEHICLE_MANIFEST_DUPLICATE_KEY');
  });

  it('exposes registry, plate and clientCommandId keys for three scenarios', () => {
    expect(DEMO_VEHICLE_SCENARIOS).toHaveLength(3);
    expect(DEMO_VEHICLE_SCENARIOS.map((entry) => entry.wantStatus)).toEqual([
      'recorded',
      'match_suggested',
      'escalated',
    ]);
    const plates = DEMO_VEHICLE_SCENARIOS.map((entry) =>
      vehicleScenarioPlate(entry.name),
    );
    expect(new Set(plates).size).toBe(3);
    for (const plate of plates) {
      expect(() => assertPlateFormat(plate)).not.toThrow();
      expect(normalizePlate(plate)).toBe(plate);
    }
    const commandKeys = DEMO_VEHICLE_SCENARIOS.map((entry) =>
      vehicleScenarioKey(entry.name),
    );
    expect(new Set(commandKeys).size).toBe(3);
    for (const key of commandKeys) {
      expect(key).toContain('demo-seed-restart-vehicle-observation-');
    }
    const registryKeys = ['match_suggested', 'escalated'].map((scenario) =>
      vehicleScenarioRegistryKey(scenario as 'match_suggested'),
    );
    expect(new Set(registryKeys).size).toBe(2);
    for (const key of registryKeys) {
      expect(key).toContain('demo-seed-restart-vehicle-registry-');
    }
    expect(vehicleScenarioKey('escalated')).toBe(
      DEMO_VEHICLE_MANIFEST.escalatedObservationKey,
    );
    expect(vehicleScenarioPlate('recorded')).toBe(
      DEMO_VEHICLE_MANIFEST.recordedPlate,
    );
  });

  it('derives deterministic DEMO_NOW-valid registry windows and observedAt timestamps', () => {
    const first = DEMO_VEHICLE_SCENARIOS.map((entry) => ({
      observedAt: vehicleScenarioObservedAt(entry.name, DEMO_NOW),
      validFrom: vehicleRegistryValidFrom(DEMO_NOW),
      validUntil: vehicleRegistryValidUntil(DEMO_NOW),
    }));
    const second = DEMO_VEHICLE_SCENARIOS.map((entry) => ({
      observedAt: vehicleScenarioObservedAt(
        entry.name,
        new Date('2026-09-28T08:00:00.000Z'),
      ),
      validFrom: vehicleRegistryValidFrom(new Date('2026-09-28T08:00:00.000Z')),
      validUntil: vehicleRegistryValidUntil(
        new Date('2026-09-28T08:00:00.000Z'),
      ),
    }));
    expect(second).toEqual(first);
    expect(new Set(first.map((entry) => entry.observedAt)).size).toBe(3);
    for (const entry of first) {
      const observedAt = new Date(entry.observedAt);
      expect(Number.isNaN(observedAt.getTime())).toBe(false);
      expect(observedAt.getTime()).toBeLessThanOrEqual(DEMO_NOW.getTime());
      expect(new Date(entry.validFrom).getTime()).toBeLessThan(
        observedAt.getTime(),
      );
      expect(new Date(entry.validUntil).getTime()).toBeGreaterThan(
        observedAt.getTime(),
      );
      expect(new Date(entry.validUntil).getTime()).toBeGreaterThan(
        DEMO_NOW.getTime(),
      );
    }
  });

  it('covers active/expired registry windows without touching the database', () => {
    const observedAt = new Date(
      vehicleScenarioObservedAt('escalated', DEMO_NOW),
    );
    const active = {
      status: 'active',
      validFrom: new Date(vehicleRegistryValidFrom(DEMO_NOW)),
      validUntil: new Date(vehicleRegistryValidUntil(DEMO_NOW)),
    };
    expect(isRegistryActive(active, observedAt)).toBe(true);
    expect(isRegistryActive({ ...active, status: 'expired' }, observedAt)).toBe(
      false,
    );
    expect(isRegistryActive({ ...active, status: 'revoked' }, observedAt)).toBe(
      false,
    );
    expect(
      isRegistryActive(
        { ...active, validUntil: new Date(observedAt.getTime() - 1000) },
        observedAt,
      ),
    ).toBe(false);
    expect(
      isRegistryActive(
        { ...active, validFrom: new Date(observedAt.getTime() + 1000) },
        observedAt,
      ),
    ).toBe(false);
    expect(isRegistryActive({ ...active, validUntil: null }, observedAt)).toBe(
      true,
    );
  });

  it('marks every synthetic label and byte so no real PII can slip in', () => {
    expect(DEMO_VEHICLE_REGISTRY_SOURCE).toContain('[DEMO-RESTART]');
    for (const entry of DEMO_VEHICLE_SCENARIOS) {
      expect(vehicleScenarioDescription(entry.name)).toContain(
        '[DEMO-RESTART]',
      );
      expect(vehicleScenarioReason(entry.name)).toContain('[DEMO-RESTART]');
    }
    const bytes = new TextDecoder().decode(vehicleEvidenceBytes());
    expect(bytes).toContain('[DEMO-RESTART]');
    expect(vehicleEvidenceBytes()).toEqual(vehicleEvidenceBytes());
    expect(vehicleEvidenceFileName()).toBe(
      'demo-restart-vehicle-escalated-01.jpg',
    );
    expect(vehicleEvidenceHash()).toMatch(/^[0-9a-f]{64}$/);
    expect(vehicleEvidenceHash()).toBe(vehicleEvidenceHash());
    const capturedAt = vehicleEvidenceCapturedAt(DEMO_NOW);
    expect(capturedAt).toBe(
      vehicleEvidenceCapturedAt(new Date('2026-09-28T08:00:00.000Z')),
    );
    expect(new Date(capturedAt).getTime()).toBeGreaterThan(
      new Date(vehicleScenarioObservedAt('escalated', DEMO_NOW)).getTime(),
    );
    for (const value of Object.values(DEMO_VEHICLE_VERIFICATION)) {
      expect(value).toContain('[DEMO-RESTART]');
    }
    expect(DEMO_VEHICLE_LOCATION.latitude).toBe(20.98);
    expect(DEMO_VEHICLE_LOCATION.longitude).toBe(106.05);
  });

  it('targets only the existing valid ancestor scope for escalation', () => {
    expect(DEMO_VEHICLE_ESCALATION_TARGET).toBe('unit-cap-tren');
  });
});
