import { describe, expect, it } from 'vitest';

import { aggregateVehicleStatistics } from '@/modules/vehicles';

describe('vehicle statistics aggregation', () => {
  it('uses Ho Chi Minh local calendar month boundaries', () => {
    const result = aggregateVehicleStatistics([
      {
        observedAt: new Date('2026-01-31T17:30:00.000Z'),
        latitude: 20.96,
        longitude: 105.93,
      },
    ]);

    expect(result.monthlyFrequency).toEqual([{ month: '2026-02', count: 1 }]);
  });

  it('groups into approximate pilot-scale cells and returns counts only in deterministic order', () => {
    const result = aggregateVehicleStatistics([
      {
        observedAt: new Date('2026-03-01T00:00:00.000Z'),
        latitude: 20.9602,
        longitude: 105.9304,
      },
      {
        observedAt: new Date('2026-02-01T00:00:00.000Z'),
        latitude: 20.9609,
        longitude: 105.9309,
      },
      {
        observedAt: new Date('2026-02-01T00:00:00.000Z'),
        latitude: 20.9611,
        longitude: 105.9301,
      },
      {
        observedAt: new Date('2026-02-01T00:00:00.000Z'),
        latitude: 20.9621,
        longitude: 105.9301,
      },
    ]);

    expect(result.monthlyFrequency).toEqual([
      { month: '2026-02', count: 3 },
      { month: '2026-03', count: 1 },
    ]);
    expect(result.locationFrequency).toEqual([
      { cellId: '20960:105930', count: 2 },
      { cellId: '20961:105930', count: 1 },
      { cellId: '20962:105930', count: 1 },
    ]);
    expect(Object.keys(result.locationFrequency[0]).sort()).toEqual([
      'cellId',
      'count',
    ]);
    expect(Object.keys(result.monthlyFrequency[0]).sort()).toEqual([
      'count',
      'month',
    ]);
  });

  it('returns empty aggregates for an empty authorized dataset', () => {
    expect(aggregateVehicleStatistics([])).toEqual({
      monthlyFrequency: [],
      locationFrequency: [],
    });
  });
});
