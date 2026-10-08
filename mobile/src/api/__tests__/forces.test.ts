import {
  forcePaths,
  getVehicleObservation,
  vehicleObservationPath,
} from '../forces';

describe('forces read paths', () => {
  it('includes task detail and source-compatible alias', () => {
    expect(forcePaths.task('t1')).toBe('/api/forces/tasks/t1');
    expect(forcePaths.tasksByDispatch('d1')).toBe(
      '/api/forces/tasksbydispatchid?dispatchId=d1',
    );
  });
});

describe('vehicle observation read helper', () => {
  it('builds the locked mobile view URL with encoded identity', () => {
    expect(vehicleObservationPath('obs-1')).toBe(
      '/api/vehicles/observations/obs-1?view=mobile',
    );
    expect(vehicleObservationPath('obs 1/x')).toBe(
      '/api/vehicles/observations/obs%201%2Fx?view=mobile',
    );
  });

  it('calls the mobile view through the shared read-only client', async () => {
    const globals = globalThis as typeof globalThis & {
      __CIVICOS_API_BASE_URL__?: string;
    };
    globals.__CIVICOS_API_BASE_URL__ = 'http://10.0.2.2:3000';
    const payload = {
      id: 'obs-1',
      plate: '51H-12345',
      status: 'observed',
      observedAt: '2026-10-01T08:00:00.000Z',
      latitude: '10.7',
      longitude: '106.6',
    };
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200 }),
      );
    try {
      await expect(getVehicleObservation('obs-1')).resolves.toEqual(payload);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit?];
      expect(url).toBe(
        'http://10.0.2.2:3000/api/vehicles/observations/obs-1?view=mobile',
      );
      expect((init?.method ?? 'GET').toUpperCase()).toBe('GET');
    } finally {
      fetchSpy.mockRestore();
      delete globals.__CIVICOS_API_BASE_URL__;
    }
  });
});
