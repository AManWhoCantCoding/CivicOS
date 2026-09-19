import { describe, expect, it } from 'vitest';

import { createGeoArea, createGeoPoint } from '@/modules/platform';

describe('geo contract', () => {
  it('accepts a closed WGS84 area', () => {
    const point = (latitude: number, longitude: number) =>
      createGeoPoint(latitude, longitude);
    const area = createGeoArea([
      point(20, 105),
      point(20, 106),
      point(21, 105),
      point(20, 105),
    ]);
    expect(area.coordinateReference).toBe('WGS84');
  });

  it('rejects an open polygon', () => {
    expect(() =>
      createGeoArea([
        createGeoPoint(20, 105),
        createGeoPoint(20, 106),
        createGeoPoint(21, 105),
      ]),
    ).toThrow('POLYGON_MUST_BE_CLOSED');
  });

  it('rejects a self-intersecting polygon', () => {
    const point = (latitude: number, longitude: number) =>
      createGeoPoint(latitude, longitude);
    expect(() =>
      createGeoArea([
        point(20, 105),
        point(21, 106),
        point(20, 106),
        point(21, 105),
        point(20, 105),
      ]),
    ).toThrow('POLYGON_SELF_INTERSECTS');
  });
});
