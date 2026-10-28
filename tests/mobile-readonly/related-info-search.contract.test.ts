import { describe, expect, it } from 'vitest';

import { searchRelatedInfo } from '@/modules/mobile-readonly/related-info';
import { mobileEntityIds, mobileUsers } from './fixtures';
import {
  expectListEnvelope,
  expectNoRawPii,
  useMobileReadonlyFixture,
} from './helpers';

const describeWithDatabase = describe.skipIf(process.env.RUN_DB_TESTS !== '1');

describeWithDatabase('mobile related-info search contract', () => {
  useMobileReadonlyFixture();
  it('echoes pagination and strips raw PII', async () => {
    const result = await searchRelatedInfo(mobileUsers.inScope, {
      page: 2,
      pageSize: 20,
    });
    expectListEnvelope(result);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
    expect(result.total).toBeGreaterThan(0);
    expectNoRawPii(result);
    for (const [entityType, inScopeId, outsideIds] of [
      [
        'RESIDENT',
        mobileEntityIds.residentId,
        [mobileEntityIds.crossResidentId, mobileEntityIds.unassignedResidentId],
      ],
      [
        'BUSINESS',
        mobileEntityIds.businessId,
        [mobileEntityIds.crossBusinessId, mobileEntityIds.unassignedBusinessId],
      ],
      [
        'HOTSPOT',
        mobileEntityIds.hotspotId,
        [mobileEntityIds.crossHotspotId, mobileEntityIds.unassignedHotspotId],
      ],
      [
        'VIOLATION',
        mobileEntityIds.violationId,
        [
          mobileEntityIds.crossViolationId,
          mobileEntityIds.unassignedViolationId,
        ],
      ],
    ] as const) {
      const entity = await searchRelatedInfo(mobileUsers.inScope, {
        entityType,
        page: 1,
        pageSize: 20,
      });
      expect(entity.data).not.toHaveLength(0);
      expect(entity.data.map((item) => item.id)).toContain(inScopeId);
      expect(entity.data.map((item) => item.id)).not.toEqual(
        expect.arrayContaining([...outsideIds]),
      );
      expectNoRawPii(entity);
    }
    const business = await searchRelatedInfo(mobileUsers.inScope, {
      entityType: 'BUSINESS',
      page: 1,
      pageSize: 20,
    });
    expect(business.data).toHaveLength(1);
    expect(business.data.map((item) => item.id)).not.toEqual(
      expect.arrayContaining([
        mobileEntityIds.crossBusinessId,
        mobileEntityIds.unassignedBusinessId,
      ]),
    );
  });
});
