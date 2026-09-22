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
  VEHICLE_REGISTRY_STATUSES,
  assertRegistryStatus,
  canVerifyVehicle,
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
  attachVehicleObservationEvidence,
  createVehicleObservationEvidence,
  createRegistryEntry,
  escalateVehicleObservation,
  recordVehicleObservation,
  updateRegistryEntry,
  verifyVehicleObservation,
} from './commands';
export {
  getObservation,
  listObservations,
  listRegistry,
  rebuildVehicleProjection,
  registerVehicleProjections,
} from './projection';
