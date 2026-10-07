// Canonical demo foundation manifest for demo-seed-restart (T-001).
// Only new stable fixture keys. No counts/manifest from demo-seed-complete.
// Pure module: no Prisma/domain import so preflight runs before mutation.
export const DEMO_FOUNDATION_MANIFEST = {
  incidentKey: 'demo-seed-restart-incident-01',
  observationKey: 'demo-seed-restart-observation-01',
  partyCode: 'DEMO-SEED-RESTART-PARTY-01',
  parcelCode: 'DEMO-SEED-RESTART-PARCEL-01',
  evidenceNamespace: 'civicos-demo',
} as const;

export type DemoFoundationManifest = typeof DEMO_FOUNDATION_MANIFEST;

export function foundationStableKeys(
  manifest: DemoFoundationManifest = DEMO_FOUNDATION_MANIFEST,
): readonly string[] {
  return [
    manifest.incidentKey,
    manifest.observationKey,
    manifest.partyCode,
    manifest.parcelCode,
  ];
}

export function assertFoundationKeysUnique(
  keys: readonly string[] = foundationStableKeys(),
): void {
  if (new Set(keys).size !== keys.length) {
    throw new Error('DEMO_MANIFEST_DUPLICATE_KEY');
  }
}

// Repeat preflight: same input must not produce duplicate keys.
export function preflightFoundationManifest(
  keys: readonly string[] = foundationStableKeys(),
): readonly string[] {
  assertFoundationKeysUnique(keys);
  return keys;
}

// Stable synthetic intake/incident scenario keys for demo-seed-restart (T-003).
// Intake idempotency keys only; database IDs stay owned by domain commands.
export const DEMO_INTAKE_INCIDENT_MANIFEST = {
  receivedKey: 'demo-seed-restart-intake-received-01',
  rejectedKey: 'demo-seed-restart-intake-rejected-01',
  processedKey: 'demo-seed-restart-intake-processed-01',
  closedKey: 'demo-seed-restart-intake-closed-01',
} as const;

export type DemoIntakeIncidentManifest = typeof DEMO_INTAKE_INCIDENT_MANIFEST;

export function intakeCommandKey(
  intakeKey: string,
  command: 'confirm' | 'convert',
): string {
  return `${intakeKey}:${command}`;
}

export function intakeIncidentsStableKeys(
  manifest: DemoIntakeIncidentManifest = DEMO_INTAKE_INCIDENT_MANIFEST,
): readonly string[] {
  return [
    manifest.receivedKey,
    manifest.rejectedKey,
    manifest.processedKey,
    manifest.closedKey,
    intakeCommandKey(manifest.processedKey, 'confirm'),
    intakeCommandKey(manifest.processedKey, 'convert'),
  ];
}

export function assertIntakeIncidentsKeysUnique(
  keys: readonly string[] = intakeIncidentsStableKeys(),
): void {
  if (new Set(keys).size !== keys.length) {
    throw new Error('DEMO_INTAKE_MANIFEST_DUPLICATE_KEY');
  }
}

// Stable synthetic inspection scenario keys for demo-seed-restart (T-004).
// One scenario slug per establishment/schedule tuple; establishment names,
// addresses, scheduledAt offsets and evidence labels derive from the slug.
// Database IDs stay owned by domain commands.
export const DEMO_INSPECTION_MANIFEST = {
  scheduledKey: 'demo-seed-restart-inspection-scheduled-01',
  inProgressKey: 'demo-seed-restart-inspection-in-progress-01',
  completedKey: 'demo-seed-restart-inspection-completed-01',
} as const;

export type DemoInspectionManifest = typeof DEMO_INSPECTION_MANIFEST;

export function inspectionsStableKeys(
  manifest: DemoInspectionManifest = DEMO_INSPECTION_MANIFEST,
): readonly string[] {
  return [manifest.scheduledKey, manifest.inProgressKey, manifest.completedKey];
}

export function assertInspectionsKeysUnique(
  keys: readonly string[] = inspectionsStableKeys(),
): void {
  if (new Set(keys).size !== keys.length) {
    throw new Error('DEMO_INSPECTION_MANIFEST_DUPLICATE_KEY');
  }
}

// Stable synthetic vehicle scenario keys for demo-seed-restart (T-005).
// Registry scenario keys label the synthetic registry tuples (registry rows
// carry no idempotency column, so plates are the repeat preflight key);
// observation keys are the recordVehicleObservation clientCommandId values.
// Database IDs stay owned by domain commands.
export const DEMO_VEHICLE_MANIFEST = {
  recordedRegistryKey: 'demo-seed-restart-vehicle-registry-recorded-01',
  matchRegistryKey: 'demo-seed-restart-vehicle-registry-match-01',
  escalatedRegistryKey: 'demo-seed-restart-vehicle-registry-escalated-01',
  recordedPlate: '51DEMO01',
  matchPlate: '51DEMO02',
  escalatedPlate: '51DEMO03',
  recordedObservationKey: 'demo-seed-restart-vehicle-observation-recorded-01',
  matchObservationKey: 'demo-seed-restart-vehicle-observation-match-01',
  escalatedObservationKey: 'demo-seed-restart-vehicle-observation-escalated-01',
} as const;

export type DemoVehicleManifest = typeof DEMO_VEHICLE_MANIFEST;

export function vehiclesStableKeys(
  manifest: DemoVehicleManifest = DEMO_VEHICLE_MANIFEST,
): readonly string[] {
  return [...Object.values(manifest)];
}

export function assertVehiclesKeysUnique(
  keys: readonly string[] = vehiclesStableKeys(),
): void {
  if (new Set(keys).size !== keys.length) {
    throw new Error('DEMO_VEHICLE_MANIFEST_DUPLICATE_KEY');
  }
}
