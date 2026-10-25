import { describe, expect, it, vi } from 'vitest';

import { canViewResidentSensitive } from '@/modules/residents/commands';
import type { ResidentActor } from '@/modules/residents/contracts';

const actor = (organizationUnitId?: string): ResidentActor => ({
  id: 'actor-1',
  email: 'commander@example.test',
  name: 'Commander',
  roles: ['commander'],
  organizationUnitId,
});

function client(organizationId: string | null) {
  const findFirst = vi.fn().mockResolvedValue({ organizationId });
  return {
    findFirst,
    tx: { assignment: { findFirst } } as never,
  };
}

describe('resident sensitive access OU scope', () => {
  it('allows matching actor, record, and active assignment scope', async () => {
    const fake = client('ou-a');
    await expect(
      canViewResidentSensitive(
        { id: 'record-1', assignedOrganizationId: 'ou-a' },
        actor('ou-a'),
        fake.tx,
      ),
    ).resolves.toBe(true);
    expect(fake.findFirst).toHaveBeenCalledWith({
      where: {
        resourceType: 'SubjectManagementRecord',
        resourceId: 'record-1',
        task: 'resident_followup',
        assigneeUserId: 'actor-1',
        status: 'active',
      },
      select: { organizationId: true },
    });
  });

  it.each([
    ['missing actor OU', undefined, 'ou-a', 'ou-a'],
    ['missing record OU', 'ou-a', null, 'ou-a'],
    ['missing assignment OU', 'ou-a', 'ou-a', null],
    ['mismatched assignment OU', 'ou-a', 'ou-a', 'ou-b'],
    ['mismatched record OU', 'ou-a', 'ou-b', 'ou-a'],
    ['blank actor OU', '  ', 'ou-a', 'ou-a'],
    ['blank assignment OU', 'ou-a', 'ou-a', '  '],
  ])('denies %s', async (_case, actorOu, recordOu, assignmentOu) => {
    const fake = client(assignmentOu);
    await expect(
      canViewResidentSensitive(
        { id: 'record-1', assignedOrganizationId: recordOu },
        actor(actorOu),
        fake.tx,
      ),
    ).resolves.toBe(false);
  });
});
