import { describe, expect, it } from 'vitest';

import { evaluatePolicy } from '@/modules/identity/authorization';
import {
  ASSIGNMENT_TASKS,
  ROLE_BASE_CAPABILITIES,
  ROLE_CATALOG,
  TASK_ALLOWED_ROLES,
  TASK_CAPABILITIES,
  isTaskCompatibleWithRoles,
} from '@/modules/identity/contracts';
import type { IdentityUser, ResourceRef } from '@/modules/identity/contracts';

function landUser(
  id: string,
  roles: IdentityUser['roles'],
  organizationUnitId = 'ou-a',
): IdentityUser {
  return {
    id,
    email: `${id}@civicos.local`,
    name: id,
    roles,
    organizationUnitId,
  };
}

const landResource: ResourceRef = {
  resourceType: 'LandChangeApplication',
  resourceId: 'app-001',
  organizationId: 'ou-a',
};

const crossResource: ResourceRef = {
  resourceType: 'LandChangeApplication',
  resourceId: 'app-001',
  organizationId: 'ou-b',
};

function activeLandAssignment(organizationId = 'ou-a') {
  return {
    task: 'land_review',
    resourceType: 'LandChangeApplication',
    resourceId: 'app-001',
    status: 'active' as const,
    organizationId,
  };
}

describe('LND-04 land catalog', () => {
  it('registers land roles, capabilities and land_review task', () => {
    expect(ROLE_CATALOG).toContain('land_officer');
    expect(ROLE_CATALOG).toContain('commune_leader');
    expect(ROLE_BASE_CAPABILITIES['land_officer']).toBeDefined();
    expect(ROLE_BASE_CAPABILITIES['commune_leader']).toBeDefined();
    expect(ASSIGNMENT_TASKS).toContain('land_review');
    expect(TASK_CAPABILITIES['land_review']).toEqual(
      expect.arrayContaining(['read', 'mutate', 'read_sensitive']),
    );
    expect(TASK_ALLOWED_ROLES['land_review']).toContain('land_officer');
  });

  it('keeps land_review compatible only with land_officer', () => {
    expect(isTaskCompatibleWithRoles('land_review', ['land_officer'])).toBe(
      true,
    );
    expect(isTaskCompatibleWithRoles('land_review', ['commune_leader'])).toBe(
      false,
    );
    expect(isTaskCompatibleWithRoles('land_review', ['commander'])).toBe(false);
    expect(isTaskCompatibleWithRoles('land_review', ['system_operator'])).toBe(
      false,
    );
    expect(isTaskCompatibleWithRoles('land_review', ['field_officer'])).toBe(
      false,
    );
  });

  it('preserves existing incident task compatibility', () => {
    expect(
      isTaskCompatibleWithRoles('incident_verification', ['field_officer']),
    ).toBe(true);
    expect(
      isTaskCompatibleWithRoles('incident_verification', ['land_officer']),
    ).toBe(false);
  });
});

describe('LND-04 land assignment management policy', () => {
  it('allows commune_leader same-unit assign and approve on land applications', () => {
    const leader = landUser('leader-a', ['commune_leader'], 'ou-a');
    for (const action of ['assign', 'approve'] as const) {
      expect(
        evaluatePolicy({
          user: leader,
          resource: landResource,
          action,
          assignments: [],
        }),
      ).toMatchObject({ allowed: true, reason: 'ALLOWED' });
    }
  });

  it('denies land_officer assign and approve even with an active assignment', () => {
    const officer = landUser('officer-a', ['land_officer'], 'ou-a');
    for (const action of ['assign', 'approve'] as const) {
      expect(
        evaluatePolicy({
          user: officer,
          resource: landResource,
          action,
          assignments: [activeLandAssignment()],
        }).allowed,
      ).toBe(false);
    }
  });

  it('denies cross-unit leader assign and approve on land applications', () => {
    const leaderB = landUser('leader-b', ['commune_leader'], 'ou-b');
    for (const action of ['assign', 'approve'] as const) {
      const result = evaluatePolicy({
        user: leaderB,
        resource: landResource,
        action,
        assignments: [],
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('ORGANIZATION_SCOPE_DENIED');
    }
  });

  it('preserves commander assign on incidents and denies land_officer there', () => {
    const commander = landUser('commander-a', ['commander'], 'ou-a');
    const incident: ResourceRef = {
      resourceType: 'Incident',
      resourceId: 'inc-001',
      organizationId: 'ou-a',
    };
    expect(
      evaluatePolicy({
        user: commander,
        resource: incident,
        action: 'assign',
        assignments: [],
      }).allowed,
    ).toBe(true);
    const officer = landUser('officer-a', ['land_officer'], 'ou-a');
    expect(
      evaluatePolicy({
        user: officer,
        resource: incident,
        action: 'assign',
        assignments: [],
      }).allowed,
    ).toBe(false);
  });
});

describe('LND-04 land read and mutate policy', () => {
  it('grants leader same-unit read without assignment and denies cross-unit', () => {
    const leader = landUser('leader-a', ['commune_leader'], 'ou-a');
    expect(
      evaluatePolicy({
        user: leader,
        resource: landResource,
        action: 'read',
        assignments: [],
      }).allowed,
    ).toBe(true);
    expect(
      evaluatePolicy({
        user: leader,
        resource: crossResource,
        action: 'read',
        assignments: [],
      }).allowed,
    ).toBe(false);
  });

  it('requires an active land_review assignment for officer read', () => {
    const officer = landUser('officer-a', ['land_officer'], 'ou-a');
    expect(
      evaluatePolicy({
        user: officer,
        resource: landResource,
        action: 'read',
        assignments: [],
      }),
    ).toMatchObject({ allowed: false, reason: 'ASSIGNMENT_REQUIRED' });
    expect(
      evaluatePolicy({
        user: officer,
        resource: landResource,
        action: 'read',
        assignments: [activeLandAssignment()],
      }).allowed,
    ).toBe(true);
    expect(
      evaluatePolicy({
        user: officer,
        resource: landResource,
        action: 'read',
        assignments: [{ ...activeLandAssignment(), status: 'revoked' }],
      }).allowed,
    ).toBe(false);
  });

  it('requires an active assignment for officer mutate and denies leader mutate', () => {
    const officer = landUser('officer-a', ['land_officer'], 'ou-a');
    expect(
      evaluatePolicy({
        user: officer,
        resource: landResource,
        action: 'mutate',
        assignments: [],
      }),
    ).toMatchObject({ allowed: false, reason: 'ASSIGNMENT_REQUIRED' });
    expect(
      evaluatePolicy({
        user: officer,
        resource: landResource,
        action: 'mutate',
        assignments: [activeLandAssignment()],
      }).allowed,
    ).toBe(true);

    const leader = landUser('leader-a', ['commune_leader'], 'ou-a');
    expect(
      evaluatePolicy({
        user: leader,
        resource: landResource,
        action: 'mutate',
        assignments: [],
      }).allowed,
    ).toBe(false);
    expect(
      evaluatePolicy({
        user: leader,
        resource: landResource,
        action: 'mutate',
        assignments: [activeLandAssignment()],
      }).allowed,
    ).toBe(false);
  });

  it('denies cross-unit officer even with a same-resource assignment', () => {
    const officerB = landUser('officer-b', ['land_officer'], 'ou-b');
    expect(
      evaluatePolicy({
        user: officerB,
        resource: landResource,
        action: 'read',
        assignments: [activeLandAssignment('ou-a')],
      }).allowed,
    ).toBe(false);
    expect(
      evaluatePolicy({
        user: officerB,
        resource: landResource,
        action: 'mutate',
        assignments: [activeLandAssignment('ou-a')],
      }).allowed,
    ).toBe(false);
  });
});

describe('LND-04 land party sensitive-read policy (repair)', () => {
  const landPartySameOU: ResourceRef = {
    resourceType: 'LandParty',
    resourceId: '*',
    organizationId: 'ou-a',
  };
  const landPartyCrossOU: ResourceRef = {
    resourceType: 'LandParty',
    resourceId: '*',
    organizationId: 'ou-b',
  };

  it('allows same-OU land_officer and commune_leader read_sensitive without assignment', () => {
    const officer = landUser('officer-a', ['land_officer'], 'ou-a');
    expect(
      evaluatePolicy({
        user: officer,
        resource: landPartySameOU,
        action: 'read_sensitive',
        assignments: [],
      }),
    ).toMatchObject({ allowed: true, reason: 'ALLOWED' });
    const leader = landUser('leader-a', ['commune_leader'], 'ou-a');
    expect(
      evaluatePolicy({
        user: leader,
        resource: landPartySameOU,
        action: 'read_sensitive',
        assignments: [],
      }),
    ).toMatchObject({ allowed: true, reason: 'ALLOWED' });
  });

  it('denies cross-OU and missing-OU LandParty sensitive reads fail-closed', () => {
    const officer = landUser('officer-a', ['land_officer'], 'ou-a');
    expect(
      evaluatePolicy({
        user: officer,
        resource: landPartyCrossOU,
        action: 'read_sensitive',
        assignments: [],
      }),
    ).toMatchObject({ allowed: false, reason: 'ORGANIZATION_SCOPE_DENIED' });
    const leaderB = landUser('leader-b', ['commune_leader'], 'ou-b');
    expect(
      evaluatePolicy({
        user: leaderB,
        resource: landPartySameOU,
        action: 'read_sensitive',
        assignments: [],
      }).allowed,
    ).toBe(false);
    const missingUserOU = landUser('officer-a', ['land_officer'], 'ou-a');
    delete (missingUserOU as { organizationUnitId?: string })
      .organizationUnitId;
    expect(
      evaluatePolicy({
        user: missingUserOU,
        resource: landPartySameOU,
        action: 'read_sensitive',
        assignments: [],
      }).allowed,
    ).toBe(false);
    expect(
      evaluatePolicy({
        user: officer,
        resource: { resourceType: 'LandParty', resourceId: '*' },
        action: 'read_sensitive',
        assignments: [],
      }).allowed,
    ).toBe(false);
  });

  it('fails closed for other roles on LandParty and preserves generic assignment requirement', () => {
    const citizen = landUser('citizen-a', ['citizen'], 'ou-a');
    expect(
      evaluatePolicy({
        user: citizen,
        resource: landPartySameOU,
        action: 'read_sensitive',
        assignments: [],
      }).allowed,
    ).toBe(false);
    const fieldOfficer = landUser('field-a', ['field_officer'], 'ou-a');
    expect(
      evaluatePolicy({
        user: fieldOfficer,
        resource: landPartySameOU,
        action: 'read_sensitive',
        assignments: [],
      }).allowed,
    ).toBe(false);
    const commander = landUser('commander-a', ['commander'], 'ou-a');
    expect(
      evaluatePolicy({
        user: commander,
        resource: landPartySameOU,
        action: 'read_sensitive',
        assignments: [],
      }),
    ).toMatchObject({ allowed: false, reason: 'ASSIGNMENT_REQUIRED' });
    const officer = landUser('officer-a', ['land_officer'], 'ou-a');
    const incident: ResourceRef = {
      resourceType: 'Incident',
      resourceId: 'inc-001',
      organizationId: 'ou-a',
    };
    expect(
      evaluatePolicy({
        user: officer,
        resource: incident,
        action: 'read_sensitive',
        assignments: [],
      }).allowed,
    ).toBe(false);
  });

  it('does not weaken land_review authorization on LandChangeApplication', () => {
    const officer = landUser('officer-a', ['land_officer'], 'ou-a');
    expect(
      evaluatePolicy({
        user: officer,
        resource: landResource,
        action: 'read_sensitive',
        assignments: [],
      }),
    ).toMatchObject({ allowed: false, reason: 'ASSIGNMENT_REQUIRED' });
    expect(
      evaluatePolicy({
        user: officer,
        resource: landResource,
        action: 'mutate',
        assignments: [],
      }),
    ).toMatchObject({ allowed: false, reason: 'ASSIGNMENT_REQUIRED' });
  });
});
