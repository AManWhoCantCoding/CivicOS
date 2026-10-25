/** CivicOS domain event ownership registry. */
export type EventCatalogEntry = {
  eventType: string;
  eventVersion: 1;
  owningModule: 'incidents' | 'inspections' | 'vehicles' | 'platform-sla';
  aggregateType: string;
  consumers: readonly string[];
};

function define(
  eventType: string,
  owningModule: EventCatalogEntry['owningModule'],
  aggregateType: string,
  consumers: readonly string[],
): EventCatalogEntry {
  return {
    eventType,
    eventVersion: 1,
    owningModule,
    aggregateType,
    consumers,
  };
}

const incident = (type: string, aggregate: string) =>
  define(type, 'incidents', aggregate, [
    'incident-read-model',
    'event-history-projection',
  ]);
const establishment = (type: string) =>
  define(type, 'inspections', 'Establishment', [
    'establishment-read-model',
    'event-history-projection',
  ]);
const inspection = (type: string) =>
  define(type, 'inspections', 'Inspection', [
    'inspection-read-model',
    'event-history-projection',
  ]);
const registry = (type: string) =>
  define(type, 'vehicles', 'SuspiciousVehicleRegistry', [
    'vehicle-registry-read-model',
    'event-history-projection',
  ]);
const observation = (type: string) =>
  define(type, 'vehicles', 'VehicleObservation', [
    'vehicle-observation-read-model',
    'event-history-projection',
  ]);
const parkingWatch = (type: string) =>
  define(type, 'vehicles', 'VehicleParkingWatch', ['event-history-projection']);

export const EVENT_CATALOG: readonly EventCatalogEntry[] = [
  define('IntakeReportReceived', 'incidents', 'IntakeReport', [
    'event-history-projection',
  ]),
  define('IntakeReportVerified', 'incidents', 'IntakeReport', [
    'event-history-projection',
  ]),
  define('IntakeReportProcessed', 'incidents', 'IntakeReport', [
    'event-history-projection',
  ]),
  define('IntakeReportRejected', 'incidents', 'IntakeReport', [
    'event-history-projection',
  ]),
  define('IntakeReportClosed', 'incidents', 'IntakeReport', [
    'event-history-projection',
  ]),
  define('IntakeReportConvertedToIncident', 'incidents', 'IntakeReport', [
    'event-history-projection',
  ]),
  define('IntakeReportTransferred', 'incidents', 'IntakeReport', [
    'event-history-projection',
  ]),
  incident('IncidentRegistered', 'Incident'),
  incident('IncidentClassified', 'Incident'),
  incident('IncidentAssigned', 'Incident'),
  incident('IncidentVerifying', 'Incident'),
  incident('IncidentTransferRequested', 'Incident'),
  incident('IncidentTransferred', 'Incident'),
  incident('IncidentResolutionRequested', 'Incident'),
  incident('IncidentResolved', 'Incident'),
  incident('IncidentClosureRequested', 'Incident'),
  incident('IncidentClosed', 'Incident'),
  incident('IncidentApprovalRejected', 'Incident'),
  establishment('EstablishmentRegistered'),
  establishment('EstablishmentUpdated'),
  inspection('InspectionScheduled'),
  inspection('InspectionStarted'),
  inspection('InspectionChecklistSaved'),
  inspection('InspectionFindingRecorded'),
  inspection('InspectionCompleted'),
  inspection('EnforcementRecommendationSubmitted'),
  inspection('EnforcementApproved'),
  inspection('EnforcementRejected'),
  inspection('EnforcementTransferred'),
  registry('SuspiciousVehicleRegistered'),
  registry('SuspiciousVehicleRegistryUpdated'),
  observation('VehicleObservationRecorded'),
  observation('VehicleObservationEvidenceAttached'),
  observation('SuspiciousVehicleMatched'),
  observation('SuspiciousVehicleMatchConfirmed'),
  observation('VehicleVerificationRecorded'),
  observation('VehicleEscalated'),
  parkingWatch('VehicleParkingWatchStarted'),
  parkingWatch('VehicleParkingWatchCompleted'),
  define('SlaStarted', 'platform-sla', 'SlaInstance', [
    'event-history-projection',
  ]),
  define('SlaOverdue', 'platform-sla', 'SlaInstance', [
    'event-history-projection',
    'in-app-sla-overdue',
  ]),
];

export function getEventCatalog(): readonly EventCatalogEntry[] {
  return EVENT_CATALOG;
}
