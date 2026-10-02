import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LAND_PARCEL_MAP_API,
  focusApiUrl,
  mapFocusStatus,
} from '@/components/map/land-parcel-focus';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function mobileSource(relativePath: string): string {
  return readSource(`mobile/src/${relativePath}`);
}

// T-007 AC-3: web and mobile share one P0 contract; neither surface keeps a
// private polygon shape, offline cache or audit payload.
describe('T-007 cross-surface shared P0 contract', () => {
  it('uses the same parcelId-only route on web and mobile', () => {
    expect(LAND_PARCEL_MAP_API).toBe('/api/map/land-parcels');
    expect(focusApiUrl('parcel-001')).toBe('/api/map/land-parcels/parcel-001');

    const landMap = mobileSource('api/land-map.ts');
    expect(landMap).toContain("'/api/map/land-parcels'");
    expect(landMap).toContain('encodeURIComponent(parcelId)');
    // parcelId is focus context only, never an authorization grant.
    // Credentials ride along via the shared requestJson seam in client.ts.
    expect(landMap).toContain('requestJson');
    expect(landMap).not.toMatch(/policyOverride|token/i);

    const navigator = mobileSource('navigation/AppNavigator.tsx');
    expect(navigator).toContain('setLandParcelId(parcelId)');
    expect(navigator).toContain('focusParcelId={landParcelId}');
    const deepLinks = mobileSource('navigation/deepLinks.ts');
    expect(deepLinks).not.toMatch(/parcel/i);
  });

  it('keeps the same allowlist on both surfaces with no mobile-only DTO', () => {
    const landMap = mobileSource('api/land-map.ts');
    for (const key of [
      'parcelCode',
      'mapSheetNumber',
      'parcelNumber',
      'status',
      'geometry',
      'updatedAt',
      'simulated',
      'projection',
    ]) {
      expect(landMap).toContain(key);
    }
    for (const forbidden of [
      'organizationId',
      'landUseType',
      'nationalRecordRef',
      'Evidence',
      'OfflineCommand',
      'ProjectionRecord',
    ]) {
      expect(landMap).not.toContain(forbidden);
    }
    expect(landMap).not.toMatch(/[aA]ddress/);
    expect(landMap).not.toMatch(/party/i);
    expect(landMap).not.toMatch(/rights/i);

    const mapScreen = mobileSource('features/map/MapScreen.tsx');
    expect(mapScreen).toContain('land-parcel-focus-source');
    expect(mapScreen).toContain("landState === 'ready'");
    expect(mapScreen).not.toContain('organizationId');
  });

  it('agrees on provider/layer error states across surfaces', () => {
    expect(mapFocusStatus(503, 'MAP_PROVIDER_UNAVAILABLE')).toBe('provider');
    expect(mapFocusStatus(503, 'MAP_LAYER_FAILED')).toBe('geometry');

    const landMap = mobileSource('api/land-map.ts');
    expect(landMap).toContain(
      "code === 'MAP_PROVIDER_UNAVAILABLE' ? 'provider' : 'geometry'",
    );
    expect(landMap).toContain("'MAP_LAYER_FAILED'");
    expect(landMap).toContain("'LAND_GEOMETRY_INVALID'");
  });
});

describe('T-007 cross-surface no-store, offline and audit boundary', () => {
  it('never stores the land polygon offline on either surface', () => {
    const landMap = mobileSource('api/land-map.ts');
    for (const forbidden of [
      'AsyncStorage',
      'localStorage',
      'OfflineManager',
      'createPack',
      'submitOffline',
      'persist',
    ]) {
      expect(landMap).not.toContain(forbidden);
    }

    const mapScreen = mobileSource('features/map/MapScreen.tsx');
    const guardAt = mapScreen.indexOf('isLandParcelFocusOffline()');
    const requestAt = mapScreen.indexOf(
      'getLandParcelMapProjection(focusParcelId)',
    );
    expect(guardAt).toBeGreaterThan(-1);
    expect(requestAt).toBeGreaterThan(guardAt);
    expect(mapScreen).toContain('setLandParcel(null)');
    expect(mapScreen).toContain(
      'Polygon thửa đất không được lưu trong bộ nhớ offline.',
    );

    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain("cache: 'no-store'");
    expect(workspace).toContain(
      'Polygon thửa đất không được lưu trong bộ nhớ offline.',
    );
  });

  it('audits map reads minimally on the server and never from the client', () => {
    const route = readSource(
      'src/app/api/map/land-parcels/[parcelId]/route.ts',
    );
    expect(route).toContain('land.parcel.map.viewed');
    expect(route).toContain('metadata: { outcome:');
    expect(route).toContain("'Cache-Control': 'no-store'");
    expect(route).not.toMatch(/coordinates|party|address|token/i);

    const landMap = mobileSource('api/land-map.ts');
    expect(landMap).not.toContain('audit');
    expect(landMap).not.toContain('recordAudit');
    const mapScreen = mobileSource('features/map/MapScreen.tsx');
    expect(mapScreen).not.toMatch(/recordAudit|auditLandEvent/i);
  });

  it('keeps land polygon out of generic and public surfaces', () => {
    const genericMap = mobileSource('api/map.ts');
    expect(genericMap).not.toContain('land-parcel');
    expect(genericMap).not.toContain('parcel');

    const publicLookup = readSource('src/components/land/PublicLandLookup.tsx');
    expect(publicLookup).not.toMatch(/\bpolygon\b/i);
    const landScreen = mobileSource('features/land/LandScreen.tsx');
    expect(landScreen).toContain('getPublicLandLookup');
    expect(landScreen).not.toMatch(/getLandParcelMapProjection/);
  });
});
