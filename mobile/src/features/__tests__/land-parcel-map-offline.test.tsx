import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ApiError } from '../../api/client';
import {
  isLandParcelFocusOffline,
  landParcelMapStateForError,
  readLandParcelMapProjection,
} from '../../api/land-map';

function readSource(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), 'utf8');
}

function mapSource(): string {
  return readSource('../map/MapScreen.tsx');
}

const parcelBody = {
  parcel: {
    id: 'parcel-001',
    parcelCode: 'PARCEL-001',
    mapSheetNumber: '12',
    parcelNumber: '34',
    status: 'active',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [105.98, 20.95],
          [105.982, 20.95],
          [105.982, 20.952],
          [105.98, 20.952],
          [105.98, 20.95],
        ],
      ],
    },
    updatedAt: '2026-10-02T00:00:00.000Z',
  },
  simulated: true,
  projection: 'land-parcel-map',
};

function setOnline(value: boolean): () => void {
  const original = navigator.onLine;
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  });
  return () =>
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: original,
    });
}

// T-006 AC-1: initial offline/open never calls the projection route and never
// renders cached LandParcel geometry.
describe('T-006 AC-1 initial offline no-call', () => {
  it('shows offline state and never renders cached LandParcel geometry', () => {
    const map = mapSource();
    // The offline guard runs before the projection request and clears any
    // previous polygon.
    const guardAt = map.indexOf('isLandParcelFocusOffline()');
    const requestAt = map.indexOf('getLandParcelMapProjection(focusParcelId)');
    expect(guardAt).toBeGreaterThan(-1);
    expect(requestAt).toBeGreaterThan(guardAt);
    expect(map).toContain("setLandState('offline')");
    // The focused source/layers only exist in the ready state.
    expect(map).toContain('land-parcel-focus-source');
    expect(map).toContain("landState === 'ready'");
    expect(map).toContain('features: [landFeature]');
    // Offline panel copy (Đang ngoại tuyến via the shared OfflineBanner).
    expect(map).toContain('<OfflineBanner />');
    expect(map).toContain(
      'Polygon thửa đất không được lưu trong bộ nhớ offline.',
    );
    expect(map).toContain('Thử lại khi có kết nối');
    const states = readSource('../../components/States.tsx');
    expect(states).toContain('Đang ngoại tuyến');
  });

  it('reports offline from navigator state and OFFLINE errors', () => {
    const restoreOffline = setOnline(false);
    try {
      expect(isLandParcelFocusOffline()).toBe(true);
    } finally {
      restoreOffline();
    }
    expect(isLandParcelFocusOffline()).toBe(false);
    expect(landParcelMapStateForError(new ApiError(0, 'OFFLINE', null))).toBe(
      'offline',
    );
  });
});

// T-006 transition: going offline after ready immediately invalidates the
// in-flight request, clears the polygon and moves to the offline state.
describe('T-006 offline transition clears a ready polygon', () => {
  it('invalidates the request and drops geometry on offline', () => {
    const map = mapSource();
    expect(map).toContain("window.addEventListener('offline', handleOffline)");
    expect(map).toContain(
      "window.removeEventListener('offline', handleOffline)",
    );
    const handlerAt = map.indexOf('const handleOffline = () => {');
    expect(handlerAt).toBeGreaterThan(-1);
    const handler = map.slice(handlerAt, handlerAt + 600);
    expect(handler).toContain('landRequestRef.current += 1');
    expect(handler).toContain('setLandParcel(null)');
    expect(handler).toContain("'offline'");
    // Only loading/ready move to offline; settled error states are kept.
    expect(handler).toContain("current === 'loading' || current === 'ready'");
  });

  it('does not silently restore cached polygon when coming online', () => {
    const map = mapSource();
    // No online listener re-fetches; only an explicit retry bumps landReload.
    expect(map).not.toContain("addEventListener('online'");
    const reloadAt = map.indexOf('const reloadLandParcel = useCallback(');
    expect(reloadAt).toBeGreaterThan(-1);
    const reload = map.slice(reloadAt, reloadAt + 600);
    expect(reload).toContain('setLandDismissed(false)');
    expect(reload).toContain('setLandReload');
    // A fresh request always clears the previous polygon first and re-checks
    // the offline guard before calling the route.
    const loadAt = map.indexOf('const loadLandParcel = useCallback(');
    const load = map.slice(loadAt, loadAt + 1200);
    expect(load).toContain('setLandParcel(null)');
    expect(load.indexOf('isLandParcelFocusOffline()')).toBeLessThan(
      load.indexOf('getLandParcelMapProjection(focusParcelId)'),
    );
  });
});

// T-006 AC-2: basemap style/tiles may stay cached, but no LandParcel geometry
// lives in viewCache, pack metadata, local offline state or offline commands.
describe('T-006 AC-2 basemap cache boundary', () => {
  it('allows basemap cache but stores no land polygon', () => {
    const map = mapSource();
    // viewCache keeps only the generic contracts.
    expect(map).toContain('layers: MapLayer[];');
    expect(map).toContain('provider: MapProvider | null;');
    expect(map).toContain('items: RelatedInfoItem[];');
    expect(map).not.toMatch(/viewCache[^;]*landParcel/i);
    expect(map).not.toMatch(/viewCache[^;]*parcel/i);
    // Offline pack metadata is basemap-only.
    expect(map).toContain("purpose: 'mobile-basemap'");
    const packAt = map.indexOf('OfflineManager.createPack(');
    expect(packAt).toBeGreaterThan(-1);
    const pack = map.slice(packAt, packAt + 700);
    expect(pack).toContain('styleUrl: provider.styleUrl');
    expect(pack).not.toMatch(/parcel|geometry|LandParcel/i);
    // No offline command carries land geometry.
    expect(map).not.toMatch(/OfflineCommand|submitOfflineCommand/i);
  });

  it('preserves generic RelatedInfo/Incident/Inspection layers', () => {
    const map = mapSource();
    expect(map).toContain('getMapLayers()');
    expect(map).toContain('getMapProvider()');
    expect(map).toContain('getMapItems()');
    expect(map).toContain('layer.entityTypes.includes(');
  });
});

// T-006 panel: retry target >= 44px plus a local back/dismiss action that hides
// the focused polygon/panel without mutating server data.
describe('T-006 offline retry and back/dismiss', () => {
  it('exposes retry and back targets at >=44px', () => {
    const map = mapSource();
    expect(map).toContain('Thử lại khi có kết nối');
    expect(map).toContain('Quay lại bản đồ');
    const touchTargets = map.match(/minHeight: 44/g) ?? [];
    // Basemap download, layer toggles, retry actions and the back action.
    expect(touchTargets.length).toBeGreaterThanOrEqual(4);
  });

  it('dismisses the focused polygon/panel locally only', () => {
    const map = mapSource();
    const dismissAt = map.indexOf('const dismissLandFocus = useCallback(');
    expect(dismissAt).toBeGreaterThan(-1);
    const dismiss = map.slice(dismissAt, dismissAt + 500);
    expect(dismiss).toContain('landRequestRef.current += 1');
    expect(dismiss).toContain('setLandParcel(null)');
    expect(dismiss).toContain('setLandDismissed(true)');
    expect(dismiss).toContain("setLandState('idle')");
    expect(dismiss).not.toMatch(/fetch|requestJson|getLandParcelMapProjection/);
    // Panel and geometry both hide once dismissed.
    expect(map).toContain(
      "focusParcelId && landState !== 'idle' && !landDismissed",
    );
    expect(map).toContain("landState === 'ready' && !landDismissed");
    // Focus change or explicit retry re-arms the focus: loadLandParcel clears
    // the local dismiss before the offline guard runs, and it is re-created
    // per parcelId so the scheduled effect refetches for the new focus.
    const loadAt = map.indexOf('const loadLandParcel = useCallback(');
    expect(loadAt).toBeGreaterThan(-1);
    const load = map.slice(loadAt, loadAt + 1200);
    expect(load).toContain('setLandDismissed(false)');
    expect(load.indexOf('setLandDismissed(false)')).toBeLessThan(
      load.indexOf('isLandParcelFocusOffline()'),
    );
    expect(map).toContain('}, [focusParcelId]);');
    // No navigator change: dismiss stays inside MapScreen local state.
    const navigatorSource = readSource('../../navigation/AppNavigator.tsx');
    expect(navigatorSource).not.toContain('Quay lại bản đồ');
    expect(navigatorSource).not.toContain('dismissLandFocus');
    expect(navigatorSource).not.toContain('landDismissed');
  });
});

// T-006 AC-3: out-of-order responses can never reintroduce geometry after
// offline or a focus change; copy carries no PII or sync semantics.
describe('T-006 AC-3 stale/race invalidation and privacy', () => {
  it('drops stale/out-of-order parcel geometry', () => {
    const map = mapSource();
    // Both resolve paths re-check the request id before committing.
    const guards = map.match(/landRequestRef\.current !== requestId/g) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(2);
    // Focus cleanup, offline transition and dismiss each retire the request.
    const invalidations = map.match(/landRequestRef\.current \+= 1/g) ?? [];
    expect(invalidations.length).toBeGreaterThanOrEqual(3);
    expect(map).toContain('clearTimeout(timer);');
  });

  it('drops stale/out-of-order parcel geometry and sensitive fields', () => {
    const projection = readLandParcelMapProjection({
      ...parcelBody,
      parcel: {
        ...parcelBody.parcel,
        party: 'secret party',
        address: 'secret address',
        rights: 'secret rights',
      },
      Evidence: 'secret',
      sync: 'secret',
    });
    expect(projection).not.toBeNull();
    expect(JSON.stringify(projection)).not.toMatch(
      /party|address|rights|Evidence|sync/i,
    );
    const map = mapSource();
    expect(map).not.toMatch(/party/i);
    expect(map).not.toMatch(/[aA]ddress/);
    expect(map).not.toMatch(/rights/i);
    expect(map).not.toContain('Evidence');
    expect(map).not.toContain('đồng bộ');
    expect(map).not.toMatch(/submitOffline|OfflineCommand|syncQueue/i);
    expect(map).not.toContain('organizationId');
    // Shared projection allowlist is preserved.
    expect(
      Object.keys(readLandParcelMapProjection(parcelBody)!.parcel).sort(),
    ).toEqual(
      [
        'geometry',
        'id',
        'mapSheetNumber',
        'parcelCode',
        'parcelNumber',
        'status',
        'updatedAt',
      ].sort(),
    );
  });
});
