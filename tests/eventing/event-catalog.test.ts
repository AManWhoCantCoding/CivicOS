import { describe, expect, it } from 'vitest';

import {
  EVENT_CATALOG,
  getEventConsumers,
  registerEventHistoryProjection,
} from '@/modules/eventing';
import { registerIncidentProjections } from '@/modules/incidents/projection';
import { registerInspectionProjections } from '@/modules/inspections/projection';
import { registerNotificationConsumers } from '@/modules/platform/notifications';
import { registerVehicleProjections } from '@/modules/vehicles/projection';
import { incidentEventTypes } from '@/modules/incidents/projection';
import { inspectionEventTypes } from '@/modules/inspections/projection';
import { vehicleEventTypes } from '@/modules/vehicles/projection';
import { INCIDENT_DOMAIN_EVENTS } from '@/modules/incidents/domain';
import { INSPECTION_DOMAIN_EVENTS } from '@/modules/inspections/domain';
import { VEHICLE_DOMAIN_EVENTS } from '@/modules/vehicles/domain';

registerIncidentProjections();
registerInspectionProjections();
registerVehicleProjections();
registerEventHistoryProjection();
registerNotificationConsumers();

describe('event catalog', () => {
  it('lists unique event types with version owner and consumers', () => {
    const types = EVENT_CATALOG.map((entry) => entry.eventType);
    expect(new Set(types).size).toBe(types.length);
    for (const entry of EVENT_CATALOG) {
      expect(entry.eventVersion).toBe(1);
      expect(entry.aggregateType.length).toBeGreaterThan(0);
      expect(entry.owningModule.length).toBeGreaterThan(0);
      expect(entry.consumers.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('covers every projected incident inspection and vehicle event type', () => {
    const types = new Set(EVENT_CATALOG.map((entry) => entry.eventType));
    for (const required of [
      'IntakeReportReceived',
      'IncidentRegistered',
      'IncidentClassified',
      'IncidentAssigned',
      'IncidentVerifying',
      'IncidentTransferRequested',
      'IncidentTransferred',
      'IncidentResolutionRequested',
      'IncidentResolved',
      'IncidentClosureRequested',
      'IncidentClosed',
      'IncidentApprovalRejected',
      'EstablishmentRegistered',
      'EstablishmentUpdated',
      'InspectionScheduled',
      'InspectionStarted',
      'InspectionChecklistSaved',
      'InspectionFindingRecorded',
      'InspectionCompleted',
      'EnforcementRecommendationSubmitted',
      'EnforcementApproved',
      'EnforcementRejected',
      'EnforcementTransferred',
      'SuspiciousVehicleRegistered',
      'SuspiciousVehicleRegistryUpdated',
      'VehicleObservationRecorded',
      'VehicleObservationEvidenceAttached',
      'SuspiciousVehicleMatched',
      'SuspiciousVehicleMatchConfirmed',
      'VehicleVerificationRecorded',
      'VehicleEscalated',
    ]) {
      expect(types.has(required)).toBe(true);
    }
  });

  it('registers replay consumers matching the catalog', () => {
    for (const entry of EVENT_CATALOG) {
      const registered = getEventConsumers(entry.eventType).map(
        (consumer) => consumer.name,
      );
      for (const consumer of entry.consumers) {
        expect(registered).toContain(consumer);
      }
    }
  });

  it('stays in sync with projection and ownership definitions', () => {
    const catalogByType = new Map(
      EVENT_CATALOG.map((entry) => [entry.eventType, entry]),
    );
    for (const eventType of [
      ...incidentEventTypes,
      ...inspectionEventTypes,
      ...vehicleEventTypes,
    ]) {
      expect(catalogByType.has(eventType)).toBe(true);
    }
    for (const eventType of [
      ...Object.keys(INCIDENT_DOMAIN_EVENTS),
      ...Object.keys(INSPECTION_DOMAIN_EVENTS),
      ...Object.keys(VEHICLE_DOMAIN_EVENTS),
    ]) {
      const entry = catalogByType.get(eventType);
      expect(entry).toBeDefined();
      expect(entry?.eventVersion).toBe(1);
    }
    expect(incidentEventTypes.length).toBe(11);
    expect(inspectionEventTypes.length).toBe(11);
    expect(vehicleEventTypes.length).toBe(8);
  });
});
