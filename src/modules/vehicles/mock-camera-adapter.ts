export type MockCameraObservation = {
  plate: string;
  observedAt: string;
  latitude: number;
  longitude: number;
};

export function getMockCameraObservations(): MockCameraObservation[] {
  return [
    {
      plate: '89A12345',
      observedAt: '2026-09-19T01:00:00.000Z',
      latitude: 20.96,
      longitude: 105.93,
    },
  ];
}
