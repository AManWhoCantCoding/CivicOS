import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AccessDenied } from '@/components/identity/AccessDenied';
import {
  FEATURES,
  NAVIGATION_EXCLUDED_FEATURE_IDS,
  canEnterFeature,
  visibleFeatures,
  visibleNavigationFeatures,
  type AssignmentScope,
  type ModuleId,
  type SessionScope,
} from '@/components/navigation/feature-registry';
import {
  buildWorkspaceProjection,
  hasNavigableFeature,
} from '@/components/navigation/workspace-registry';
import { RoleWorkspaceView } from '@/components/workspace/RoleWorkspace';
import { ROLE_CATALOG, TASK_ALLOWED_ROLES } from '@/modules/identity/contracts';

function session(
  id: string,
  roles: string[],
  organizationUnitId = 'ou-a',
): NonNullable<SessionScope> {
  return { id, roles, organizationUnitId };
}

function assignment(
  task: string,
  overrides: Partial<AssignmentScope> = {},
): AssignmentScope {
  return { task, status: 'active', ...overrides };
}

const NAV_HIDDEN = new Set<string>([...NAVIGATION_EXCLUDED_FEATURE_IDS]);

const MATRIX_ROLES = [
  'commander',
  'superior_commander',
  'duty_officer',
  'field_officer',
  'office_officer',
  'village_officer',
  'superior_officer',
  'land_officer',
  'commune_leader',
] as const;

// Contract-visible navigation IDs per role. Task-gated fixtures use an active
// in-scope assignment for the session user; bypass roles use no assignment.
const EXPECTED_NAVIGATION: Record<string, string[]> = {
  commander: [
    'incident-assignment',
    'vehicle-registry',
    'vehicle-observation',
    'identity-assignments',
    'identity-users',
    'map-workspace',
  ],
  superior_commander: [
    'incident-assignment',
    'vehicle-registry',
    'vehicle-observation',
    'identity-assignments',
    'map-workspace',
  ],
  duty_officer: ['identity-assignments', 'map-workspace'],
  field_officer: [
    'vehicle-observation',
    'vehicle-verification',
    'identity-assignments',
    'map-workspace',
  ],
  office_officer: ['identity-assignments', 'map-workspace'],
  village_officer: [
    'vehicle-observation',
    'identity-assignments',
    'map-workspace',
  ],
  superior_officer: ['identity-assignments', 'map-workspace'],
  land_officer: [
    'land-parcel-workspace',
    'land-application-queue',
    'land-application-create',
  ],
  commune_leader: ['land-parcel-workspace', 'land-application-queue'],
};

function assignmentsFor(role: string, userId: string): AssignmentScope[] {
  if (role === 'field_officer') {
    return [
      assignment('vehicle_verification', {
        assigneeUserId: userId,
        organizationId: 'ou-a',
      }),
    ];
  }
  if (role === 'land_officer') {
    return [
      assignment('land_review', {
        assigneeUserId: userId,
        organizationId: 'ou-a',
      }),
    ];
  }
  return [];
}

function deniedMarkup(roles: string[]): string {
  return renderToStaticMarkup(
    createElement(RoleWorkspaceView, {
      session: session(`${roles[0] ?? 'user'}-1`, roles),
      assignments: [],
      sessionState: 'ready',
      assignmentState: 'ready',
      online: true,
      onRetry: () => {},
    }),
  );
}

describe('T-006 role and Assignment regression', () => {
  it.each([...MATRIX_ROLES])(
    'projects only permitted features for %s',
    (role) => {
      expect(ROLE_CATALOG).toContain(role);
      const userId = `${role}-1`;
      const fixture = session(userId, [role]);
      const assignments = assignmentsFor(role, userId);
      const projection = buildWorkspaceProjection(fixture, assignments);
      const ids = projection.features.map((feature) => feature.id);

      // Exact contract-visible set: no more, no fewer.
      expect(ids).toEqual(EXPECTED_NAVIGATION[role]);
      // Every projected feature exists in the registry (no invented feature).
      const registryIds = new Set(FEATURES.map((feature) => feature.id));
      for (const id of ids) expect(registryIds.has(id)).toBe(true);
      // Navigation-only exclusions never appear in the projection.
      for (const hidden of NAV_HIDDEN) expect(ids).not.toContain(hidden);
      // Projection equals the union of per-module navigation seams.
      const union = (
        Object.keys(
          Object.fromEntries(
            FEATURES.map((feature) => [feature.moduleId, true]),
          ),
        ) as ModuleId[]
      ).flatMap((moduleId) =>
        visibleNavigationFeatures(moduleId, fixture, assignments),
      );
      expect(ids).toEqual(union.map((feature) => feature.id));
      // Navigation derives from visibleFeatures minus the exclusion set.
      for (const moduleId of [
        'incidents',
        'inspections',
        'vehicles',
        'identity',
        'map',
        'residents',
        'land',
      ] as const) {
        expect(
          visibleNavigationFeatures(moduleId, fixture, assignments).map(
            (feature) => feature.id,
          ),
        ).toEqual(
          visibleFeatures(moduleId, fixture, assignments)
            .filter((feature) => !NAV_HIDDEN.has(feature.id))
            .map((feature) => feature.id),
        );
      }
      // Modules group by FEATURES.moduleId without duplicates or empties.
      const byId = new Map(FEATURES.map((feature) => [feature.id, feature]));
      expect(new Set(ids).size).toBe(ids.length);
      for (const entry of projection.modules) {
        expect(entry.features.length).toBeGreaterThan(0);
        for (const feature of entry.features) {
          expect(byId.get(feature.id)?.moduleId).toBe(entry.module.id);
        }
      }
    },
  );

  it('keeps task and bypass semantics for land and command fixtures', () => {
    // land_officer without an assignment keeps only the task-free create form.
    const officer = session('officer-1', ['land_officer']);
    expect(
      buildWorkspaceProjection(officer, []).features.map(
        (feature) => feature.id,
      ),
    ).toEqual(['land-application-create']);

    // commune_leader bypasses land_review without any assignment, and the
    // bypass does not extend to the land_officer-only create form.
    const leader = session('leader-1', ['commune_leader']);
    expect(
      buildWorkspaceProjection(leader, []).features.map(
        (feature) => feature.id,
      ),
    ).toEqual(['land-parcel-workspace', 'land-application-queue']);
    expect(TASK_ALLOWED_ROLES['land_review']).toEqual(['land_officer']);
    expect(TASK_ALLOWED_ROLES['land_review']).not.toContain('commune_leader');

    // Commander bypasses task gates, so a hidden task-gated entry stays
    // enterable while navigation still omits it.
    const commander = session('commander-1', ['commander']);
    expect(canEnterFeature('incident-queue', commander, [])).toBe(true);
    expect(
      visibleNavigationFeatures('incidents', commander, []).some(
        (feature) => feature.id === 'incident-queue',
      ),
    ).toBe(false);

    // Bypass does not leak across modules: commune_leader gains no incident
    // entry and commander gains no land navigation.
    expect(canEnterFeature('incident-assignment', leader, [])).toBe(false);
    expect(
      buildWorkspaceProjection(commander, [])
        .features.map((feature) => feature.id)
        .filter((id) => id.startsWith('land-')),
    ).toEqual([]);
  });

  it('fails closed for revoked, wrong-user and wrong-organization assignments', () => {
    const field = session('field-1', ['field_officer']);
    const inScope = [
      assignment('vehicle_verification', {
        assigneeUserId: 'field-1',
        organizationId: 'ou-a',
      }),
    ];
    const navIds = (assignments: AssignmentScope[]) =>
      visibleNavigationFeatures('vehicles', field, assignments).map(
        (feature) => feature.id,
      );

    // Active in-scope assignment opens the task-gated navigation feature.
    expect(navIds(inScope)).toContain('vehicle-verification');
    expect(canEnterFeature('vehicle-verification', field, inScope)).toBe(true);
    expect(
      buildWorkspaceProjection(field, inScope).features.map(
        (feature) => feature.id,
      ),
    ).toContain('vehicle-verification');

    // Every other variant fails closed on navigation and direct entry alike.
    const closed: AssignmentScope[][] = [
      [],
      [{ task: 'vehicle_verification', status: 'revoked' }],
      [
        assignment('vehicle_verification', {
          assigneeUserId: 'field-2',
          organizationId: 'ou-a',
        }),
      ],
      [
        assignment('vehicle_verification', {
          assigneeUserId: 'field-1',
          organizationId: 'ou-b',
        }),
      ],
    ];
    for (const assignments of closed) {
      expect(navIds(assignments)).not.toContain('vehicle-verification');
      expect(canEnterFeature('vehicle-verification', field, assignments)).toBe(
        false,
      );
      expect(
        buildWorkspaceProjection(field, assignments).features.map(
          (feature) => feature.id,
        ),
      ).not.toContain('vehicle-verification');
    }

    // Same fail-closed shape for a land task gate.
    const officer = session('officer-1', ['land_officer']);
    const landInScope = [
      assignment('land_review', {
        assigneeUserId: 'officer-1',
        organizationId: 'ou-a',
      }),
    ];
    expect(canEnterFeature('land-parcel-workspace', officer, landInScope)).toBe(
      true,
    );
    for (const assignments of [
      [] as AssignmentScope[],
      [{ task: 'land_review', status: 'revoked' }] as AssignmentScope[],
      [
        assignment('land_review', { assigneeUserId: 'officer-2' }),
      ] as AssignmentScope[],
      [
        assignment('land_review', {
          assigneeUserId: 'officer-1',
          organizationId: 'ou-b',
        }),
      ] as AssignmentScope[],
    ]) {
      expect(
        canEnterFeature('land-parcel-workspace', officer, assignments),
      ).toBe(false);
      expect(
        visibleNavigationFeatures('land', officer, assignments).map(
          (feature) => feature.id,
        ),
      ).not.toContain('land-parcel-workspace');
    }

    // Hidden task-gated entry follows the same policy even though navigation
    // never shows it.
    expect(
      canEnterFeature('incident-queue', field, [
        assignment('incident_verification', {
          assigneeUserId: 'field-1',
          organizationId: 'ou-a',
        }),
      ]),
    ).toBe(true);
    expect(canEnterFeature('incident-queue', field, [])).toBe(false);
    expect(
      canEnterFeature('incident-queue', field, [
        { task: 'incident_verification', status: 'revoked' },
      ]),
    ).toBe(false);
  });

  it('deduplicates multi-role feature union', () => {
    const multi = session('multi-1', ['field_officer', 'office_officer']);
    const union = buildWorkspaceProjection(multi, []);
    const ids = union.features.map((feature) => feature.id);
    expect(ids).toEqual([...new Set(ids)]);

    // Union covers each single-role navigation set exactly once.
    const fieldOnly = visibleNavigationFeatures(
      'vehicles',
      session('f-1', ['field_officer']),
      [],
    ).map((feature) => feature.id);
    for (const id of fieldOnly) expect(ids).toContain(id);
    const officeIdentity = visibleNavigationFeatures(
      'identity',
      session('o-1', ['office_officer']),
      [],
    ).map((feature) => feature.id);
    for (const id of officeIdentity) expect(ids).toContain(id);

    // Shared features are not duplicated even though both roles can see them.
    expect(ids.filter((id) => id === 'identity-assignments')).toHaveLength(1);
    expect(ids.filter((id) => id === 'map-workspace')).toHaveLength(1);

    // Union does not elevate beyond existing role/task rules.
    expect(ids).not.toContain('vehicle-verification');
    expect(canEnterFeature('vehicle-verification', multi, [])).toBe(false);
    expect(canEnterFeature('incident-queue', multi, [])).toBe(false);
    const dutyField = session('df-1', ['duty_officer', 'field_officer']);
    expect(
      buildWorkspaceProjection(dutyField, [])
        .features.map((feature) => feature.id)
        .filter((id) => id.startsWith('land-')),
    ).toEqual([]);
    // Distinct features sharing one href stay distinct (dedupe is by ID).
    const commander = buildWorkspaceProjection(
      session('commander-1', ['commander']),
      [],
    );
    expect(commander.features.map((feature) => feature.id)).toContain(
      'incident-assignment',
    );
    expect(commander.features.map((feature) => feature.id)).toContain(
      'identity-assignments',
    );
  });

  it('renders AccessDenied without inventory for no-feature roles', () => {
    for (const role of ['system_operator', 'supervisor', 'citizen'] as const) {
      const fixture = session(`${role}-1`, [role]);
      // Even with assignments present, no-feature roles stay empty.
      const withAssignments = buildWorkspaceProjection(fixture, [
        assignment('incident_verification', {
          assigneeUserId: `${role}-1`,
          organizationId: 'ou-a',
        }),
        assignment('land_review', {
          assigneeUserId: `${role}-1`,
          organizationId: 'ou-a',
        }),
      ]);
      expect(withAssignments).toEqual({ modules: [], features: [] });
      expect(hasNavigableFeature(fixture, [])).toBe(false);

      const html = deniedMarkup([role]);
      expect(html).toContain('Không có quyền truy cập');
      expect(html).not.toContain('<a href');
      expect(html).not.toContain('Mở phân hệ');
      for (const label of [
        'Incident',
        'Inspection',
        'Phương tiện',
        'Identity',
        'Bản đồ',
        'Cư dân đặc biệt',
        'Đất đai',
      ]) {
        expect(html).not.toContain(label);
      }
      for (const inventory of [
        'incident_verification',
        'land_review',
        'ou-a',
        'Assignment',
      ]) {
        expect(html).not.toContain(inventory);
      }
    }

    // The no-feature state reuses the shared AccessDenied seam.
    const denied = renderToStaticMarkup(createElement(AccessDenied, {}));
    expect(denied).toContain('Không có quyền truy cập');
    expect(denied).toContain(
      'Hồ sơ này không thuộc nhiệm vụ hoặc phạm vi chỉ huy của tài khoản hiện tại.',
    );
  });
});
