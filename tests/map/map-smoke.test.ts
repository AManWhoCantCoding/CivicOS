import { describe, expect, it } from 'vitest';

import {
  mapTileHealthUrl,
  projectToMapMarkers,
  resolveMapProvider,
} from '@/modules/platform/map';

// Smoke contract: tile health, attribution, fallback; fallback OSS
// không bao giờ được dùng để đánh dấu E1-001 đạt độ chính xác.
describe('map smoke contract', () => {
  it('serves tile health under the approved host port', () => {
    const provider = resolveMapProvider();
    expect(provider.tileBaseUrl).toContain(':8080');
    expect(mapTileHealthUrl(provider)).toContain(':8080/health');
  });

  it('always carries OSM attribution for the OSS subset', () => {
    const provider = resolveMapProvider();
    expect(provider.attribution).toContain('OpenStreetMap');
    expect([...provider.bounds]).toEqual([105.93, 20.91, 106.03, 20.99]);
  });

  it('keeps provider fallback separate from official accuracy', () => {
    const fallback = resolveMapProvider({
      tileBaseUrl: 'http://localhost:8080',
    });
    expect(fallback.official).toBe(false);
    expect(fallback.providerId).toBe('oss-tileserver-gl');
  });

  it('projects live read-model rows without fixture tiles', () => {
    const markers = projectToMapMarkers([
      {
        aggregateType: 'Incident',
        aggregateId: 'incident-live',
        state: {
          description: 'Tin trực ban',
          latitude: 20.95,
          longitude: 105.98,
          status: 'received',
          updatedAt: '2026-09-23T00:00:00.000Z',
        },
      },
    ]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.aggregateType).toBe('Incident');
  });
});
