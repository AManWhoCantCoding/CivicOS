import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import {
  FEATURES,
  NAVIGATION_EXCLUDED_FEATURE_IDS,
  canEnterFeature,
  visibleNavigationFeatures,
  type AssignmentScope,
  type SessionScope,
} from '@/components/navigation/feature-registry';
import { buildWorkspaceProjection } from '@/components/navigation/workspace-registry';
import { inferShellModuleId } from '@/components/shell/ModuleShell';
import { RoleWorkspaceView } from '@/components/workspace/RoleWorkspace';

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

const HIDDEN_IDS = [
  'resident-list',
  'resident-reports',
  'incident-queue',
  'incident-intake',
  'inspection-catalogue',
  'inspection-schedule',
  'inspection-workqueue',
] as const;

const HIDDEN_LABELS = [
  'Hàng đợi Incident',
  'Ghi nhận tin báo',
  'Danh mục cơ sở',
  'Lịch kiểm tra',
  'Hàng đợi fieldwork',
  'Danh sách cư dân đặc biệt',
  'Báo cáo tháng cư dân',
];

const HIDDEN_HREFS = [
  'href="/residents"',
  'href="/residents/reports"',
  'href="/incidents"',
  'href="/intake"',
  'href="/inspections/establishments"',
  '/inspections/establishments#inspection-schedule',
];

const commander = () => session('commander-1', ['commander']);

function launcherMarkup(): string {
  return renderToStaticMarkup(
    createElement(RoleWorkspaceView, {
      session: commander(),
      assignments: [],
      sessionState: 'ready',
      assignmentState: 'ready',
      online: true,
      onRetry: () => {},
    }),
  );
}

describe('T-005 hidden route preservation', () => {
  it.each([...HIDDEN_IDS])('hides %s from navigation only', (hiddenId) => {
    // The definition stays in the registry (not deleted).
    expect(FEATURES.some((feature) => feature.id === hiddenId)).toBe(true);
    // The navigation-only exclusion seam still lists it.
    expect([...NAVIGATION_EXCLUDED_FEATURE_IDS]).toContain(hiddenId);
    // Navigation projection omits it while entry authorization keeps it.
    const modules = ['incidents', 'inspections', 'residents'] as const;
    for (const moduleId of modules) {
      expect(
        visibleNavigationFeatures(moduleId, commander(), []).some(
          (feature) => feature.id === hiddenId,
        ),
      ).toBe(false);
    }
    const projection = buildWorkspaceProjection(commander(), []);
    expect(projection.features.map((feature) => feature.id)).not.toContain(
      hiddenId,
    );
    expect(canEnterFeature(hiddenId, commander(), [])).toBe(true);
  });

  it('keeps hidden features absent from launcher output', () => {
    const html = launcherMarkup();
    for (const label of HIDDEN_LABELS) {
      expect(html).not.toContain(label);
    }
    for (const href of HIDDEN_HREFS) {
      expect(html).not.toContain(href);
    }
    // The shell only renders projected features; it never hard-codes hidden IDs.
    const shell = readSource('src/components/shell/ModuleShell.tsx');
    expect(shell).toContain('buildWorkspaceProjection(');
    expect(shell).toContain('features={activeFeatures}');
    for (const hidden of HIDDEN_IDS) {
      expect(shell).not.toContain(hidden);
    }
    expect(readSource('src/components/navigation/ModuleSidebar.tsx')).toContain(
      'href={feature.href}',
    );
  });

  it('keeps authorized hidden direct routes reachable', () => {
    // Commander bypasses task gates, so every hidden ID stays enterable.
    for (const hidden of HIDDEN_IDS) {
      expect(canEnterFeature(hidden, commander(), [])).toBe(true);
    }
    // Task-gated hidden entry still opens with an active in-scope assignment.
    const fieldOfficer = session('field-1', ['field_officer']);
    expect(
      canEnterFeature('incident-queue', fieldOfficer, [
        assignment('incident_verification', {
          assigneeUserId: 'field-1',
          organizationId: 'ou-a',
        }),
      ]),
    ).toBe(true);

    // Entry authorization stays authoritative: the server gate reuses the full
    // registry plus assignment reads instead of the navigation projection.
    const entry = readSource('src/components/shell/feature-entry.ts');
    expect(entry).toContain('canEnterAnyFeature');
    expect(entry).toContain('listAssignments');
    expect(entry).toContain('FEATURES.some');

    // Hidden pages keep their existing direct-route server gate (no deletion).
    expect(readSource('src/app/residents/page.tsx')).toContain(
      "canEnterEntry(current, ['resident-list'])",
    );
    expect(readSource('src/app/residents/reports/page.tsx')).toContain(
      "canEnterEntry(current, ['resident-reports'])",
    );
    expect(readSource('src/app/incidents/page.tsx')).toContain(
      "canEnterEntry(current, ['incident-queue'])",
    );
    const establishments = readSource(
      'src/app/inspections/establishments/page.tsx',
    );
    expect(establishments).toContain('inspection-catalogue');
    expect(establishments).toContain('inspection-schedule');
    expect(establishments).toContain('inspection-workqueue');
  });

  it('keeps unauthorized hidden routes forbidden without disclosure', () => {
    // No session, unknown role, or missing assignment fails closed.
    for (const hidden of HIDDEN_IDS) {
      expect(canEnterFeature(hidden, null, [])).toBe(false);
      expect(
        canEnterFeature(hidden, session('citizen-1', ['citizen']), []),
      ).toBe(false);
    }
    const fieldOfficer = session('field-1', ['field_officer']);
    expect(canEnterFeature('incident-queue', fieldOfficer, [])).toBe(false);
    expect(
      canEnterFeature('incident-queue', fieldOfficer, [
        { task: 'incident_verification', status: 'revoked' },
      ]),
    ).toBe(false);
    expect(
      canEnterFeature('incident-queue', fieldOfficer, [
        assignment('incident_verification', { assigneeUserId: 'field-2' }),
      ]),
    ).toBe(false);

    // The forbidden boundary renders AccessDenied with no data inventory.
    const denied = renderToStaticMarkup(
      createElement(RoleWorkspaceView, {
        session: session('citizen-1', ['citizen']),
        assignments: [],
        sessionState: 'ready',
        assignmentState: 'ready',
        online: true,
        onRetry: () => {},
      }),
    );
    expect(denied).toContain('Không có quyền truy cập');
    expect(denied).not.toContain('<a href');

    // Hidden pages keep the denied branch on AccessDenied (no data leak).
    for (const path of [
      'src/app/residents/page.tsx',
      'src/app/residents/reports/page.tsx',
      'src/app/incidents/page.tsx',
      'src/app/inspections/establishments/page.tsx',
    ] as const) {
      const source = readSource(path);
      expect(source).toContain('AccessDenied');
      expect(source).toContain('denied');
    }
    // Client surfaces map 403/FORBIDDEN to the forbidden boundary.
    expect(readSource('src/components/incidents/IncidentTable.tsx')).toContain(
      'FORBIDDEN',
    );
    expect(readSource('src/components/residents/ResidentList.tsx')).toContain(
      'response.status === 403',
    );
    expect(readSource('src/components/residents/ResidentDetail.tsx')).toContain(
      'response.status === 403',
    );
  });

  it('preserves browser history and deep-link behavior', () => {
    // Hidden routes infer no navigation module, so no tab/link is created.
    const projection = buildWorkspaceProjection(commander(), []);
    for (const [pathname, hash] of [
      ['/residents', ''],
      ['/residents/reports', ''],
      ['/incidents', ''],
      ['/intake', ''],
      ['/inspections/establishments', ''],
      ['/inspections/establishments', '#inspection-schedule'],
    ] as const) {
      expect(
        inferShellModuleId(projection.features, pathname, hash),
        pathname + hash,
      ).toBe(null);
    }
    // The hash deep-link destination is unchanged in the registry.
    const hrefById = new Map(
      FEATURES.map((feature) => [feature.id, feature.href]),
    );
    expect(hrefById.get('inspection-schedule')).toBe(
      '/inspections/establishments#inspection-schedule',
    );
    expect(hrefById.get('incident-intake')).toBe('/intake');

    // Hidden pages keep context breadcrumbs without inventing history writes.
    expect(readSource('src/app/residents/[subjectId]/page.tsx')).toContain(
      'href="/residents"',
    );
    expect(readSource('src/app/residents/reports/page.tsx')).toContain(
      'href="/residents"',
    );
    expect(readSource('src/app/intake/[reportId]/page.tsx')).toContain(
      'IntakeReportDetail',
    );
    for (const path of [
      'src/app/residents/page.tsx',
      'src/app/residents/reports/page.tsx',
      'src/app/residents/[subjectId]/page.tsx',
      'src/app/intake/page.tsx',
      'src/app/intake/[reportId]/page.tsx',
      'src/app/incidents/page.tsx',
      'src/app/incidents/[incidentId]/page.tsx',
      'src/app/inspections/establishments/page.tsx',
      'src/app/inspections/[inspectionId]/page.tsx',
    ] as const) {
      const source = readSource(path);
      expect(source).not.toContain('redirect(');
      expect(source).not.toContain('router.push');
      expect(source).not.toContain('router.replace');
      expect(source).not.toContain('pushState');
      expect(source).not.toContain('replaceState');
    }
  });
});
