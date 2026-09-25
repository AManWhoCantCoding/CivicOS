import { describe, expect, it, vi } from 'vitest';

import * as identity from '@/modules/identity';
import * as layersRoute from '@/app/api/map/layers/route';
import * as searchRoute from '@/app/api/related-info/search/route';
import * as detailRoute from '@/app/api/related-info/[entityType]/[id]/route';
import { getRelatedInfoDetail } from '@/modules/mobile-readonly/related-info';
import { mobileEntityIds, mobileUsers } from './fixtures';
import { expectNoRawPii, useMobileReadonlyFixture } from './helpers';

describe('mobile related-info detail contract', () => {
  useMobileReadonlyFixture();
  it('returns an entity envelope without raw PII', async () => {
    const result = await getRelatedInfoDetail(
      mobileUsers.inScope,
      'RESIDENT',
      mobileEntityIds.residentId,
    );
    expect(result).toMatchObject({
      entityType: 'RESIDENT',
      data: expect.any(Object),
    });
    expectNoRawPii(result);
  });

  it('rejects a resource outside the server boundary', async () => {
    await expect(
      getRelatedInfoDetail(
        mobileUsers.inScope,
        'BUSINESS',
        mobileEntityIds.unassignedBusinessId,
      ),
    ).rejects.toThrow('FORBIDDEN');
  });

  it('keeps the direct detail route inside the same boundary contract', async () => {
    vi.spyOn(identity, 'getCurrentUser').mockResolvedValue(mobileUsers.inScope);
    const inScope = await detailRoute.GET(new Request('http://localhost'), {
      params: Promise.resolve({
        entityType: 'RESIDENT',
        id: mobileEntityIds.residentId,
      }),
    });
    expect(inScope.status).toBe(200);
    const outside = await detailRoute.GET(new Request('http://localhost'), {
      params: Promise.resolve({
        entityType: 'BUSINESS',
        id: mobileEntityIds.unassignedBusinessId,
      }),
    });
    expect(outside.status).toBe(403);
    const crossUnit = await detailRoute.GET(new Request('http://localhost'), {
      params: Promise.resolve({
        entityType: 'BUSINESS',
        id: mobileEntityIds.crossBusinessId,
      }),
    });
    expect(crossUnit.status).toBe(403);
  });

  it('returns 403 for a commander layer without Assignment', async () => {
    vi.spyOn(identity, 'getCurrentUser').mockResolvedValue(
      mobileUsers.commanderWithoutAssignment,
    );
    const response = await layersRoute.GET();
    expect(response.status).toBe(403);
  });

  it('returns an empty direct search list for an outside record', async () => {
    vi.spyOn(identity, 'getCurrentUser').mockResolvedValue(mobileUsers.inScope);
    const response = await searchRoute.GET(
      new Request(
        'http://localhost/api/related-info/search?entityType=BUSINESS&q=Cross%20unit',
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [], total: 0 });
  });
});
