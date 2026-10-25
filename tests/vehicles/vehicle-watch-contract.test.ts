import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertVehicleMatchConfirmation,
  isMatchSuggestion,
  isRegistryActive,
  normalizePlate,
  VEHICLE_DOMAIN_EVENTS,
  VEHICLE_PARKING_WATCH_SLA,
  vehicleParkingWatchDueAt,
  canStartVehicleParkingWatch,
  shouldStartVehicleEscalationSla,
} from '@/modules/vehicles';
import { EVENT_CATALOG } from '@/modules/eventing';

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

function readParkingWatchUi(): string {
  return readFileSync(
    path.join(
      process.cwd(),
      'src',
      'components',
      'vehicles',
      'VehicleObservationDetail.tsx',
    ),
    'utf8',
  );
}

describe('PS-E1-009 slices 1-3 vehicle watch contract', () => {
  it('uses unique organization fixtures and ID-bounded projection cleanup', () => {
    const postgresTest = readFileSync(
      path.join(
        process.cwd(),
        'tests',
        'vehicles',
        'vehicle-watch-slices-4-7.postgres.test.ts',
      ),
      'utf8',
    );
    expect(postgresTest).toContain('const orgId = `ps009-s47-${stamp}-org`');
    expect(postgresTest).toContain(
      "const stamp = randomUUID().replace(/-/g, '')",
    );
    expect(postgresTest).toContain(
      'return `89${marker}${stamp.slice(0, 12).toUpperCase()}`',
    );
    expect(postgresTest).toContain('auditCleanupScopes');
    expect(postgresTest).toContain('resourceId: { in: registryIds }');
    expect(postgresTest).toContain('resourceId: { in: observationIds }');
    expect(postgresTest).toContain('resourceId: { in: parkingWatchIds }');
    expect(postgresTest).toContain(
      "operation: 'vehicle_observation.statistics_read'",
    );
    expect(postgresTest).toContain('actorId: { in: createdUserIds }');
    expect(postgresTest).toContain('if (auditCleanupScopes.length)');
    const registryRaceStart = postgresTest.indexOf(
      'const raced = await Promise.allSettled([',
    );
    const registryRaceEnd = postgresTest.indexOf(
      "updateRegistryEntry({ entryId, status: 'archived' }, commander)",
      registryRaceStart,
    );
    const registryRace = postgresTest.slice(registryRaceStart, registryRaceEnd);
    const registryTrackIndex = registryRace.indexOf(
      'trackRegistry(outcome.value.id)',
    );
    expect(registryTrackIndex).toBeGreaterThan(-1);
    expect(registryTrackIndex).toBeLessThan(
      registryRace.indexOf("status === 'fulfilled')).toHaveLength"),
    );
    expect(registryTrackIndex).toBeLessThan(
      registryRace.indexOf("status === 'rejected')).toHaveLength"),
    );
    expect(postgresTest).toContain('createdUserIds.push(user.id)');
    expect(postgresTest).toContain('in: createdUserIds');
    expect(postgresTest).not.toMatch(
      /afterAll\(async \(\) => \{[\s\S]*?in: \[commander\.id, fieldOfficer\.id, unassignedOfficer\.id\]/,
    );
    expect(postgresTest).toContain('organizationUnitIds.push(id)');
    expect(postgresTest).toContain(
      'where: { id: { in: organizationUnitIds } }',
    );
    expect(postgresTest).toContain('aggregateId: { in: observationIds }');
    expect(postgresTest).toContain('aggregateId: { in: registryIds }');
    expect(postgresTest).toContain('aggregateId: { in: parkingWatchIds }');
    expect(postgresTest).toContain('const events = eventScopes.length');
    expect(postgresTest).toContain('where: { OR: eventScopes }');
    expect(postgresTest).toContain('actorId: { in: createdUserIds }');
    expect(postgresTest).toContain(
      'select: { eventId: true, aggregateType: true, aggregateId: true }',
    );
    expect(postgresTest).toContain('where: { OR: projectionScopes }');
    expect(postgresTest).toContain(
      'await processOutboxUntilIdle({ eventId: overdueEvent.eventId })',
    );
    expect(postgresTest).toContain(
      'const unrelatedStaleClaims = await prisma.outboxMessage.count',
    );
    expect(postgresTest).toContain("status: 'processing'");
    expect(postgresTest).toContain(
      'claimedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }',
    );
    expect(postgresTest).toContain('eventId: { not: overdueEvent.eventId }');
    expect(postgresTest).toContain(
      'const ownedEventIds = [...new Set([...eventIds, ...slaEventIds])]',
    );
    expect(postgresTest).toContain('!ownedEventIds.includes(eventId)');
    expect(postgresTest).toContain(
      'data: { processedEventIds: remainingEventIds }',
    );
    expect(postgresTest).toContain('getEventConsumers(overdueEvent.eventType)');
    expect(postgresTest).toContain('checkpointSnapshots.push({');
    expect(postgresTest).toContain(
      'expect(withoutOwned).toEqual(snapshot.processedEventIds)',
    );
    expect(postgresTest).toContain('lastRecordedAt: snapshot.lastRecordedAt');
    expect(postgresTest).toContain('updatedAt: snapshot.updatedAt');
    expect(postgresTest).toContain('expect(remaining).toEqual([])');
    expect(postgresTest).toContain("import { rm } from 'node:fs/promises'");
    expect(postgresTest).toContain(
      'await rm(storageRoot, { recursive: true, force: true })',
    );
    expect(postgresTest).not.toMatch(
      /projectionRecord\.deleteMany\([\s\S]*?where:\s*\{\s*OR:\s*\[[\s\S]*?aggregateType:\s*'VehicleObservation'[\s\S]*?aggregateType:\s*'SuspiciousVehicleRegistry'/,
    );
  });

  it('starts the two-hour escalation SLA only for an active registry match', () => {
    expect(shouldStartVehicleEscalationSla({ id: 'registry-entry-1' })).toBe(
      true,
    );
    expect(shouldStartVehicleEscalationSla(null)).toBe(false);
  });

  it('allows parking-watch attestation only before verification or escalation', () => {
    expect(canStartVehicleParkingWatch('recorded')).toBe(true);
    expect(canStartVehicleParkingWatch('match_confirmed')).toBe(true);
    expect(canStartVehicleParkingWatch('match_suggested')).toBe(false);
    expect(canStartVehicleParkingWatch('verified')).toBe(false);
    expect(canStartVehicleParkingWatch('escalated')).toBe(false);
  });

  it('starts a confirmed parking-watch inspection SLA at server confirmation time', () => {
    const confirmedAt = new Date('2026-10-24T02:00:00.000Z');
    expect(VEHICLE_PARKING_WATCH_SLA).toEqual({
      kind: 'vehicle_parking_inspection_4h',
      durationMs: 4 * 60 * 60 * 1000,
    });
    expect(vehicleParkingWatchDueAt(confirmedAt).toISOString()).toBe(
      '2026-10-24T06:00:00.000Z',
    );
    expect(VEHICLE_DOMAIN_EVENTS.VehicleParkingWatchStarted).toEqual({
      aggregateType: 'VehicleParkingWatch',
      eventVersion: 1,
    });
    expect(
      EVENT_CATALOG.filter(
        ({ aggregateType }) => aggregateType === 'VehicleParkingWatch',
      )
        .map(({ eventType }) => eventType)
        .sort(),
    ).toEqual(['VehicleParkingWatchCompleted', 'VehicleParkingWatchStarted']);
    expect(
      vehicleParkingWatchDueAt(confirmedAt).getTime() - confirmedAt.getTime(),
    ).toBe(4 * 60 * 60 * 1000);
  });

  it('stores one watch per observation and requires explicit online attestation', () => {
    const schema = readSchema();
    const ui = readParkingWatchUi();
    expect(schema).toMatch(
      /model VehicleParkingWatch[\s\S]*observationId String\s+@unique/,
    );
    expect(schema).toMatch(
      /VehicleObservation\s+@relation\(fields: \[observationId\]/,
    );
    expect(ui).toContain('đỗ liên tục trên 48 giờ');
    expect(ui).toContain('khai báo/đăng ký.');
    expect(ui).toContain("command: 'confirm_parking_watch'");
    expect(ui).toContain("parkingWatch?: ObservationData['parkingWatch']");
    expect(ui).toContain('!data.parkingWatch');
    expect(ui).toContain(
      'disabled={!online || actionLoading || !parkingWatchAcknowledged}',
    );
  });

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
        'VehicleObservationEvidenceAttached',
        'SuspiciousVehicleMatched',
        'SuspiciousVehicleMatchConfirmed',
        'VehicleVerificationRecorded',
        'VehicleEscalated',
        'VehicleParkingWatchCompleted',
        'VehicleParkingWatchStarted',
        'SuspiciousVehicleRegistered',
        'SuspiciousVehicleRegistryUpdated',
      ].sort(),
    );
    expect(VEHICLE_DOMAIN_EVENTS.VehicleObservationRecorded).toEqual({
      aggregateType: 'VehicleObservation',
      eventVersion: 1,
    });
    expect(VEHICLE_DOMAIN_EVENTS.VehicleObservationEvidenceAttached).toEqual({
      aggregateType: 'VehicleObservation',
      eventVersion: 1,
    });
    expect(VEHICLE_DOMAIN_EVENTS.SuspiciousVehicleMatchConfirmed).toEqual({
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
