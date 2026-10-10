import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const PROTOTYPE_ENTRY =
  '.scratch/civicos-unified-web-workspace/ui/prototype/index.html';

const PROTOTYPE_ASSETS = [
  'assets/domain-identity.html',
  'assets/domain-residents-intake-incident.html',
  'assets/domain-inspection-vehicles-field.html',
  'assets/domain-land-map-public-offline.html',
] as const;

// The 13 prototype-only domain-surface fixtures documented in prototype.md.
// They are direct-route contexts, not production routes.
const DOMAIN_SURFACE_HASHES = [
  'surface-users',
  'surface-assignments',
  'surface-incidents',
  'surface-intake',
  'surface-residents',
  'surface-inspections',
  'surface-vehicles',
  'surface-field',
  'surface-map',
  'surface-map-focus',
  'surface-parcel',
  'surface-land-application',
  'surface-public-lookup',
] as const;

describe('T-008 final cross-surface verification', () => {
  it('keeps local HTML detail assets as the primary renderer', () => {
    const entry = readSource(PROTOTYPE_ENTRY);
    // All four verified provider HTML assets exist and are referenced.
    expect(PROTOTYPE_ASSETS).toHaveLength(4);
    for (const asset of PROTOTYPE_ASSETS) {
      expect(entry).toContain(asset);
      expect(
        existsSync(
          join(
            process.cwd(),
            '.scratch/civicos-unified-web-workspace/ui/prototype',
            asset,
          ),
        ),
      ).toBe(true);
    }
    // Screenshots stay metadata/provenance only: no screenshot <img> renderer.
    expect(entry).not.toContain('<img');
  });

  it('keeps Stitch provenance and domain-surface fixtures traceable', () => {
    const entry = readSource(PROTOTYPE_ENTRY);
    // Shell + domain-frame provider projects from the approved handoff.
    expect(entry).toContain('11568578814173099695');
    expect(entry).toContain('3369879313583874807');
    expect(entry).toContain('screenshotFile');
    for (const hash of DOMAIN_SURFACE_HASHES) {
      expect(entry).toContain(hash);
    }
  });
});
