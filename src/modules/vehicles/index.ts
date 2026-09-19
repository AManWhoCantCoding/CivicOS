export type { VehicleActor, VehicleObservationInput } from './contracts';
export { normalizePlate } from './contracts';
export { canVerifyVehicle, isRegistryActive } from './domain';
export { getMockCameraObservations } from './mock-camera-adapter';
export {
  confirmVehicleMatch,
  createRegistryEntry,
  escalateVehicleObservation,
  recordVehicleObservation,
  updateRegistryEntry,
  verifyVehicleObservation,
} from './commands';
export { getObservation, listObservations, listRegistry } from './projection';
