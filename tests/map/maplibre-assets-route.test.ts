import { describe, expect, it } from 'vitest';

import { GET } from '@/app/api/maplibre-assets/[asset]/route';

function route(pathname: string) {
  const asset = pathname.split('/').pop() ?? '';
  return { params: Promise.resolve({ asset }) };
}

describe('GET /api/maplibre-assets/[asset]', () => {
  it('serves the allowlisted worker module with a JS content type', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/maplibre-assets/maplibre-gl-worker.mjs',
      ),
      route('/api/maplibre-assets/maplibre-gl-worker.mjs'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'text/javascript; charset=utf-8',
    );
    const body = await response.text();
    expect(body).toContain('maplibre-gl-shared.mjs');
  });

  it('serves the allowlisted shared module referenced by the worker', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/maplibre-assets/maplibre-gl-shared.mjs',
      ),
      route('/api/maplibre-assets/maplibre-gl-shared.mjs'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'text/javascript; charset=utf-8',
    );
    expect((await response.text()).length).toBeGreaterThan(1000);
  });

  it.each([
    '../../../../../../etc/passwd',
    'maplibre-gl.mjs',
    'maplibre-gl.css',
    'maplibre-gl-worker.mjs.map',
    '..%2Fmaplibre-gl.mjs',
    'maplibre-gl-worker.mjs%00.js',
  ])(
    'rejects unknown or hostile asset value %s without reading files',
    async (hostile) => {
      const response = await GET(
        new Request(
          `http://localhost/api/maplibre-assets/${encodeURIComponent(hostile)}`,
        ),
        route(`/api/maplibre-assets/${encodeURIComponent(hostile)}`),
      );
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: 'NOT_FOUND' });
    },
  );

  it('rejects an empty asset segment', async () => {
    const response = await GET(
      new Request('http://localhost/api/maplibre-assets/'),
      route('/api/maplibre-assets/'),
    );
    expect(response.status).toBe(404);
  });
});
