export type MockCameraObservation = {
  plate: string;
  observedAt: string;
  latitude: number;
  longitude: number;
};

export const MOCK_CAMERA_FIXTURES: readonly MockCameraObservation[] = [
  {
    plate: '89A12345',
    observedAt: '2026-09-19T01:00:00.000Z',
    latitude: 20.96,
    longitude: 105.93,
  },
  {
    plate: '29B67890',
    observedAt: '2026-09-19T01:05:00.000Z',
    latitude: 20.961,
    longitude: 105.931,
  },
  {
    plate: '89C11223',
    observedAt: '2026-09-19T01:10:00.000Z',
    latitude: 20.962,
    longitude: 105.932,
  },
];

export function getMockCameraObservations(): MockCameraObservation[] {
  return MOCK_CAMERA_FIXTURES.map((fixture) => ({ ...fixture }));
}

export type MockCameraAdapterState = {
  available: boolean;
  manualInputAvailable: true;
  observations: MockCameraObservation[];
};

export function isMockCameraAvailable(input: { available: boolean }): boolean {
  return input.available;
}

export function createMockCameraAdapter(input: {
  available: boolean;
}): MockCameraAdapterState {
  if (!isMockCameraAvailable(input)) {
    return { available: false, manualInputAvailable: true, observations: [] };
  }
  return {
    available: true,
    manualInputAvailable: true,
    observations: getMockCameraObservations(),
  };
}
