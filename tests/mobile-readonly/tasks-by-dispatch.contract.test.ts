import { describe, expect, it } from 'vitest';

import {
  getTask,
  listTasksByDispatchId,
} from '@/modules/mobile-readonly/forces';
import {
  mobileDispatchId,
  mobileOutsideDispatchId,
  mobileOutsideTaskId,
  mobileUsers,
} from './fixtures';
import {
  expectListEnvelope,
  expectNoRawPii,
  useMobileReadonlyFixture,
} from './helpers';

const describeWithDatabase = describe.skipIf(process.env.RUN_DB_TESTS !== '1');

describeWithDatabase('tasks-by-dispatch compatibility alias', () => {
  useMobileReadonlyFixture();
  it('returns an envelope for an in-scope dispatch and hides an outside dispatch', async () => {
    const inScope = await listTasksByDispatchId(
      mobileUsers.inScope,
      mobileDispatchId,
    );
    expectListEnvelope(inScope);
    expect(inScope.data).not.toHaveLength(0);
    expect(inScope.data[0]).toEqual(
      expect.objectContaining({
        coordinates: { lat: expect.any(Number), lng: expect.any(Number) },
        relatedInfo: expect.any(Object),
        assignmentSummary: expect.any(Object),
      }),
    );
    expectNoRawPii(inScope);

    const outside = await listTasksByDispatchId(
      mobileUsers.inScope,
      mobileOutsideDispatchId,
    );
    expect(outside).toMatchObject({ data: [], total: 0 });
  });

  it('rejects an outside-boundary task detail', async () => {
    await expect(
      getTask(mobileUsers.inScope, mobileOutsideTaskId),
    ).rejects.toThrow('FORBIDDEN');
  });
});
