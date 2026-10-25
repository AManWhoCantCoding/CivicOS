export type {
  VehicleActor,
  VehicleObservationInput,
  VehicleVerificationInput,
  ConfirmVehicleMatchInput,
} from './contracts';
export {
  assertPlateFormat,
  normalizeOwnerLookup,
  normalizePlate,
} from './contracts';
export {
  VEHICLE_ESCALATION_SLA,
  shouldStartVehicleEscalationSla,
  VEHICLE_PARKING_WATCH_SLA,
  vehicleParkingWatchDueAt,
  canStartVehicleParkingWatch,
  VEHICLE_REGISTRY_STATUSES,
  assertRegistryStatus,
  canVerifyVehicle,
  isVehicleTaskCompatible,
  VEHICLE_TASK_COMPATIBILITY,
  isMatchSuggestion,
  assertVehicleMatchConfirmation,
  isRegistryActive,
  vehicleEscalationDueAt,
  VEHICLE_DOMAIN_EVENTS,
  type VehicleDomainEventOwnership,
} from './domain';
export {
  createMockCameraAdapter,
  getMockCameraObservations,
  isMockCameraAvailable,
  MOCK_CAMERA_FIXTURES,
} from './mock-camera-adapter';
export {
  confirmVehicleMatch,
  confirmVehicleParkingWatch,
  attachVehicleObservationEvidence,
  createVehicleObservationEvidence,
  assertVehicleObservationAccess,
  createRegistryEntry,
  escalateVehicleObservation,
  recordVehicleObservation,
  updateRegistryEntry,
  verifyVehicleObservation,
} from './commands';
export {
  getObservation,
  getVehicleStatistics,
  listObservations,
  listRegistry,
  rebuildVehicleProjection,
  registerVehicleProjections,
} from './projection';
export { aggregateVehicleStatistics } from './statistics';
export type {
  VehicleStatistics,
  VehicleStatisticsObservation,
} from './statistics';
