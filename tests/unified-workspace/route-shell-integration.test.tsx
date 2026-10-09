import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  AssignmentScope,
  SessionScope,
} from '@/components/navigation/feature-registry';
import { buildWorkspaceProjection } from '@/components/navigation/workspace-registry';
import {
  inferShellModuleId,
  resolveShellActiveModuleId,
} from '@/components/shell/ModuleShell';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function shellUsages(source: string): number {
  return (source.match(/<ModuleShell/g) ?? []).length;
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

const commander = () => session('commander-1', ['commander']);

describe('T-004 web route shell integration', () => {
  it('maps representative web routes to the correct active module', () => {
    // Route owners compose the existing shared shell (no bespoke wrapper).
    const fieldLayout = readSource('src/app/field/layout.tsx');
    expect(fieldLayout).toContain(
      "import { ModuleShell } from '@/components/shell/ModuleShell';",
    );
    expect(fieldLayout).toContain('<ModuleShell module="vehicles">');
    expect(shellUsages(fieldLayout)).toBe(1);
    expect(fieldLayout).not.toContain('Về trung tâm');
    expect(fieldLayout).not.toContain('CivicOS / Hiện trường');

    // The nested vehicle layout stays a passthrough so the field shell
    // renders exactly once for /field/vehicles/**.
    const nested = readSource('src/app/field/vehicles/layout.tsx');
    expect(shellUsages(nested)).toBe(0);
    expect(nested).not.toContain('<ModuleShell');
    expect(nested).not.toContain('components/shell/ModuleShell');
    expect(nested).toContain('{children}');

    // Layout-owned shells keep their declared module and server gate.
    for (const [path, module] of [
      ['src/app/vehicles/layout.tsx', 'vehicles'],
      ['src/app/incidents/layout.tsx', 'incidents'],
      ['src/app/inspections/layout.tsx', 'inspections'],
      ['src/app/map/layout.tsx', 'map'],
    ] as const) {
      const source = readSource(path);
      expect(source).toContain(`<ModuleShell module="${module}">`);
      expect(source).toContain('getCurrentUser');
      expect(source).toContain('hasBusinessCapability');
      expect(source).toContain('AccessDenied');
    }

    // Page-owned shells keep their declared module and entry gate.
    for (const [path, module] of [
      ['src/app/identity/page.tsx', 'identity'],
      ['src/app/users/page.tsx', 'identity'],
      ['src/app/assignments/page.tsx', 'identity'],
      ['src/app/land/page.tsx', 'land'],
    ] as const) {
      const source = readSource(path);
      expect(source).toContain(`<ModuleShell module="${module}">`);
      expect(source).toContain('canEnterEntry');
      expect(source).toContain('getCurrentUser');
    }

    // Active-module inference follows the route/feature mapping.
    const projection = buildWorkspaceProjection(commander(), []);
    expect(inferShellModuleId(projection.features, '/field/vehicles', '')).toBe(
      'vehicles',
    );
    expect(
      inferShellModuleId(projection.features, '/vehicles/registry', ''),
    ).toBe('vehicles');
    expect(inferShellModuleId(projection.features, '/map', '')).toBe('map');
    expect(inferShellModuleId(projection.features, '/users', '')).toBe(
      'identity',
    );
    // /assignments is a duplicate href (incidents + identity); the identity
    // route owner keeps identity without rewriting the destination.
    const inferredAssignments = inferShellModuleId(
      projection.features,
      '/assignments',
      '',
    );
    expect(['incidents', 'identity']).toContain(inferredAssignments);
    expect(
      resolveShellActiveModuleId(
        projection.modules,
        null,
        inferredAssignments,
        'identity',
      ),
    ).toBe('identity');
    // /identity has no feature href; the route-owner fallback keeps identity.
    expect(inferShellModuleId(projection.features, '/identity', '')).toBe(null);
    expect(
      resolveShellActiveModuleId(projection.modules, null, null, 'identity'),
    ).toBe('identity');

    // /land/** infers the land module for an in-scope land assignment.
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
    for (const pathname of [
      '/land',
      '/land/parcels',
      '/land/applications',
    ] as const) {
      expect(
        inferShellModuleId(landProjection.features, pathname, ''),
        pathname,
      ).toBe('land');
    }
    expect(
      resolveShellActiveModuleId(
        landProjection.modules,
        null,
        inferShellModuleId(landProjection.features, '/land/parcels', ''),
        'land',
      ),
    ).toBe('land');
  });

  it('keeps hidden direct routes reachable without navigation entries', () => {
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

    // Direct-route ownership stays server-gated; nothing becomes a redirect.
    const residentsPage = readSource('src/app/residents/page.tsx');
    expect(residentsPage).toContain('canEnterEntry');
    expect(residentsPage).toContain('resident-list');
    expect(residentsPage).toContain('ResidentList');
    expect(residentsPage).not.toContain('ModuleShell');
    expect(residentsPage).not.toContain('redirect(');

    const intakePage = readSource('src/app/intake/page.tsx');
    expect(intakePage).toContain('IntakeReportForm');
    expect(intakePage).toContain('IntakeReportQueue');
    expect(intakePage).not.toContain('ModuleShell');

    const inspectionsPage = readSource(
      'src/app/inspections/establishments/page.tsx',
    );
    expect(inspectionsPage).toContain('canEnterEntry');
    expect(inspectionsPage).toContain('inspection-catalogue');
    expect(inspectionsPage).not.toContain('ModuleShell');
    expect(inspectionsPage).not.toContain('redirect(');

    // The shell never links hidden features.
    const shell = readSource('src/components/shell/ModuleShell.tsx');
    expect(shell).toContain('features={activeFeatures}');
    expect(shell).toContain('buildWorkspaceProjection(');
    expect(shell).not.toContain('resident-list');
    expect(shell).not.toContain('inspection-catalogue');
    expect(shell).not.toContain('incident-queue');
    // Feature destinations stay in the reused sidebar renderer.
    expect(readSource('src/components/navigation/ModuleSidebar.tsx')).toContain(
      'href={feature.href}',
    );
  });

  it('preserves public land lookup boundary', () => {
    const lookup = readSource('src/app/public/land/lookup/page.tsx');
    expect(lookup).toContain('PublicLandLookup');
    expect(lookup).toContain('Tra cứu hồ sơ đất đai');
    // Public lookup stays outside the authenticated shell and server gates.
    expect(lookup).not.toContain('ModuleShell');
    expect(lookup).not.toContain('canEnterEntry');
    expect(lookup).not.toContain('getCurrentUser');
    expect(lookup).not.toContain('/assignments');
    expect(lookup).not.toContain('/incidents');

    // Internal land routes keep their authenticated shell + entry gate.
    const landQueue = readSource('src/app/land/page.tsx');
    expect(landQueue).toContain('<ModuleShell module="land">');
    expect(landQueue).toContain('land-application-queue');
    const parcels = readSource('src/app/land/parcels/page.tsx');
    expect(parcels).toContain('<ModuleShell module="land">');
    expect(parcels).toContain('land-parcel-workspace');
  });

  it('does not alter detail content/API/action/masking contract', () => {
    // Incident list/detail keeps its content, actions and deep links.
    const incidentsPage = readSource('src/app/incidents/page.tsx');
    expect(incidentsPage).toContain('IncidentTable');
    expect(incidentsPage).toContain(
      "canEnterEntry(current, ['incident-queue'])",
    );
    expect(incidentsPage).toContain('href="/intake"');
    expect(incidentsPage).toContain('href="/assignments"');

    // Field observation keeps its workspace, gate and registry deep link.
    const fieldVehicles = readSource('src/app/field/vehicles/page.tsx');
    expect(fieldVehicles).toContain('VehicleObservationWorkspace');
    expect(fieldVehicles).toContain('vehicle-observation');
    expect(fieldVehicles).toContain('vehicle-verification');
    expect(fieldVehicles).toContain('href="/vehicles/registry"');
    const observationDetail = readSource(
      'src/app/field/vehicles/[observationId]/page.tsx',
    );
    expect(observationDetail).toContain('VehicleObservationDetail');
    const offline = readSource('src/app/field/offline/page.tsx');
    expect(offline).toContain('OfflineQueueStatus');

    // Vehicle registry keeps its forms and field deep link.
    const registry = readSource('src/app/vehicles/registry/page.tsx');
    expect(registry).toContain('RegistryForm');
    expect(registry).toContain('RegistryList');
    expect(registry).toContain("canEnterEntry(current, ['vehicle-registry'])");
    expect(registry).toContain('href="/field/vehicles"');

    // Map keeps its workspace, entry gate and parcel deep-link context.
    const mapPage = readSource('src/app/map/page.tsx');
    expect(mapPage).toContain('MapWorkspace');
    expect(mapPage).toContain("canEnterEntry(current, ['map-workspace'])");
    expect(mapPage).toContain('parcelId');

    // Identity surfaces keep their children, API callers and cross-links.
    const identity = readSource('src/app/identity/page.tsx');
    expect(identity).toContain('href="/assignments"');
    expect(identity).toContain('href="/users"');
    const users = readSource('src/app/users/page.tsx');
    expect(users).toContain('listIdentityUsers(current)');
    expect(users).toContain('listOrganizationUnits(current)');
    expect(users).toContain('CreateUserForm');
    const assignments = readSource('src/app/assignments/page.tsx');
    expect(assignments).toContain('AssignmentWorkspace');
    expect(assignments).toContain('identity-assignments');

    // Land queues/details keep children, gates, masking and back links.
    expect(readSource('src/app/land/applications/page.tsx')).toContain(
      'ApplicationQueue',
    );
    const appDetail = readSource(
      'src/app/land/applications/[applicationId]/page.tsx',
    );
    expect(appDetail).toContain('ApplicationDetail');
    expect(appDetail).toContain('href="/land/applications"');
    const parcelDetail = readSource('src/app/land/parcels/[parcelId]/page.tsx');
    expect(parcelDetail).toContain('ParcelDetail');
    expect(parcelDetail).toContain('href="/land/parcels"');
    expect(readSource('src/app/land/applications/new/page.tsx')).toContain(
      'ApplicationForm',
    );
    // Masking stays in the domain component contract.
    expect(readSource('src/components/land/ParcelDetail.tsx')).toContain(
      'maskedPartyLabel',
    );
  });

  it('preserves unauthenticated existing auth boundaries', () => {
    // Layout shells pass unauthenticated children through without redirect.
    for (const path of [
      'src/app/vehicles/layout.tsx',
      'src/app/incidents/layout.tsx',
      'src/app/inspections/layout.tsx',
      'src/app/map/layout.tsx',
    ] as const) {
      const source = readSource(path);
      expect(source).toContain('if (!current)');
      expect(source).toContain('<>{children}</>');
      expect(source).not.toContain('redirect(');
      expect(source).not.toContain('router.push');
    }

    // Identity pages keep their login boundary without new redirects.
    for (const path of [
      'src/app/identity/page.tsx',
      'src/app/users/page.tsx',
      'src/app/assignments/page.tsx',
    ] as const) {
      const source = readSource(path);
      expect(source).toContain('if (!current)');
      expect(source).toContain('Cần đăng nhập');
      expect(source).not.toContain('redirect(');
      expect(source).not.toContain('router.push');
    }

    // Land queue keeps its nullable-session boundary (no login redirect).
    const landQueue = readSource('src/app/land/page.tsx');
    expect(landQueue).toContain('current !== null &&');
    expect(landQueue).not.toContain('redirect(');

    // Field shell adds no gate: ModuleShell itself renders the login notice.
    const fieldLayout = readSource('src/app/field/layout.tsx');
    expect(fieldLayout).not.toContain('getCurrentUser');
    expect(fieldLayout).not.toContain('redirect(');
    expect(readSource('src/components/shell/ModuleShell.tsx')).toContain(
      'Đăng nhập để xem điều hướng',
    );
  });
});
