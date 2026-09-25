import { describe, expect, it } from 'vitest';

import {
  ASSIGNMENT_TASKS,
  ROLE_BASE_CAPABILITIES,
  ROLE_CATALOG,
  TASK_ALLOWED_ROLES,
  TASK_CAPABILITIES,
  isTaskCompatibleWithRoles,
} from '@/modules/identity/contracts';
import { evaluatePolicy } from '@/modules/identity/authorization';
import type { IdentityUser, ResourceRef } from '@/modules/identity/contracts';

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
});
