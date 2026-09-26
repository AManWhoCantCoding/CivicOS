import { describe, expect, it } from 'vitest';

const baseUrl = process.env.CIVICOS_API_BASE_URL;

async function get(path: string): Promise<Response> {
  if (!baseUrl)
    throw new Error(
      'CIVICOS_API_BASE_URL is required for the HTTP contract test',
    );
  return fetch(new URL(path, baseUrl));
}

describe('mobile read-only HTTP contract', () => {
  it('reads layers from the real backend contract', async () => {
    const response = await get('/api/map/layers');
    expect([200, 401, 403]).toContain(response.status);
    if (response.ok) {
      const body = (await response.json()) as { layers?: unknown };
      expect(Array.isArray(body.layers)).toBe(true);
    }
  });

  it.each(['RESIDENT', 'BUSINESS', 'HOTSPOT', 'VIOLATION'])(
    'reads RelatedInfo %s from the real backend contract',
    async (entityType) => {
      const response = await get(
        `/api/related-info/search?entityType=${entityType}`,
      );
      expect([200, 401, 403]).toContain(response.status);
      if (response.ok) {
        const body = (await response.json()) as {
          data?: Array<{
            entityType?: string;
            id?: string;
            title?: string;
            status?: string;
            updatedAt?: string;
            masked?: boolean;
          }>;
        };
        expect(Array.isArray(body.data)).toBe(true);
        body.data?.forEach((item) => {
          expect(item.entityType).toBe(entityType);
          expect(typeof item.id).toBe('string');
          expect(typeof item.title).toBe('string');
          expect(typeof item.status).toBe('string');
          expect(typeof item.updatedAt).toBe('string');
          expect(typeof item.masked).toBe('boolean');
        });
        const item = body.data?.[0];
        if (item?.id) {
          const detail = await get(
            `/api/related-info/${entityType}/${encodeURIComponent(item.id)}`,
          );
          expect([200, 403, 404]).toContain(detail.status);
          if (detail.ok) {
            const detailBody = (await detail.json()) as {
              entityType?: string;
              data?: { masked?: boolean };
            };
            expect(detailBody.entityType).toBe(entityType);
            expect(typeof detailBody.data?.masked).toBe('boolean');
          }
        }
      }
    },
  );

  it('reads counts, alarms, dispatches, tasks, and the task alias', async () => {
    const paths = [
      '/api/related-info/counts',
      '/api/forces/alarms',
      '/api/forces/dispatches',
      '/api/forces/tasks',
      '/api/forces/tasksbydispatchid?dispatchId=contract-test',
    ];
    const responses = await Promise.all(paths.map(get));
    responses.forEach((response) =>
      expect([200, 401, 403, 404]).toContain(response.status),
    );

    if (responses[0].ok) {
      const body = (await responses[0].json()) as Record<string, unknown>;
      for (const key of [
        'ALL',
        'RESIDENT',
        'BUSINESS',
        'HOTSPOT',
        'VIOLATION',
      ]) {
        expect(Number.isInteger(body[key])).toBe(true);
        expect(body[key] as number).toBeGreaterThanOrEqual(0);
      }
    }

    for (const response of responses.slice(1)) {
      if (!response.ok) continue;
      const body = (await response.json()) as {
        alarms?: unknown[];
        data?: unknown[];
      };
      if ('alarms' in body) expect(Array.isArray(body.alarms)).toBe(true);
      if ('data' in body) {
        expect(Array.isArray(body.data)).toBe(true);
        expect(typeof (body as { total?: unknown }).total).toBe('number');
        expect(typeof (body as { page?: unknown }).page).toBe('number');
        expect(typeof (body as { pageSize?: unknown }).pageSize).toBe('number');
        body.data?.forEach((item) => {
          const force = item as Record<string, unknown>;
          expect(typeof force.id).toBe('string');
          expect(typeof force.title).toBe('string');
          expect(typeof force.status).toBe('string');
          expect(typeof force.createdAt).toBe('string');
        });
      }
    }
  });
});
