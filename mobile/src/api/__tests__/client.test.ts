import {
  ApiError,
  onSessionExpired,
  parseResponse,
  requestJson,
} from '../client';

describe('API client boundary', () => {
  it('maps 401 and 403 to stable errors', async () => {
    await expect(
      parseResponse(
        new Response(JSON.stringify({ error: 'expired' }), { status: 401 }),
      ),
    ).rejects.toMatchObject<Pick<ApiError, 'status'>>({ status: 401 });
    await expect(
      parseResponse(
        new Response(JSON.stringify({ error: 'denied' }), { status: 403 }),
      ),
    ).rejects.toMatchObject<Pick<ApiError, 'status'>>({ status: 403 });
  });

  it('notifies the session boundary when requestJson receives 401', async () => {
    const globals = globalThis as typeof globalThis & {
      __CIVICOS_API_BASE_URL__?: string;
    };
    globals.__CIVICOS_API_BASE_URL__ = 'http://10.0.2.2:3000';
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'expired' }), { status: 401 }),
      );
    const onExpired = jest.fn();
    const unsubscribe = onSessionExpired(onExpired);

    try {
      await expect(
        requestJson('/api/related-info/search'),
      ).rejects.toMatchObject<Pick<ApiError, 'status'>>({ status: 401 });
      expect(onExpired).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
      fetchSpy.mockRestore();
      delete globals.__CIVICOS_API_BASE_URL__;
    }
  });
});
