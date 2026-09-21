import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertVehicleMatchConfirmation,
  isMatchSuggestion,
  isRegistryActive,
  normalizePlate,
  VEHICLE_DOMAIN_EVENTS,
} from '@/modules/vehicles';

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
      '20260922080000_ps_e1_009_vehicle_watch_contract',
      'migration.sql',
    ),
    'utf8',
  );
}

function readObservationForm(): string {
  return readFileSync(
    path.join(
      process.cwd(),
      'src',
      'components',
      'vehicles',
      'VehicleObservationForm.tsx',
    ),
    'utf8',
  );
}

describe('PS-E1-009 slices 1-3 vehicle watch contract', () => {
  it('keeps registry active only inside its validity window', () => {
    const at = new Date('2026-09-19T01:00:00.000Z');
    expect(
      isRegistryActive(
        {
          status: 'active',
          validFrom: new Date('2026-09-01'),
          validUntil: new Date('2026-09-30'),
        },
        at,
      ),
    ).toBe(true);
    expect(
      isRegistryActive(
        {
          status: 'active',
          validFrom: new Date('2026-09-01'),
          validUntil: new Date('2026-09-10'),
        },
        at,
      ),
    ).toBe(false);
    expect(
      isRegistryActive(
        {
          status: 'active',
          validFrom: new Date('2026-09-20'),
          validUntil: null,
        },
        at,
      ),
    ).toBe(false);
    expect(
      isRegistryActive(
        {
          status: 'revoked',
          validFrom: new Date('2026-09-01'),
          validUntil: null,
        },
        at,
      ),
    ).toBe(false);
    expect(
      isRegistryActive(
        {
          status: 'active',
          validFrom: new Date('2026-09-01'),
          validUntil: null,
        },
        at,
      ),
    ).toBe(true);
  });

  it('treats a registry match as a suggestion until explicitly confirmed', () => {
    expect(isMatchSuggestion('match_suggested')).toBe(true);
    expect(isMatchSuggestion('match_confirmed')).toBe(false);
    expect(isMatchSuggestion('recorded')).toBe(false);
    expect(normalizePlate(' 89A-123.45 ')).toBe('89A12345');
    expect(() => assertVehicleMatchConfirmation('match_suggested')).toThrow(
      'MATCH_CONFIRMATION_REQUIRED',
    );
    expect(() =>
      assertVehicleMatchConfirmation('match_confirmed'),
    ).not.toThrow();
    expect(() => assertVehicleMatchConfirmation('recorded')).not.toThrow();
  });

  it('owns the four slice events at version 1 on VehicleObservation', () => {
    expect(Object.keys(VEHICLE_DOMAIN_EVENTS).sort()).toEqual(
      [
        'VehicleObservationRecorded',
        'SuspiciousVehicleMatched',
        'VehicleVerificationRecorded',
        'VehicleEscalated',
        'SuspiciousVehicleRegistered',
        'SuspiciousVehicleRegistryUpdated',
      ].sort(),
    );
    expect(VEHICLE_DOMAIN_EVENTS.VehicleObservationRecorded).toEqual({
      aggregateType: 'VehicleObservation',
      eventVersion: 1,
    });
    expect(VEHICLE_DOMAIN_EVENTS.VehicleEscalated).toEqual({
      aggregateType: 'VehicleObservation',
      eventVersion: 1,
    });
    expect(VEHICLE_DOMAIN_EVENTS.SuspiciousVehicleRegistered).toEqual({
      aggregateType: 'SuspiciousVehicleRegistry',
      eventVersion: 1,
    });
    expect(VEHICLE_DOMAIN_EVENTS.SuspiciousVehicleRegistryUpdated).toEqual({
      aggregateType: 'SuspiciousVehicleRegistry',
      eventVersion: 1,
    });
  });

  it('models registry, observation, verification with shared boundaries', () => {
    const schema = readSchema();
    expect(schema).toContain('model SuspiciousVehicleEntry');
    expect(schema).toMatch(/model SuspiciousVehicleEntry[\s\S]*source/);
    expect(schema).toMatch(/model SuspiciousVehicleEntry[\s\S]*validFrom/);
    expect(schema).toMatch(/model SuspiciousVehicleEntry[\s\S]*validUntil/);
    expect(schema).toContain('model VehicleObservation');
    expect(schema).toMatch(/model VehicleObservation[\s\S]*plate/);
    expect(schema).toMatch(/model VehicleObservation[\s\S]*latitude/);
    expect(schema).toMatch(/model VehicleObservation[\s\S]*longitude/);
    expect(schema).toMatch(/model VehicleObservation[\s\S]*evidenceIds/);
    expect(schema).toMatch(/model VehicleObservation[\s\S]*clientCommandId/);
    expect(schema).toMatch(/model VehicleObservation[\s\S]*matchedRegistryId/);
    expect(schema).toContain('model VehicleVerification');
    expect(schema).toContain('model Evidence');
    expect(schema).toContain('model Assignment');
    expect(schema).toContain('model ProjectionRecord');
    expect(schema).toContain('model SlaInstance');
  });

  it('ships an additive PS-E1-009 migration that hardens the contract', () => {
    const migration = readContractMigration();
    expect(migration).toContain('SuspiciousVehicleEntry');
    expect(migration).toContain('VehicleObservation');
    expect(migration).toContain('VehicleVerification');
    expect(migration).toMatch(/match_suggested[\s\S]*match_confirmed/);
    expect(migration).toMatch(/IF NOT EXISTS/i);
    expect(migration).not.toMatch(/DROP TABLE/i);
    expect(migration).not.toMatch(/DELETE FROM/i);
  });

  it('keeps observation completion honest and attaches uploaded Evidence to the observation', () => {
    const form = readObservationForm();
    expect(form).toContain('resourceType="VehicleObservation"');
    expect(form).toContain('resourceId={observationId}');
    expect(form).toContain('EvidenceList');
    expect(form).toMatch(/Chưa hoàn tất: cần tải ảnh bằng chứng/);
    expect(form).toMatch(/chờ đồng bộ/);
  });
});
