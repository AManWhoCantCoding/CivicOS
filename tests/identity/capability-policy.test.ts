import { describe, expect, it } from 'vitest';

import {
  ASSIGNMENT_TASKS,
  ROLE_BASE_CAPABILITIES,
  ROLE_CATALOG,
  TASK_ALLOWED_ROLES,
  TASK_CAPABILITIES,
  isTaskCompatibleWithRoles,
} from '@/modules/identity/contracts';
import {
  evaluatePolicy,
  evaluateResidentActivityPolicy,
} from '@/modules/identity/authorization';
import type {
  IdentityUser,
  ResourceRef,
  RoleName,
} from '@/modules/identity/contracts';

function user(
  id: string,
  roles: IdentityUser['roles'],
  organizationUnitId = 'unit-a',
): IdentityUser {
  return {
    id,
    email: `${id}@civicos.local`,
    name: id,
    roles,
    organizationUnitId,
  };
}

const resource: ResourceRef = {
  resourceType: 'Incident',
  resourceId: 'res-1',
  organizationId: 'unit-a',
};

const residentActivityRoles: readonly RoleName[] = [
  'commander',
  'duty_officer',
  'field_officer',
  'office_officer',
  'village_officer',
];
const residentActivityResource: ResourceRef = {
  resourceType: 'SubjectManagementRecord',
  resourceId: 'record-1',
  organizationId: 'unit-a',
};
type ResidentActivityAssignment = NonNullable<
  Parameters<typeof evaluateResidentActivityPolicy>[0]['assignment']
>;

function residentActivityAssignment(
  overrides: Partial<ResidentActivityAssignment> = {},
): ResidentActivityAssignment {
  return {
    id: 'assignment-1',
    assigneeUserId: 'actor-1',
    task: 'resident_followup',
    resourceType: 'SubjectManagementRecord',
    resourceId: 'record-1',
    status: 'active',
    organizationId: 'unit-a',
    ...overrides,
  };
}

function evaluateResidentActivity(
  input: {
    role?: RoleName;
    assignment?: ResidentActivityAssignment | null;
    assignmentId?: string | null;
    actorUnit?: string | null;
    recordUnit?: string | null;
    resourceType?: string;
  } = {},
) {
  const actor = {
    ...user('actor-1', [input.role ?? 'field_officer']),
    organizationUnitId:
      input.actorUnit === null ? undefined : (input.actorUnit ?? 'unit-a'),
  };
  return evaluateResidentActivityPolicy({
    user: actor,
    resource: {
      ...residentActivityResource,
      resourceType: input.resourceType ?? residentActivityResource.resourceType,
      organizationId:
        input.recordUnit === null ? undefined : (input.recordUnit ?? 'unit-a'),
    },
    assignmentId:
      input.assignmentId === null
        ? undefined
        : (input.assignmentId ?? 'assignment-1'),
    assignment:
      input.assignment === null
        ? undefined
        : (input.assignment ?? residentActivityAssignment()),
  });
}

describe('capability policy contract', () => {
  it('recognizes the full role catalog', () => {
    for (const role of [
      'commander',
      'duty_officer',
      'field_officer',
      'office_officer',
      'village_officer',
      'superior_officer',
      'superior_commander',
      'system_operator',
    ] as const) {
      expect(ROLE_CATALOG).toContain(role);
      expect(ROLE_BASE_CAPABILITIES[role]).toBeDefined();
    }
  });

  it('unions multi-role capabilities before assignment and unit scope', () => {
    const multi = user('u-multi', ['field_officer', 'office_officer']);
    expect(
      evaluatePolicy({
        user: multi,
        resource,
        action: 'read',
        assignments: [
          {
            task: 'incident_verification',
            resourceType: 'Incident',
            resourceId: 'res-1',
            status: 'active',
            organizationId: 'unit-a',
          },
        ],
      }).allowed,
    ).toBe(true);
  });

  it('denies business roles without an assignment', () => {
    const field = user('u-field', ['field_officer']);
    expect(
      evaluatePolicy({ user: field, resource, action: 'read', assignments: [] })
        .allowed,
    ).toBe(false);
  });

  it('denies revoked assignments for read, mutate and read_sensitive', () => {
    const field = user('u-field', ['field_officer']);
    for (const action of ['read', 'mutate', 'read_sensitive'] as const) {
      expect(
        evaluatePolicy({
          user: field,
          resource,
          action,
          assignments: [
            {
              task: 'incident_verification',
              resourceType: 'Incident',
              resourceId: 'res-1',
              status: 'revoked',
              organizationId: 'unit-a',
            },
          ],
        }).allowed,
      ).toBe(false);
    }
  });

  it('denies cross-unit resources even when the id is known', () => {
    const field = user('u-field', ['field_officer'], 'unit-a');
    const cross: ResourceRef = {
      resourceType: 'Incident',
      resourceId: 'res-1',
      organizationId: 'unit-b',
    };
    expect(
      evaluatePolicy({
        user: field,
        resource: cross,
        action: 'read',
        assignments: [
          {
            task: 'incident_verification',
            resourceType: 'Incident',
            resourceId: 'res-1',
            status: 'active',
            organizationId: 'unit-a',
          },
        ],
      }).allowed,
    ).toBe(false);
  });

  it('never grants business-data capability to system_operator', () => {
    const ops = user('u-ops', ['system_operator']);
    for (const action of ['read', 'mutate', 'read_sensitive'] as const) {
      expect(
        evaluatePolicy({
          user: ops,
          resource,
          action,
          assignments: [
            {
              task: 'incident_verification',
              resourceType: 'Incident',
              resourceId: 'res-1',
              status: 'active',
              organizationId: 'unit-a',
            },
          ],
        }).allowed,
      ).toBe(false);
    }
  });

  it('grants sensitive reads to business roles but not to system operator', () => {
    const field = user('u-field', ['field_officer']);
    expect(
      evaluatePolicy({
        user: field,
        resource,
        action: 'read_sensitive',
        assignments: [
          {
            task: 'incident_verification',
            resourceType: 'Incident',
            resourceId: 'res-1',
            status: 'active',
            organizationId: 'unit-a',
          },
        ],
      }).allowed,
    ).toBe(true);
    expect(TASK_CAPABILITIES['incident_verification']).toContain(
      'read_sensitive',
    );
  });

  it('rejects incompatible tasks before assignment creation', () => {
    expect(
      isTaskCompatibleWithRoles('incident_verification', ['field_officer']),
    ).toBe(true);
    expect(
      isTaskCompatibleWithRoles('unknown_task_xyz', ['field_officer']),
    ).toBe(false);
    expect(
      isTaskCompatibleWithRoles('incident_verification', ['system_operator']),
    ).toBe(false);
    expect(ASSIGNMENT_TASKS).toContain('incident_verification');
    expect(TASK_ALLOWED_ROLES['incident_verification']).toContain(
      'field_officer',
    );
  });

  it('grants commander assignment-free command-scope read, assign and approve in the same unit', () => {
    const commander = user('u-commander', ['commander']);
    for (const action of ['read', 'assign', 'approve'] as const) {
      expect(
        evaluatePolicy({ user: commander, resource, action, assignments: [] })
          .allowed,
      ).toBe(true);
    }
    const cross: ResourceRef = {
      resourceType: 'Incident',
      resourceId: 'res-1',
      organizationId: 'unit-b',
    };
    for (const action of ['read', 'assign', 'approve'] as const) {
      expect(
        evaluatePolicy({
          user: commander,
          resource: cross,
          action,
          assignments: [],
        }).allowed,
      ).toBe(false);
    }
    const superior = user('u-superior', ['superior_commander']);
    expect(
      evaluatePolicy({
        user: superior,
        resource,
        action: 'read',
        assignments: [],
      }).allowed,
    ).toBe(true);
  });

  it('denies command-scope access when either organization unit is absent or blank', () => {
    const commander = user('u-commander', ['commander']);
    const missingUserUnit = { ...commander, organizationUnitId: undefined };
    const blankUserUnit = { ...commander, organizationUnitId: '  ' };
    const missingResourceUnit = { ...resource, organizationId: undefined };
    const blankResourceUnit = { ...resource, organizationId: '  ' };

    for (const action of ['read', 'assign', 'approve'] as const) {
      for (const [actor, scopedResource] of [
        [missingUserUnit, resource],
        [blankUserUnit, resource],
        [commander, missingResourceUnit],
        [commander, blankResourceUnit],
      ] as const) {
        expect(
          evaluatePolicy({
            user: actor,
            resource: scopedResource,
            action,
            assignments: [],
          }),
        ).toEqual({ allowed: false, reason: 'ORGANIZATION_SCOPE_DENIED' });
      }
    }
  });

  it('denies assignment-based reads when either organization unit is absent or blank', () => {
    const field = user('u-field', ['field_officer']);
    const activeAssignment = {
      task: 'incident_verification',
      resourceType: 'Incident',
      resourceId: 'res-1',
      status: 'active',
      organizationId: 'unit-a',
    } as const;

    for (const [actor, scopedResource] of [
      [{ ...field, organizationUnitId: undefined }, resource],
      [{ ...field, organizationUnitId: '  ' }, resource],
      [field, { ...resource, organizationId: undefined }],
      [field, { ...resource, organizationId: '  ' }],
    ] as const) {
      expect(
        evaluatePolicy({
          user: actor,
          resource: scopedResource,
          action: 'read',
          assignments: [activeAssignment],
        }),
      ).toEqual({ allowed: false, reason: 'ORGANIZATION_SCOPE_DENIED' });
    }
  });

  it('requires an active compatible assignment for commander mutate and read_sensitive', () => {
    const commander = user('u-commander', ['commander']);
    const compatible = {
      task: 'incident_verification',
      resourceType: 'Incident',
      resourceId: 'res-1',
      status: 'active',
      organizationId: 'unit-a',
    } as const;
    for (const action of ['mutate', 'read_sensitive'] as const) {
      expect(
        evaluatePolicy({
          user: commander,
          resource,
          action,
          assignments: [],
        }).allowed,
      ).toBe(false);
      expect(
        evaluatePolicy({
          user: commander,
          resource,
          action,
          assignments: [compatible],
        }).allowed,
      ).toBe(true);
      expect(
        evaluatePolicy({
          user: commander,
          resource,
          action,
          assignments: [{ ...compatible, status: 'revoked' }],
        }).allowed,
      ).toBe(false);
    }
    const cross: ResourceRef = {
      resourceType: 'Incident',
      resourceId: 'res-1',
      organizationId: 'unit-b',
    };
    expect(
      evaluatePolicy({
        user: commander,
        resource: cross,
        action: 'mutate',
        assignments: [compatible],
      }).allowed,
    ).toBe(false);
    const superior = user('u-superior', ['superior_commander']);
    expect(
      evaluatePolicy({
        user: superior,
        resource,
        action: 'mutate',
        assignments: [],
      }).allowed,
    ).toBe(false);
  });

  it('scopes commander assign and approve to the same organization unit', () => {
    const commander = user('u-commander', ['commander']);
    expect(
      evaluatePolicy({
        user: commander,
        resource,
        action: 'approve',
        assignments: [],
      }).allowed,
    ).toBe(true);
    const cross: ResourceRef = {
      resourceType: 'Incident',
      resourceId: 'res-1',
      organizationId: 'unit-b',
    };
    expect(
      evaluatePolicy({
        user: commander,
        resource: cross,
        action: 'approve',
        assignments: [],
      }).allowed,
    ).toBe(false);
    const field = user('u-field', ['field_officer']);
    expect(
      evaluatePolicy({
        user: field,
        resource,
        action: 'approve',
        assignments: [
          {
            task: 'incident_verification',
            resourceType: 'Incident',
            resourceId: 'res-1',
            status: 'active',
            organizationId: 'unit-a',
          },
        ],
      }).allowed,
    ).toBe(false);
  });

  describe('FR-004-03 / D-63 resident.record_activity policy', () => {
    it('allows only the five D-63 roles with an exact active resident-followup assignment', () => {
      for (const role of residentActivityRoles) {
        expect(evaluateResidentActivity({ role }).allowed).toBe(true);
      }
    });

    it('denies every role outside D-63 for resident activity', () => {
      for (const role of [...ROLE_CATALOG, 'supervisor'] as RoleName[]) {
        if (residentActivityRoles.includes(role)) continue;
        expect(evaluateResidentActivity({ role }).allowed).toBe(false);
      }
    });

    it.each([
      ['missing assignment', { assignment: null }],
      ['missing assignment id', { assignmentId: null }],
      [
        'revoked assignment',
        { assignment: residentActivityAssignment({ status: 'revoked' }) },
      ],
      [
        'wrong task',
        {
          assignment: residentActivityAssignment({
            task: 'incident_verification',
          }),
        },
      ],
      [
        'wrong resource type',
        {
          assignment: residentActivityAssignment({ resourceType: 'Incident' }),
        },
      ],
      [
        'wrong resource id',
        { assignment: residentActivityAssignment({ resourceId: 'record-2' }) },
      ],
      [
        'assignment for another actor',
        {
          assignment: residentActivityAssignment({ assigneeUserId: 'actor-2' }),
        },
      ],
      [
        'cross-unit assignment',
        {
          assignment: residentActivityAssignment({ organizationId: 'unit-b' }),
        },
      ],
      ['a different assignment id', { assignmentId: 'assignment-2' }],
    ] as const)('denies %s', (_name, input) => {
      expect(evaluateResidentActivity(input).allowed).toBe(false);
    });

    it.each([
      ['actor', { actorUnit: null }],
      ['record', { recordUnit: null }],
      [
        'assignment',
        {
          assignment: residentActivityAssignment({ organizationId: undefined }),
        },
      ],
      ['empty actor', { actorUnit: '' }],
      ['empty record', { recordUnit: '' }],
      [
        'empty assignment',
        { assignment: residentActivityAssignment({ organizationId: '' }) },
      ],
      ['actor-record mismatch', { actorUnit: 'unit-b' }],
      [
        'assignment-record mismatch',
        {
          assignment: residentActivityAssignment({ organizationId: 'unit-b' }),
        },
      ],
    ])(
      'fails closed when %s organization scope is absent, empty, or different',
      (_name, input) =>
        expect(evaluateResidentActivity(input).allowed).toBe(false),
    );
  });
});
