import { describe, expect, it } from 'vitest';

import { createGeoArea, createGeoPoint } from '@/modules/platform/geo';
import { toMapAreaGeoJson, toMapMarker } from '@/modules/platform/map';

const point = (latitude: number, longitude: number) =>
  createGeoPoint(latitude, longitude);

describe('map area polygon render contract', () => {
  it('renders GeoArea as a closed polygon fill ring', () => {
    const marker = toMapMarker({
      id: 'Inspection:area-1',
      aggregateType: 'Inspection',
      title: 'Vùng kiểm tra',
      latitude: 20.96,
      longitude: 105.98,
      geometry: createGeoArea([
        point(20.95, 105.97),
        point(20.95, 105.99),
        point(20.97, 105.98),
        point(20.95, 105.97),
      ]),
      status: 'scheduled',
      updatedAt: '',
    });
    const collection = toMapAreaGeoJson([marker]);
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]?.geometry.type).toBe('Polygon');
    expect(collection.features[0]?.geometry.coordinates).toEqual([
      [
        [105.97, 20.95],
        [105.99, 20.95],
        [105.98, 20.97],
        [105.97, 20.95],
      ],
    ]);
  });

  it('keeps GeoPoint markers out of the polygon layer', () => {
    const marker = toMapMarker({
      id: 'Incident:point-1',
      aggregateType: 'Incident',
      title: 'Tin báo',
      latitude: 20.95,
      longitude: 105.98,
      status: 'received',
      updatedAt: '',
    });
    const collection = toMapAreaGeoJson([marker]);
    expect(collection.features).toHaveLength(0);
  });

  it('never infers polygons from points alone', () => {
    const collection = toMapAreaGeoJson([
      toMapMarker({
        id: 'Incident:a',
        aggregateType: 'Incident',
        title: 'A',
        latitude: 20.95,
        longitude: 105.98,
        status: 'received',
        updatedAt: '',
      }),
      toMapMarker({
        id: 'Incident:b',
        aggregateType: 'Incident',
        title: 'B',
        latitude: 20.96,
        longitude: 105.99,
        status: 'received',
        updatedAt: '',
      }),
    ]);
    expect(collection.features).toHaveLength(0);
  });
});
