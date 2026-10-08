import { readFileSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('../../features/map/MapScreen', () => ({
  MapScreen: () => null,
}));

import { ApiError } from '../../api/client';
import { routes } from '../../navigation/AppNavigator';
import {
  isVehicleMasked,
  vehicleCoordinates,
  vehicleDetailStateFor,
} from '../vehicle-observation/VehicleObservationDetail';

function readSource(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), 'utf8');
}

const detailSource = () =>
  readSource('../vehicle-observation/VehicleObservationDetail.tsx');
const forcesSource = () => readSource('../../api/forces.ts');
const deepLinksSource = () => readSource('../../navigation/deepLinks.ts');
const navigatorSource = () => readSource('../../navigation/AppNavigator.tsx');

describe('vehicle detail state mapping', () => {
  it('maps forbidden, missing, offline and generic failures', () => {
    expect(vehicleDetailStateFor(new ApiError(403, 'FORBIDDEN', null))).toBe(
      'forbidden',
    );
    expect(vehicleDetailStateFor(new ApiError(404, 'NOT_FOUND', null))).toBe(
      'empty',
    );
    expect(vehicleDetailStateFor(new ApiError(0, 'OFFLINE', null))).toBe(
      'offline',
    );
    expect(vehicleDetailStateFor(new ApiError(500, 'FAILED', null))).toBe(
      'error',
    );
    expect(vehicleDetailStateFor(new ApiError(401, 'expired', null))).toBe(
      'error',
    );
    expect(vehicleDetailStateFor(new Error('boom'))).toBe('error');
  });

  it('treats a missing plate as masked without raw fallback', () => {
    expect(isVehicleMasked(null)).toBe(true);
    expect(
      isVehicleMasked({
        id: 'obs-1',
        plate: '',
        status: 'observed',
        observedAt: '2026-10-01T08:00:00.000Z',
        latitude: '10.7',
        longitude: '106.6',
      }),
    ).toBe(true);
    expect(
      isVehicleMasked({
        id: 'obs-1',
        plate: '51H-12345',
        status: 'observed',
        observedAt: '2026-10-01T08:00:00.000Z',
        latitude: '10.7',
        longitude: '106.6',
      }),
    ).toBe(false);
  });

  it('passes map coordinates only when both values parse', () => {
    expect(
      vehicleCoordinates({
        id: 'obs-1',
        plate: '51H-12345',
        status: 'observed',
        observedAt: '2026-10-01T08:00:00.000Z',
        latitude: '10.7',
        longitude: '106.6',
      }),
    ).toEqual({ lat: 10.7, lng: 106.6 });
    expect(vehicleCoordinates(null)).toBeUndefined();
    expect(
      vehicleCoordinates({
        id: 'obs-1',
        plate: '51H-12345',
        status: 'observed',
        observedAt: '2026-10-01T08:00:00.000Z',
        latitude: '',
        longitude: '106.6',
      }),
    ).toBeUndefined();
  });
});

describe('vehicle detail six-field allowlist and redaction', () => {
  it('renders only the approved safe fields and actions', () => {
    const source = detailSource();
    for (const label of [
      'Biển số',
      'Trạng thái',
      'Thời điểm quan sát',
      'Vĩ độ',
      'Kinh độ',
      '‹ Quay lại',
      'Mở bản đồ',
    ]) {
      expect(source).toContain(label);
    }
    expect(source).toContain('MaskedValue');
  });

  it('never renders sensitive, permission or raw fields', () => {
    const source = detailSource();
    for (const token of [
      'Notification.body',
      'owner',
      'notes',
      'evidence',
      'permissions',
      'verifications',
      'matchedRegistryId',
      'RelatedInfo',
      'mobile_read',
    ]) {
      expect(source).not.toContain(token);
    }
  });

  it('keeps every state path reachable with shared state vocabulary', () => {
    const source = detailSource();
    expect(source).toContain('StateMessage');
    expect(source).toContain('OfflineBanner');
    expect(source).toContain('mobileBaseline');
    expect(source).toContain('vehicleDetailStateFor');
    expect(source).toContain("state === 'offline' && <OfflineBanner />");
    expect(source).toContain('minWidth: 44');
    expect(source).toContain('minHeight: 44');
    expect(source).toContain('accessibilityLabel="Quay lại"');
    expect(source).toContain('accessibilityLabel="Mở bản đồ"');
  });
});

describe('vehicle read-only and no-mutation guard', () => {
  it('adds no vehicle POST/PATCH, mutation queue or client authorization', () => {
    const implementation = [
      forcesSource(),
      detailSource(),
      deepLinksSource(),
      navigatorSource(),
      readSource('../alarm/AlarmScreen.tsx'),
      readSource('../dispatch/DispatchScreen.tsx'),
      readSource('../task/TaskScreen.tsx'),
    ].join('\n');
    expect(implementation).not.toMatch(/\b(POST|PATCH|PUT|DELETE)\b/);
    expect(implementation).not.toMatch(/submitOffline|mutation|AsyncStorage/i);
    expect(forcesSource()).toContain('?view=mobile');
    expect(forcesSource()).toContain('vehicleObservationPath');
    expect(forcesSource()).toContain('getVehicleObservation');
  });
});

describe('vehicle summary actions on Alarm, Dispatch and Task', () => {
  it('opens the shared detail route with the approved action label', () => {
    const alarm = readSource('../alarm/AlarmScreen.tsx');
    const dispatch = readSource('../dispatch/DispatchScreen.tsx');
    const task = readSource('../task/TaskScreen.tsx');
    for (const source of [alarm, dispatch, task]) {
      expect(source).toContain('isVehicleObservationLink');
      expect(source).toContain('Mở chi tiết');
      expect(source).toContain('‹ Quay lại');
      expect(source).toContain('deepLinkFor');
    }
    expect(alarm).toContain('Mở liên kết tài nguyên');
    expect(dispatch).toContain('Mở bản đồ/RelatedInfo');
    expect(task).toContain('Mở bản đồ/RelatedInfo');
  });
});

describe('vehicle navigator route, origin and map context', () => {
  it('keeps the tab list unchanged while adding the shared detail route', () => {
    expect(routes).toHaveLength(8);
    expect(routes).not.toContain('VehicleObservationDetail');
  });

  it('returns detail back to the originating surface and maps with resource context', () => {
    expect(navigatorSource()).toContain('VehicleObservationDetail');
    expect(navigatorSource()).toContain('vehicleOrigin');
    expect(navigatorSource()).toContain('setRoute(vehicleOrigin)');
    expect(navigatorSource()).toContain('onOpenMap={openVehicleMap}');
    expect(navigatorSource()).toContain('observationId={context.resourceId');
  });

  it('keeps a vehicle map origin with back to the originating surface', () => {
    const source = navigatorSource();
    expect(source).toContain('vehicleMapOrigin');
    expect(source).toContain('openVehicleMap');
    expect(source).toContain('openMap(undefined, vehicleContext)');
    expect(source).toContain('setVehicleMapOrigin(vehicleOrigin)');
    expect(source).toContain('setVehicleMapOrigin(null)');
    expect(source).toContain('vehicleMapOrigin !== null');
    expect(source).toContain('accessibilityLabel="Quay lại"');
    expect(source).toContain('‹ Quay lại');
    expect(source).toContain('setRoute(origin)');
  });

  it('keeps VehicleObservation out of RelatedInfo types, search and counts', () => {
    const types = readSource('../related-info/types.ts');
    expect(types).not.toMatch(/VehicleObservation|VEHICLE/i);
  });
});
