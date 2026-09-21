import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createMockCameraAdapter,
  getMockCameraObservations,
  isMockCameraAvailable,
  MOCK_CAMERA_FIXTURES,
} from '@/modules/vehicles/mock-camera-adapter';
import {
  describeOfflineQueueStatus,
  describeVehicleCommandError,
} from '@/components/vehicles/vehicle-status-text';

describe('PS-E1-009 slices 8-9 vehicle watch field contract', () => {
  it('returns deterministic mock camera fixtures', () => {
    const first = getMockCameraObservations();
    const second = getMockCameraObservations();
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(0);
    expect(MOCK_CAMERA_FIXTURES.map(({ plate }) => plate)).toEqual([
      '89A12345',
      '29B67890',
      '89C11223',
    ]);
    for (const fixture of first) {
      expect(fixture.plate).toMatch(/^[0-9A-Z]+$/);
      expect(new Date(fixture.observedAt).getTime()).not.toBeNaN();
    }
  });

  it('keeps the mock adapter free of external network calls', () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        'src',
        'modules',
        'vehicles',
        'mock-camera-adapter.ts',
      ),
      'utf8',
    );
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toMatch(/XMLHttpRequest/);
    expect(source).not.toMatch(/require\(['"]https?/);
    expect(source).not.toMatch(/from ['"]https?:/);
    expect(source).not.toMatch(/node:(https?|net|http)/);
  });

  it('keeps manual input available when the adapter is unavailable', () => {
    expect(isMockCameraAvailable({ available: false })).toBe(false);
    const unavailable = createMockCameraAdapter({ available: false });
    expect(unavailable.available).toBe(false);
    expect(unavailable.observations).toEqual([]);
    expect(unavailable.manualInputAvailable).toBe(true);
    const available = createMockCameraAdapter({ available: true });
    expect(available.available).toBe(true);
    expect(available.manualInputAvailable).toBe(true);
    expect(available.observations).toEqual(getMockCameraObservations());
  });

  it('maps stale confirmation and authorization errors to visible text', () => {
    expect(describeVehicleCommandError('STALE_OBSERVATION', 400)).toMatch(
      /dữ liệu đã cũ|STALE_OBSERVATION/,
    );
    expect(describeVehicleCommandError('MATCH_NOT_PENDING', 400)).toMatch(
      /xác nhận|MATCH_NOT_PENDING/,
    );
    expect(describeVehicleCommandError('FORBIDDEN', 403)).toMatch(
      /Không được phép|FORBIDDEN/,
    );
    expect(describeVehicleCommandError('UNAUTHENTICATED', 401)).toMatch(
      /Không được phép|UNAUTHENTICATED/,
    );
  });

  it('never presents pending offline work as sent', () => {
    expect(describeOfflineQueueStatus('pending')).toMatch(/chờ đồng bộ/);
    expect(describeOfflineQueueStatus('pending')).not.toMatch(/đã gửi/);
    expect(describeOfflineQueueStatus('syncing')).not.toMatch(/đã gửi/);
    expect(describeOfflineQueueStatus('synced')).toMatch(/đã lưu|đồng bộ/);
  });
});
