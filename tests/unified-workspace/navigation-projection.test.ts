import { describe, expect, it } from 'vitest';

import {
  FEATURES,
  NAVIGATION_EXCLUDED_FEATURE_IDS,
  canEnterFeature,
  visibleFeatures,
  visibleNavigationFeatures,
  type AssignmentScope,
  type SessionScope,
} from '@/components/navigation/feature-registry';
import {
  buildWorkspaceProjection,
  hasNavigableFeature,
} from '@/components/navigation/workspace-registry';

const HIDDEN_IDS = [
  'resident-list',
  'resident-reports',
  'incident-queue',
  'incident-intake',
  'inspection-catalogue',
  'inspection-schedule',
  'inspection-workqueue',
];

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

const ALL_TASK_ASSIGNMENTS: AssignmentScope[] = [
  assignment('incident_verification', {
    assigneeUserId: 'commander-1',
    organizationId: 'ou-a',
  }),
  assignment('inspection_fieldwork', {
    assigneeUserId: 'commander-1',
    organizationId: 'ou-a',
  }),
  assignment('vehicle_verification', {
    assigneeUserId: 'commander-1',
    organizationId: 'ou-a',
  }),
  assignment('resident_followup', {
    assigneeUserId: 'commander-1',
    organizationId: 'ou-a',
  }),
  assignment('land_review', {
    assigneeUserId: 'commander-1',
    organizationId: 'ou-a',
  }),
];

describe('T-001 navigation projection', () => {
  it('filters role and active in-scope assignments using existing policy', () => {
    const officer = session('officer-1', ['land_officer']);
    const inScope = [
      assignment('land_review', {
        assigneeUserId: 'officer-1',
        organizationId: 'ou-a',
      }),
    ];
    expect(
      visibleNavigationFeatures('land', officer, inScope).map((f) => f.id),
    ).toEqual(
      expect.arrayContaining([
        'land-parcel-workspace',
        'land-application-queue',
      ]),
    );

    // Revoked assignment fails closed for task-gated features.
    // (land-application-create needs no task, so it stays visible.)
    const revoked: AssignmentScope[] = [
      { task: 'land_review', status: 'revoked', assigneeUserId: 'officer-1' },
    ];
    const revokedIds = visibleNavigationFeatures('land', officer, revoked).map(
      (f) => f.id,
    );
    expect(revokedIds).not.toContain('land-parcel-workspace');
    expect(revokedIds).not.toContain('land-application-queue');

    // Assignment for another user does not open the feature.
    const otherUser = [
      assignment('land_review', {
        assigneeUserId: 'officer-2',
        organizationId: 'ou-a',
      }),
    ];
    const otherUserIds = visibleNavigationFeatures(
      'land',
      officer,
      otherUser,
    ).map((f) => f.id);
    expect(otherUserIds).not.toContain('land-parcel-workspace');
    expect(otherUserIds).not.toContain('land-application-queue');

    // Assignment in another organization does not open the feature.
    const otherOrg = [
      assignment('land_review', {
        assigneeUserId: 'officer-1',
        organizationId: 'ou-b',
      }),
    ];
    const otherOrgIds = visibleNavigationFeatures(
      'land',
      officer,
      otherOrg,
    ).map((f) => f.id);
    expect(otherOrgIds).not.toContain('land-parcel-workspace');
    expect(otherOrgIds).not.toContain('land-application-queue');
  });

  it('unions multi-role sessions and keeps bypass-role semantics', () => {
    // commune_leader bypasses land_review without any assignment.
    const leader = session('leader-1', ['commune_leader']);
    expect(
      visibleNavigationFeatures('land', leader, []).map((f) => f.id),
    ).toEqual(
      expect.arrayContaining([
        'land-parcel-workspace',
        'land-application-queue',
      ]),
    );

    // Bypass does not leak across modules: leader sees no incident task feature.
    expect(
      visibleNavigationFeatures('incidents', leader, []).map((f) => f.id),
    ).not.toContain('incident-assignment');

    // Multi-role union: field + office roles combine their navigation sets.
    const multi = session(
      'multi-1',
      ['field_officer', 'office_officer'],
      'ou-a',
    );
    const fieldOnly = new Set(
      visibleNavigationFeatures(
        'vehicles',
        session('f-1', ['field_officer']),
        [],
      ).map((f) => f.id),
    );
    const union = visibleNavigationFeatures('vehicles', multi, []).map(
      (f) => f.id,
    );
    for (const id of fieldOnly) expect(union).toContain(id);
    expect(union).toEqual([...new Set(union)]);
  });

  it('excludes exactly the seven approved navigation feature IDs', () => {
    expect([...NAVIGATION_EXCLUDED_FEATURE_IDS].sort()).toEqual(
      [...HIDDEN_IDS].sort(),
    );
    const commander = session('commander-1', [
      'commander',
      'superior_commander',
      'duty_officer',
      'field_officer',
      'office_officer',
      'village_officer',
      'superior_officer',
      'land_officer',
      'commune_leader',
    ]);
    const projection = buildWorkspaceProjection(
      commander,
      ALL_TASK_ASSIGNMENTS,
    );
    const ids = projection.features.map((f) => f.id);
    for (const hidden of HIDDEN_IDS) expect(ids).not.toContain(hidden);
    // Hidden definitions still exist in the registry (not deleted).
    for (const hidden of HIDDEN_IDS) {
      expect(FEATURES.some((f) => f.id === hidden)).toBe(true);
    }
  });

  it('keeps excluded feature definitions available to direct entry authorization', () => {
    const commander = session('commander-1', ['commander']);
    // Commander bypasses task gates, so hidden IDs stay enterable directly.
    for (const hidden of HIDDEN_IDS) {
      expect(canEnterFeature(hidden, commander, [])).toBe(true);
    }
    // Task-gated hidden feature stays enterable with an active assignment.
    const fieldOfficer = session('field-1', ['field_officer']);
    const gated = [
      assignment('incident_verification', {
        assigneeUserId: 'field-1',
        organizationId: 'ou-a',
      }),
    ];
    expect(canEnterFeature('incident-queue', fieldOfficer, gated)).toBe(true);
    expect(
      visibleNavigationFeatures('incidents', fieldOfficer, gated).some(
        (f) => f.id === 'incident-queue',
      ),
    ).toBe(false);
  });

  it('omits modules with no eligible navigation feature', () => {
    // land_officer without assignment keeps only the task-free
    // land-application-create; task-gated land features drop out and the
    // inspections module (no eligible feature) is absent entirely.
    const officer = session('officer-1', ['land_officer']);
    const projection = buildWorkspaceProjection(officer, []);
    const landEntry = projection.modules.find(
      (entry) => entry.module.id === 'land',
    );
    expect(landEntry?.features.map((f) => f.id)).toEqual([
      'land-application-create',
    ]);
    expect(
      projection.modules.some((entry) => entry.module.id === 'inspections'),
    ).toBe(false);
    expect(
      projection.modules.some((entry) => entry.module.id === 'residents'),
    ).toBe(false);

    // Commander projection contains no empty module.
    const commander = session('commander-1', ['commander']);
    const full = buildWorkspaceProjection(commander, []);
    for (const entry of full.modules) {
      expect(entry.features.length).toBeGreaterThan(0);
    }
    expect(full.modules.every((entry) => entry.features.length > 0)).toBe(true);
  });

  it('groups features by FEATURES.moduleId without duplicates', () => {
    const commander = session('commander-1', [
      'commander',
      'superior_commander',
      'field_officer',
      'office_officer',
      'land_officer',
      'commune_leader',
    ]);
    const landAssignments = [
      assignment('land_review', {
        assigneeUserId: 'commander-1',
        organizationId: 'ou-a',
      }),
    ];
    const projection = buildWorkspaceProjection(commander, landAssignments);
    const ids = projection.features.map((f) => f.id);
    expect(ids).toEqual([...new Set(ids)]);

    const byId = new Map(FEATURES.map((f) => [f.id, f.moduleId]));
    for (const entry of projection.modules) {
      for (const feature of entry.features) {
        expect(byId.get(feature.id)).toBe(entry.module.id);
      }
    }

    const findModule = (featureId: string) =>
      projection.modules.find((entry) =>
        entry.features.some((f) => f.id === featureId),
      )?.module.id;
    // AC-5 registry-correct grouping.
    expect(findModule('incident-assignment')).toBe('incidents');
    expect(findModule('vehicle-observation')).toBe('vehicles');
    expect(findModule('identity-assignments')).toBe('identity');
  });

  it('returns an empty projection for no-feature roles and null sessions', () => {
    const citizen = session('citizen-1', ['citizen']);
    expect(buildWorkspaceProjection(citizen, ALL_TASK_ASSIGNMENTS)).toEqual({
      modules: [],
      features: [],
    });
    expect(buildWorkspaceProjection(null, ALL_TASK_ASSIGNMENTS)).toEqual({
      modules: [],
      features: [],
    });
    expect(hasNavigableFeature(citizen, [])).toBe(false);
  });

  it('derives navigation from visibleFeatures semantics without a second policy', () => {
    const commander = session('commander-1', ['commander']);
    for (const moduleId of [
      'incidents',
      'inspections',
      'vehicles',
      'identity',
      'map',
      'residents',
      'land',
    ] as const) {
      const expected = visibleFeatures(moduleId, commander, []).filter(
        (f) => !HIDDEN_IDS.includes(f.id),
      );
      expect(visibleNavigationFeatures(moduleId, commander, [])).toEqual(
        expected,
      );
    }
  });

  it('preserves direct routes, hrefs and entry authorization behavior', () => {
    const hrefById = new Map(FEATURES.map((f) => [f.id, f.href]));
    expect(hrefById.get('inspection-schedule')).toBe(
      '/inspections/establishments#inspection-schedule',
    );
    expect(hrefById.get('incident-intake')).toBe('/intake');
    // Entry authorization still sees hidden + visible IDs alike.
    const commander = session('commander-1', ['commander']);
    expect(canEnterFeature('incident-assignment', commander, [])).toBe(true);
    expect(canEnterFeature('unknown-feature-id', commander, [])).toBe(false);
    expect(canEnterFeature('incident-queue', null, [])).toBe(false);
  });
});
