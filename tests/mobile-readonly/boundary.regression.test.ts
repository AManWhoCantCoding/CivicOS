import { describe, expect, it } from 'vitest';

import { hasActiveAssignmentForRead } from '@/modules/identity';
import { mobileUsers, mobileResource } from './fixtures';
import { useMobileReadonlyFixture } from './helpers';

const describeWithDatabase = describe.skipIf(process.env.RUN_DB_TESTS !== '1');

describeWithDatabase('mobile assignment boundary regression', () => {
  useMobileReadonlyFixture();
  it('does not grant a commander an assignment-free read', async () => {
    await expect(
      hasActiveAssignmentForRead(
        mobileUsers.commanderWithoutAssignment,
        mobileResource,
      ),
    ).resolves.toBe(false);
  });

  it('requires an active Assignment for every commander read', async () => {
    await expect(
      hasActiveAssignmentForRead(
        mobileUsers.commanderWithAssignment,
        mobileResource,
      ),
    ).resolves.toBe(true);
    await expect(
      hasActiveAssignmentForRead(mobileUsers.revoked, mobileResource),
    ).resolves.toBe(false);
  });
});
