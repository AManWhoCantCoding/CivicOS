import { describe, expect, it } from 'vitest';

import { createGeoArea, createGeoPoint } from '@/modules/platform/geo';
import { projectToMapMarkers, toMapMarker } from '@/modules/platform/map';

const point = (latitude: number, longitude: number) =>
  createGeoPoint(latitude, longitude);

describe('map geometry contract', () => {
  it('projects a GeoPoint marker with WGS84 coordinates', () => {
    const marker = toMapMarker({
      id: 'Incident:abc123',
      aggregateType: 'Incident',
      title: 'Vụ việc',
      latitude: 20.95,
      longitude: 105.98,
      status: 'received',
      updatedAt: '2026-09-23T00:00:00.000Z',
    });
    expect(marker.latitude).toBe(20.95);
    expect(marker.geometry).toBeUndefined();
  });

  it('projects a closed GeoArea polygon without inferring it', () => {
    const area = createGeoArea([
      point(20.95, 105.97),
      point(20.95, 105.99),
      point(20.97, 105.98),
      point(20.95, 105.97),
    ]);
    const marker = toMapMarker({
      id: 'Inspection:def456',
      aggregateType: 'Inspection',
      title: 'Vùng kiểm tra',
      latitude: 20.96,
      longitude: 105.98,
      geometry: area,
      status: 'scheduled',
      updatedAt: '',
    });
    expect(marker.geometry?.coordinateReference).toBe('WGS84');
    expect(marker.geometry?.points).toHaveLength(4);
  });

  it('rejects an open polygon instead of closing it silently', () => {
    expect(() =>
      toMapMarker({
        id: 'Inspection:open',
        aggregateType: 'Inspection',
        title: 'Vùng hở',
        latitude: 20.96,
        longitude: 105.98,
        geometry: {
          points: [point(20.95, 105.97), point(20.95, 105.99)],
          coordinateReference: 'WGS84',
        },
        status: 'scheduled',
        updatedAt: '',
      }),
    ).toThrow();
  });

  it('keeps point rows and skips rows without coordinates', () => {
    const markers = projectToMapMarkers([
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
      {
        aggregateType: 'Incident',
        aggregateId: 'incident-2',
        state: { description: 'Thiếu tọa độ', status: 'received' },
      },
    ]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.id).toBe('Incident:incident-1');
  });

  it('drops invalid polygons but keeps the point marker', () => {
    const markers = projectToMapMarkers([
      {
        aggregateType: 'Inspection',
        aggregateId: 'inspection-9',
        state: {
          title: 'Cơ sở',
          latitude: '20.96',
          longitude: '105.98',
          geometry: { points: [{ latitude: 300, longitude: 500 }] },
          status: 'scheduled',
        },
      },
    ]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.geometry).toBeUndefined();
  });
});
