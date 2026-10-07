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
