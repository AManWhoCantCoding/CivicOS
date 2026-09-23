import { afterEach, describe, expect, it } from 'vitest';

import {
  CADN_BOUNDS,
  mapTileHealthUrl,
  projectToMapMarkers,
  resolveMapProvider,
} from '@/modules/platform/map';

const rows = [
  {
    aggregateType: 'Incident',
    aggregateId: 'incident-1',
    state: {
      description: 'Tin báo',
      latitude: 20.95,
      longitude: 105.98,
      status: 'received',
      updatedAt: '2026-09-23T00:00:00.000Z',
    },
  },
];

afterEach(() => {
  delete process.env.MAP_TILE_STYLE_URL;
  delete process.env.MAP_TILE_BASE_URL;
  delete process.env.MAP_TILE_ATTRIBUTION;
});

describe('map provider contract', () => {
  it('resolves the CADN OSS subset with OSM attribution', () => {
    const provider = resolveMapProvider();
    expect(provider.tileBaseUrl).toBe('http://localhost:8080');
    expect(provider.styleUrl).toContain('http://localhost:8080');
    expect(provider.attribution).toContain('OpenStreetMap');
    expect([...provider.bounds]).toEqual([...CADN_BOUNDS]);
    expect(provider.official).toBe(false);
  });

  it('swaps tile endpoint without changing the domain marker', () => {
    const before = projectToMapMarkers(rows);
    const swapped = resolveMapProvider({
      tileBaseUrl: 'http://tiles.internal:8080',
      styleUrl: 'http://tiles.internal:8080/styles/basic/style.json',
    });
    const after = projectToMapMarkers(rows);
    expect(swapped.tileBaseUrl).toBe('http://tiles.internal:8080');
    expect(after).toEqual(before);
  });

  it('rejects provider config without OSM attribution', () => {
    expect(() => resolveMapProvider({ attribution: 'Nguồn nội bộ' })).toThrow(
      'MAP_PROVIDER_UNAVAILABLE',
    );
  });

  it('rejects non-http style endpoints', () => {
    expect(() =>
      resolveMapProvider({ styleUrl: 'ftp://tiles/style.json' }),
    ).toThrow('MAP_PROVIDER_UNAVAILABLE');
  });

  it('derives tile health from the configured base URL', () => {
    const provider = resolveMapProvider();
    expect(mapTileHealthUrl(provider)).toBe('http://localhost:8080/health');
  });

  it('exposes no credential material in the resolved config', () => {
    const dumped = JSON.stringify(resolveMapProvider()).toLowerCase();
    expect(dumped).not.toContain('token');
    expect(dumped).not.toContain('secret');
    expect(dumped).not.toContain('credential');
    expect(dumped).not.toContain('password');
  });
});
