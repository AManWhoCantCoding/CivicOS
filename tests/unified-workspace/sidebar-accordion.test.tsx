import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import {
  FEATURES,
  activeFeatureId,
  type AssignmentScope,
  type ModuleId,
  type SessionScope,
} from '@/components/navigation/feature-registry';
import { ModuleTabs } from '@/components/navigation/ModuleTabs';
import { buildWorkspaceProjection } from '@/components/navigation/workspace-registry';
import {
  inferShellModuleId,
  resolveShellActiveModuleId,
} from '@/components/shell/ModuleShell';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const shellSource = () => readSource('src/components/shell/ModuleShell.tsx');
const tabsSource = () => readSource('src/components/navigation/ModuleTabs.tsx');
const sidebarSource = () =>
  readSource('src/components/navigation/ModuleSidebar.tsx');

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

const commander = () => session('commander-1', ['commander']);

// Minimal single-list renderer mirroring sidebarBody: tabs plus exactly the
// active module's feature list. Uses plain anchors so the test stays in the
// node SSR environment (ModuleSidebar itself uses next/link).
function sidebarMarkup(
  modules: ReturnType<typeof buildWorkspaceProjection>['modules'],
  activeModuleId: ModuleId | null,
  idPrefix = 'shell',
): string {
  const tabs = renderToStaticMarkup(
    <ModuleTabs
      modules={modules}
      activeModuleId={activeModuleId}
      onSelect={() => {}}
      idPrefix={idPrefix}
      controlsId={`${idPrefix}-features`}
    />,
  );
  const active = modules.find((entry) => entry.module.id === activeModuleId);
  const list = renderToStaticMarkup(
    <ul>
      {(active?.features ?? []).map((feature) => (
        <li key={feature.id}>
          <a href={feature.href}>{feature.label}</a>
        </li>
      ))}
    </ul>,
  );
  return `${tabs}\n${list}`;
}

describe('T-003 single-expanded sidebar', () => {
  it('renders eligible module tabs and exactly one visible feature list', () => {
    const projection = buildWorkspaceProjection(commander(), []);
    const ids = projection.modules.map((entry) => entry.module.id);
    // Eligible top-level tabs for commander: incidents/vehicles/identity/map.
    expect(ids).toEqual(
      expect.arrayContaining(['incidents', 'vehicles', 'identity', 'map']),
    );
    // Hidden modules never become tabs.
    expect(ids).not.toContain('inspections');
    expect(ids).not.toContain('residents');
    for (const entry of projection.modules) {
      expect(entry.features.length).toBeGreaterThan(0);
    }

    // Root-like: no route inference, no click -> first permitted module active.
    const active = resolveShellActiveModuleId(
      projection.modules,
      null,
      null,
      null,
    );
    expect(active).toBe(projection.modules[0]?.module.id);

    const html = sidebarMarkup(projection.modules, active);
    // All eligible tab labels present.
    for (const entry of projection.modules) {
      expect(html).toContain(entry.module.label);
    }
    // Exactly one tab selected (roving single-expanded).
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/role="tab"/g)?.length).toBe(projection.modules.length);
    // Exactly the active module's feature list is visible.
    const activeEntry = projection.modules.find(
      (entry) => entry.module.id === active,
    );
    for (const feature of activeEntry?.features ?? []) {
      expect(html).toContain(feature.label);
    }
    for (const entry of projection.modules) {
      if (entry.module.id === active) continue;
      for (const feature of entry.features) {
        expect(html).not.toContain(feature.label);
      }
    }
  });

  it('swaps feature list and grouping on module-tab activation', () => {
    const projection = buildWorkspaceProjection(commander(), []);
    const byId = new Map(FEATURES.map((feature) => [feature.id, feature]));

    const first = resolveShellActiveModuleId(
      projection.modules,
      null,
      null,
      null,
    );
    const vehicles = projection.modules.find(
      (entry) => entry.module.id === 'vehicles',
    );
    expect(vehicles).toBeTruthy();
    if (!vehicles) return;

    // Clicking another eligible tab replaces the visible list.
    const afterClick = resolveShellActiveModuleId(
      projection.modules,
      'vehicles',
      null,
      null,
    );
    expect(afterClick).toBe('vehicles');
    expect(afterClick).not.toBe(first);

    const beforeHtml = sidebarMarkup(projection.modules, first);
    const afterHtml = sidebarMarkup(projection.modules, afterClick);
    for (const feature of vehicles.features) {
      expect(afterHtml).toContain(feature.label);
      expect(afterHtml).toContain(`href="${feature.href}"`);
      // Registry-correct grouping via FEATURES.moduleId.
      expect(byId.get(feature.id)?.moduleId).toBe('vehicles');
    }
    const firstEntry = projection.modules.find(
      (entry) => entry.module.id === first,
    );
    for (const feature of firstEntry?.features ?? []) {
      expect(afterHtml).not.toContain(feature.label);
      expect(beforeHtml).toContain(feature.label);
    }
    // No other feature list is rendered alongside the active one.
    expect(afterHtml.match(/aria-selected="true"/g)).toHaveLength(1);

    // Identity grouping stays registry-correct after a second switch.
    const identityActive = resolveShellActiveModuleId(
      projection.modules,
      'identity',
      null,
      null,
    );
    expect(identityActive).toBe('identity');
    const identityHtml = sidebarMarkup(projection.modules, identityActive);
    const identity = projection.modules.find(
      (entry) => entry.module.id === 'identity',
    );
    for (const feature of identity?.features ?? []) {
      expect(identityHtml).toContain(feature.label);
      expect(byId.get(feature.id)?.moduleId).toBe('identity');
    }
  });

  it('infers active module from route without changing href/destination', () => {
    const cmd = commander();
    const projection = buildWorkspaceProjection(cmd, []);
    const hrefById = new Map(
      FEATURES.map((feature) => [feature.id, feature.href]),
    );

    // /field/vehicles -> Phương tiện.
    expect(inferShellModuleId(projection.features, '/field/vehicles', '')).toBe(
      'vehicles',
    );
    // /map -> Bản đồ.
    expect(inferShellModuleId(projection.features, '/map', '')).toBe('map');
    // /vehicles/registry -> Phương tiện.
    expect(
      inferShellModuleId(projection.features, '/vehicles/registry', ''),
    ).toBe('vehicles');

    // /assignments is a duplicate href (incidents + identity). The route owner
    // declares identity, so the shell prefers the eligible fallback (identity)
    // without rewriting the destination.
    const inferredAssignments = inferShellModuleId(
      projection.features,
      '/assignments',
      '',
    );
    expect(['incidents', 'identity']).toContain(inferredAssignments);
    const resolvedAssignments = resolveShellActiveModuleId(
      projection.modules,
      null,
      inferredAssignments,
      'identity' satisfies ModuleId,
    );
    expect(resolvedAssignments).toBe('identity');

    // /land/** -> Đất đai for a land role with an in-scope assignment.
    const landOfficer = session('land-1', ['land_officer']);
    const landAssignments = [
      assignment('land_review', {
        assigneeUserId: 'land-1',
        organizationId: 'ou-a',
      }),
    ];
    const landProjection = buildWorkspaceProjection(
      landOfficer,
      landAssignments,
    );
    expect(
      inferShellModuleId(landProjection.features, '/land/parcels', ''),
    ).toBe('land');
    expect(
      inferShellModuleId(landProjection.features, '/land/applications', ''),
    ).toBe('land');
    expect(
      resolveShellActiveModuleId(
        landProjection.modules,
        null,
        inferShellModuleId(landProjection.features, '/land/parcels', ''),
        'land' satisfies ModuleId,
      ),
    ).toBe('land');

    // Destinations are never rewritten: active inference keeps feature hrefs.
    expect(hrefById.get('vehicle-observation')).toBe('/field/vehicles');
    expect(hrefById.get('identity-assignments')).toBe('/assignments');
    expect(hrefById.get('map-workspace')).toBe('/map');
    expect(hrefById.get('land-parcel-workspace')).toBe('/land/parcels');
    const shell = shellSource();
    expect(shell).toContain('activeFeatureId(');
    expect(shell).toContain('buildWorkspaceProjection(');
    expect(shell).toContain('features={activeFeatures}');
    expect(shell).toContain('href={fallbackDefinition.homeHref}');
    expect(shell).not.toContain('ROLE_BASE_CAPABILITIES');
    expect(shell).not.toContain('visibleRoles');
    expect(shell).not.toContain('requiresTask');
    // Feature destinations stay in the reused sidebar renderer.
    expect(sidebarSource()).toContain('href={feature.href}');
  });

  it('does not create hidden Residents/Inspection tabs for direct routes', () => {
    const projection = buildWorkspaceProjection(commander(), []);
    const ids = projection.modules.map((entry) => entry.module.id);
    expect(ids).not.toContain('inspections');
    expect(ids).not.toContain('residents');

    // Hidden direct routes infer no eligible module and cannot create a tab.
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
    // Active resolution on a hidden route falls back to a permitted tab, never
    // a hidden one (here the incidents fallback for the incidents shell).
    const hiddenActive = resolveShellActiveModuleId(
      projection.modules,
      null,
      null,
      'incidents' satisfies ModuleId,
    );
    expect(hiddenActive).toBe('incidents');
    const hiddenFallback = resolveShellActiveModuleId(
      projection.modules,
      null,
      null,
      'inspections' satisfies ModuleId,
    );
    expect(hiddenFallback).toBe(projection.modules[0]?.module.id);
    expect(['inspections', 'residents']).not.toContain(hiddenFallback);

    const html = sidebarMarkup(projection.modules, hiddenActive);
    for (const hiddenLabel of [
      'Hàng đợi Incident',
      'Ghi nhận tin báo',
      'Danh mục cơ sở',
      'Lịch kiểm tra',
      'Hàng đợi fieldwork',
      'Danh sách cư dân đặc biệt',
      'Báo cáo tháng cư dân',
    ]) {
      expect(html).not.toContain(hiddenLabel);
    }
    expect(html).not.toContain('href="/residents"');
    expect(html).not.toContain('href="/intake"');
    expect(html).not.toContain(
      '/inspections/establishments#inspection-schedule',
    );

    // Existing page/server gates remain reachable (no route deletion).
    const residentsPage = readSource('src/app/residents/page.tsx');
    expect(residentsPage).toContain('canEnterEntry');
    expect(residentsPage).toContain('resident-list');
    const inspectionsPage = readSource(
      'src/app/inspections/establishments/page.tsx',
    );
    expect(inspectionsPage).toContain('canEnterEntry');
    const intakePage = readSource('src/app/intake/page.tsx');
    expect(intakePage).toContain('IntakeReportForm');

    const shell = shellSource();
    expect(shell).not.toContain('resident-list');
    expect(shell).not.toContain('inspection-catalogue');
  });

  it('preserves drawer focus, keyboard roving and reduced-motion behavior', () => {
    const projection = buildWorkspaceProjection(commander(), []);
    const active = resolveShellActiveModuleId(
      projection.modules,
      null,
      null,
      null,
    );
    const html = sidebarMarkup(projection.modules, active);

    // Tabs are keyboard-roving single-selected controls, at least 44px.
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected');
    expect(html).toContain('aria-controls');
    expect(html).toContain('min-h-[44px]');
    // Roving tabindex: active tab is tabbable, others are arrow-reachable.
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('tabindex="-1"');

    const tabs = tabsSource();
    expect(tabs).toContain('ArrowRight');
    expect(tabs).toContain('ArrowLeft');
    expect(tabs).toContain('ArrowDown');
    expect(tabs).toContain('ArrowUp');
    expect(tabs).toContain('tabIndex={active ? 0 : -1}');
    expect(tabs).toContain('aria-selected');
    expect(tabs).toContain('aria-controls');
    expect(tabs).toContain('min-h-[44px]');
    expect(tabs).toContain('motion-safe:');

    const shell = shellSource();
    // Drawer preserves close/focus-restore semantics.
    expect(shell).toContain('role="dialog"');
    expect(shell).toContain('aria-modal');
    // Route-owner shell chrome (drawer + menu) preserves the route context,
    // never the selected navigation tab.
    expect(shell).toContain(
      'aria-label={`Điều hướng ${fallbackDefinition.label}`}',
    );
    expect(shell).toContain(
      'aria-label={`Mở điều hướng ${fallbackDefinition.label}`}',
    );
    expect(shell).toContain('CivicOS / {fallbackDefinition.label}');
    expect(shell).toContain('menuButtonRef.current?.focus()');
    expect(shell).toContain("event.key === 'Escape'");
    expect(shell).toContain("event.key !== 'Tab'");
    expect(shell).toContain('aria-expanded');
    expect(shell).toContain('aria-controls="module-sidebar"');
    expect(shell).toContain('aria-controls="module-drawer"');
    // Collapse, breadcrumb, offline and focus behavior preserved.
    expect(shell).toContain('Mở rộng điều hướng');
    expect(shell).toContain('Thu gọn điều hướng');
    expect(shell).toContain('aria-label="Breadcrumb"');
    expect(shell).toContain('ModuleOfflineNotice');
    expect(shell).toContain('motion-safe:');
    expect(shell).toContain('min-h-[44px]');
    expect(shell).not.toContain('outline-none');

    const sidebar = sidebarSource();
    expect(sidebar).toContain('min-h-[44px]');
    expect(sidebar).toContain('motion-safe:');
    expect(sidebar).toContain('aria-current');

    // Feature links keep activeHash-aware active state without new routes.
    const features = projection.features;
    expect(activeFeatureId(features, '/map', '')).not.toBe(null);
    expect(activeFeatureId(features, '/residents', '')).toBe(null);
  });

  it('preserves route-owner context when the selected tab differs or the route is hidden', () => {
    const projection = buildWorkspaceProjection(commander(), []);

    // Hidden Inspection route: route owner has no eligible navigation entry,
    // so its feature list is empty and cannot create a hidden tab/link, while
    // the shell keeps the Inspection page context.
    const inspectionsEntry = projection.modules.find(
      (entry) => entry.module.id === 'inspections',
    );
    expect(inspectionsEntry).toBeUndefined();
    const hiddenSelected = resolveShellActiveModuleId(
      projection.modules,
      null,
      null,
      'inspections' satisfies ModuleId,
    );
    // Selected navigation falls back to the first permitted tab …
    expect(hiddenSelected).toBe(projection.modules[0]?.module.id);
    expect(hiddenSelected).not.toBe('inspections');
    // … but the route-owner context stays Inspection (no silent Incident swap).
    const routeOwnerHidden = projection.modules.find(
      (entry) => entry.module.id === ('inspections' satisfies ModuleId),
    );
    expect(routeOwnerHidden).toBeUndefined();
    expect(activeFeatureId([], '/inspections/establishments', '')).toBe(null);

    // Eligible route with a differing selected tab: navigation shows the
    // selected list, but breadcrumb/header keep the route owner.
    const vehiclesActive = resolveShellActiveModuleId(
      projection.modules,
      'identity' satisfies ModuleId,
      'vehicles' satisfies ModuleId,
      'vehicles' satisfies ModuleId,
    );
    expect(vehiclesActive).toBe('identity');
    const routeOwnerVehicles = projection.modules.find(
      (entry) => entry.module.id === ('vehicles' satisfies ModuleId),
    );
    expect(routeOwnerVehicles?.module.id).toBe('vehicles');
    expect(
      activeFeatureId(
        routeOwnerVehicles?.features ?? [],
        '/vehicles/registry',
        '',
      ),
    ).not.toBe(null);

    // Source seam: shell chrome uses the route owner, only the feature list
    // uses the selected tab.
    const shell = shellSource();
    expect(shell).toContain('routeOwnerFeatures');
    expect(shell).toContain('routeActiveFeature');
    expect(shell).toContain('href={fallbackDefinition.homeHref}');
    expect(shell).toContain('Phân hệ {fallbackDefinition.label}');
    expect(shell).toContain('CivicOS / {fallbackDefinition.label}');
    expect(shell).toContain(
      'navLabel={`Điều hướng ${activeDefinition.label}`}',
    );
    expect(shell).not.toContain('href={activeDefinition.homeHref}');
    expect(shell).not.toContain('Phân hệ {activeDefinition.label}');
    expect(shell).not.toContain('CivicOS / {activeDefinition.label}');
  });
});
