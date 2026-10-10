import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AccessDenied } from '@/components/identity/AccessDenied';
import {
  FEATURES,
  canEnterFeature,
  visibleNavigationFeatures,
  type AssignmentScope,
  type SessionScope,
} from '@/components/navigation/feature-registry';
import { buildWorkspaceProjection } from '@/components/navigation/workspace-registry';
import { RoleWorkspaceView } from '@/components/workspace/RoleWorkspace';
import { ROLE_CATALOG, TASK_ALLOWED_ROLES } from '@/modules/identity/contracts';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

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

const ALLOWED_FEATURE_KEYS = new Set([
  'id',
  'moduleId',
  'label',
  'href',
  'visibleRoles',
  'requiresTask',
  'bypassTaskRoles',
  'activeExact',
  'activePrefixes',
]);

const ALLOWED_MODULE_KEYS = new Set(['id', 'label', 'homeHref', 'description']);

function workspaceMarkup(
  sessionId: string,
  roles: string[],
  organizationUnitId: string,
  assignments: AssignmentScope[],
): string {
  return renderToStaticMarkup(
    createElement(RoleWorkspaceView, {
      session: session(sessionId, roles, organizationUnitId),
      assignments,
      sessionState: 'ready',
      assignmentState: 'ready',
      online: true,
      onRetry: () => {},
    }),
  );
}

describe('T-006 privacy and masked display regression', () => {
  it('exposes only registry metadata in workspace projection', () => {
    expect(ROLE_CATALOG).toContain('commander');
    expect(ROLE_CATALOG).toContain('land_officer');
    expect(TASK_ALLOWED_ROLES['incident_verification']).toContain(
      'field_officer',
    );

    const fixtures: Array<{
      roles: string[];
      assignments: AssignmentScope[];
    }> = [
      { roles: ['commander'], assignments: [] },
      {
        roles: ['field_officer'],
        assignments: [
          assignment('vehicle_verification', {
            assigneeUserId: 'field-1',
            organizationId: 'ou-a',
          }),
        ],
      },
      {
        roles: ['land_officer'],
        assignments: [
          assignment('land_review', {
            assigneeUserId: 'officer-1',
            organizationId: 'ou-a',
          }),
        ],
      },
      { roles: ['commune_leader'], assignments: [] },
    ];
    for (const fixture of fixtures) {
      const projection = buildWorkspaceProjection(
        session('user-1', fixture.roles),
        fixture.assignments,
      );
      for (const feature of projection.features) {
        for (const key of Object.keys(feature)) {
          expect(ALLOWED_FEATURE_KEYS.has(key), key).toBe(true);
        }
      }
      for (const entry of projection.modules) {
        expect(Object.keys(entry).sort()).toEqual(['features', 'module']);
        for (const key of Object.keys(entry.module)) {
          expect(ALLOWED_MODULE_KEYS.has(key), key).toBe(true);
        }
      }
      // The projection never echoes session, user, organization, assignment,
      // PII, or raw-payload internals.
      const raw = JSON.stringify(projection);
      for (const leaked of [
        'user-1',
        'field-1',
        'officer-1',
        'ou-a',
        'ou-b',
        'assigneeUserId',
        'organizationId',
        'organizationUnitId',
        '@civicos.local',
        'sensitiveProfile',
        'identityNumber',
        'identityNumberMasked',
        'ciphertext',
        'storageKey',
        'read_sensitive',
      ]) {
        expect(raw).not.toContain(leaked);
      }
    }
  });

  it('uses static registry hrefs without resource instance disclosure', () => {
    const registryHrefs = new Set(FEATURES.map((feature) => feature.href));
    const commander = session('commander-1', ['commander']);
    const projection = buildWorkspaceProjection(commander, []);
    expect(projection.features.length).toBeGreaterThan(0);
    for (const feature of projection.features) {
      expect(registryHrefs.has(feature.href), feature.href).toBe(true);
      expect(feature.href).not.toMatch(/\/[0-9a-f-]{8}/);
      expect(feature.href).not.toContain('?');
      expect(feature.href).not.toContain('subjectId');
      expect(feature.href).not.toContain('incidentId');
    }
    // Entry authorization for a hidden instance route stays policy-gated and
    // never becomes a navigation href.
    expect(canEnterFeature('incident-queue', commander, [])).toBe(true);
    expect(projection.features.map((feature) => feature.href)).not.toContain(
      '/incidents',
    );
    expect(
      visibleNavigationFeatures(
        'land',
        session('officer-1', ['land_officer']),
        [
          assignment('land_review', {
            assigneeUserId: 'officer-1',
            organizationId: 'ou-a',
          }),
        ],
      ).map((feature) => feature.href),
    ).toEqual(expect.arrayContaining(['/land/parcels', '/land/applications']));
  });

  it('renders workspace markup without PII, organization scope or raw payload', () => {
    const html = workspaceMarkup(
      'commander-pii-1',
      ['commander'],
      'ou-pii-99',
      [
        assignment('incident_verification', {
          assigneeUserId: 'commander-pii-1',
          organizationId: 'ou-pii-99',
        }),
      ],
    );
    expect(html).toContain('workspace-ready');
    for (const leaked of [
      'commander-pii-1',
      'ou-pii-99',
      '@civicos.local',
      'incident_verification',
      'sensitiveProfile',
      'identityNumber',
      'ciphertext',
      'storageKey',
    ]) {
      expect(html).not.toContain(leaked);
    }
    const landHtml = workspaceMarkup(
      'officer-pii-7',
      ['land_officer'],
      'ou-pii-77',
      [
        assignment('land_review', {
          assigneeUserId: 'officer-pii-7',
          organizationId: 'ou-pii-77',
        }),
      ],
    );
    for (const leaked of [
      'officer-pii-7',
      'ou-pii-77',
      'land_review',
      'identityNumberMasked',
      '(đã che)',
    ]) {
      expect(landHtml).not.toContain(leaked);
    }
  });

  it('renders AccessDenied without inventory for no-feature sessions', () => {
    for (const role of ['system_operator', 'supervisor', 'citizen'] as const) {
      const html = workspaceMarkup(`${role}-pii-1`, [role], 'ou-pii-11', []);
      expect(html).toContain('Không có quyền truy cập');
      expect(html).toContain(
        'Hồ sơ này không thuộc nhiệm vụ hoặc phạm vi chỉ huy của tài khoản hiện tại.',
      );
      expect(html).not.toContain('<a href');
      expect(html).not.toContain('Mở phân hệ');
      for (const inventory of [
        `${role}-pii-1`,
        'ou-pii-11',
        'incident_verification',
        'land_review',
        'Assignment',
        'Incident',
        'Phương tiện',
        'Identity',
        'Bản đồ',
        'Đất đai',
      ]) {
        expect(html).not.toContain(inventory);
      }
    }
    const denied = renderToStaticMarkup(createElement(AccessDenied, {}));
    expect(denied).toContain('Không có quyền truy cập');
    expect(denied).not.toContain('<a href');
    expect(denied).not.toContain('ou-a');
  });

  it('preserves masked, forbidden and sensitive boundaries', () => {
    // Resident detail keeps masking copy and the fail-closed 403 branch.
    const residentDetail = readSource(
      'src/components/residents/ResidentDetail.tsx',
    );
    expect(residentDetail).toContain('masked');
    expect(residentDetail).toContain('sensitiveProfile');
    expect(residentDetail).toContain('Danh tính đã che theo quyền.');
    expect(residentDetail).toContain('response.status === 403');

    // Land party display stays masked-only and guards raw payload internals.
    const workspaceView = readSource('src/components/land/workspace-view.ts');
    expect(workspaceView).toContain('maskedPartyLabel');
    expect(workspaceView).toContain('(đã che)');
    expect(workspaceView).toContain('hasSensitiveLeak');
    expect(workspaceView).toContain('ciphertext');
    expect(workspaceView).not.toContain('identityNumber:');

    // Intake surfaces keep role-based reveal copy and forbidden mapping.
    const queue = readSource('src/components/incidents/IntakeReportQueue.tsx');
    expect(queue).toContain('revealed');
    const intakeDetail = readSource(
      'src/components/incidents/IntakeReportDetail.tsx',
    );
    expect(intakeDetail).toContain('revealed');
    expect(intakeDetail).toContain('Danh tính đã che theo vai trò');
    expect(intakeDetail).toContain('FORBIDDEN');
    expect(intakeDetail).toContain('AccessDenied');

    // Shared forbidden seam keeps its approved copy without an inventory.
    const accessDenied = readSource('src/components/identity/AccessDenied.tsx');
    expect(accessDenied).toContain('Không có quyền truy cập');
    expect(accessDenied).toContain(
      'Hồ sơ này không thuộc nhiệm vụ hoặc phạm vi chỉ huy của tài khoản hiện tại.',
    );
    expect(accessDenied).not.toContain('<a href');

    // Workspace projection sources never reference PII or payload internals.
    for (const path of [
      'src/components/navigation/feature-registry.ts',
      'src/components/navigation/workspace-registry.ts',
      'src/components/workspace/RoleWorkspace.tsx',
    ] as const) {
      const source = readSource(path);
      for (const leaked of [
        'sensitiveProfile',
        'identityNumber',
        'ciphertext',
        'storageKey',
        '@civicos.local',
      ]) {
        expect(source).not.toContain(leaked);
      }
    }
    expect(readSource('src/components/workspace/RoleWorkspace.tsx')).toContain(
      '<AccessDenied',
    );
  });
});
