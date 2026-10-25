import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

type UixSlice = 'UIX-01' | 'UIX-02' | 'UIX-03' | 'UIX-04' | 'UIX-05';

type SurfaceMatrixRow = {
  slice: UixSlice;
  surface: string;
  routes: string[];
  sources: string[];
  regressionTests: string[];
};

const surfaceMatrix: SurfaceMatrixRow[] = [
  {
    slice: 'UIX-01',
    surface: 'Shared foundation and land anchor',
    routes: ['/', '/land'],
    sources: [
      'src/app/globals.css',
      'src/app/page.tsx',
      'src/app/land/page.tsx',
    ],
    regressionTests: [
      'tests/uiux-alignment/foundation.test.tsx',
      'tests/uiux-alignment/web-shell.test.tsx',
    ],
  },
  {
    slice: 'UIX-02',
    surface: 'Web shell and identity/access',
    routes: ['/login', '/identity', '/users', '/assignments'],
    sources: [
      'src/components/shell/ModuleShell.tsx',
      'src/components/navigation/ModuleSidebar.tsx',
      'src/components/navigation/feature-registry.ts',
      'src/app/login/page.tsx',
      'src/app/identity/page.tsx',
      'src/app/users/page.tsx',
      'src/app/assignments/page.tsx',
    ],
    regressionTests: [
      'tests/uiux-alignment/web-shell.test.tsx',
      'tests/uiux-alignment/identity-access.test.tsx',
    ],
  },
  {
    slice: 'UIX-03',
    surface: 'Web operational/domain surfaces',
    routes: [
      '/residents',
      '/residents/:subjectId',
      '/residents/reports',
      '/intake',
      '/intake/:reportId',
      '/incidents',
      '/incidents/:incidentId',
      '/inspections/establishments',
      '/inspections/establishments/:establishmentId',
      '/inspections/:inspectionId',
      '/vehicles/registry',
      '/field/vehicles',
      '/field/vehicles/:observationId',
      '/field/offline',
    ],
    sources: [
      'src/app/residents/page.tsx',
      'src/app/intake/page.tsx',
      'src/app/incidents/page.tsx',
      'src/app/inspections/establishments/page.tsx',
      'src/app/vehicles/registry/page.tsx',
      'src/app/field/vehicles/page.tsx',
      'src/app/field/offline/page.tsx',
    ],
    regressionTests: [
      'tests/uiux-alignment/residents.test.tsx',
      'tests/uiux-alignment/intake-incident.test.tsx',
      'tests/uiux-alignment/inspection.test.tsx',
      'tests/uiux-alignment/vehicles-field.test.tsx',
    ],
  },
  {
    slice: 'UIX-04',
    surface: 'Land, map and public/offline safety',
    routes: [
      '/land/applications',
      '/land/applications/new',
      '/land/applications/:applicationId',
      '/land/parcels',
      '/land/parcels/:parcelId',
      '/public/land/lookup',
      '/map?parcelId=:parcelId',
    ],
    sources: [
      'src/app/land/applications/page.tsx',
      'src/app/land/applications/new/page.tsx',
      'src/app/land/parcels/page.tsx',
      'src/app/public/land/lookup/page.tsx',
      'src/app/map/page.tsx',
      'src/components/map/MapWorkspace.tsx',
    ],
    regressionTests: [
      'tests/uiux-alignment/land-application.test.tsx',
      'tests/uiux-alignment/map-safe-states.test.tsx',
    ],
  },
  {
    slice: 'UIX-05',
    surface: 'Mobile auth/shell and read-only surfaces',
    routes: [
      'Map',
      'RelatedInfo',
      'Alarms',
      'Dispatches',
      'Tasks',
      'Incident',
      'Land',
      'Settings',
    ],
    sources: [
      'mobile/src/navigation/AppNavigator.tsx',
      'mobile/src/auth/LoginScreen.tsx',
      'mobile/src/components/States.tsx',
      'mobile/src/features/map/MapScreen.tsx',
      'mobile/src/features/related-info/RelatedInfoScreen.tsx',
      'mobile/src/features/alarm/AlarmScreen.tsx',
      'mobile/src/features/dispatch/DispatchScreen.tsx',
      'mobile/src/features/task/TaskScreen.tsx',
      'mobile/src/features/incident/IncidentScreen.tsx',
      'mobile/src/features/land/LandScreen.tsx',
      'mobile/src/features/settings/SettingsScreen.tsx',
    ],
    regressionTests: [
      'tests/uiux-alignment/mobile-auth-shell.test.tsx',
      'tests/uiux-alignment/mobile-domain.test.tsx',
      'mobile/src/features/__tests__/navigation-readonly.test.tsx',
      'mobile/src/features/__tests__/deepLinks.test.ts',
      'mobile/src/features/__tests__/land-parcel-map-offline.test.tsx',
    ],
  },
];

const stateMatrix = [
  {
    state: 'loading',
    source: 'src/components/shell/ModuleStatus.tsx',
    anchor: 'ModuleLoadingState',
  },
  {
    state: 'empty',
    source: 'src/components/shell/ModuleStatus.tsx',
    anchor: 'ModuleEmptyState',
  },
  {
    state: 'ready',
    source: 'src/components/shell/ModuleStatus.tsx',
    anchor: 'ModuleReadyState',
  },
  {
    state: 'stale',
    source: 'src/components/map/MapWorkspace.tsx',
    anchor: 'Dữ liệu bản đồ có thể đã cũ.',
  },
  {
    state: 'error',
    source: 'src/components/shell/ModuleStatus.tsx',
    anchor: 'ModuleErrorState',
  },
  {
    state: 'forbidden',
    source: 'src/components/identity/AccessDenied.tsx',
    anchor: 'Không có quyền truy cập',
  },
  {
    state: 'masked',
    source: 'mobile/src/components/States.tsx',
    anchor: 'MaskedValue',
  },
  {
    state: 'offline',
    source: 'src/components/shell/ModuleStatus.tsx',
    anchor: 'ModuleOfflineNotice',
  },
  {
    state: 'simulated',
    source: 'src/components/land/PublicLandLookup.tsx',
    anchor: 'Mô phỏng · simulated',
  },
] as const;

const mobileSources = [
  'mobile/src/features/map/MapScreen.tsx',
  'mobile/src/features/related-info/RelatedInfoScreen.tsx',
  'mobile/src/features/related-info/RelatedInfoDetail.tsx',
  'mobile/src/features/alarm/AlarmScreen.tsx',
  'mobile/src/features/dispatch/DispatchScreen.tsx',
  'mobile/src/features/task/TaskScreen.tsx',
  'mobile/src/features/incident/IncidentScreen.tsx',
  'mobile/src/features/land/LandScreen.tsx',
  'mobile/src/features/settings/SettingsScreen.tsx',
];

describe('T-013 cross-surface verification', () => {
  it('maps every UIX-01–UIX-05 surface to existing routes, source and regression tests', () => {
    expect([...new Set(surfaceMatrix.map((row) => row.slice))]).toEqual([
      'UIX-01',
      'UIX-02',
      'UIX-03',
      'UIX-04',
      'UIX-05',
    ]);

    for (const row of surfaceMatrix) {
      expect(row.routes.length, row.surface).toBeGreaterThan(0);
      for (const path of [...row.sources, ...row.regressionTests]) {
        expect(existsSync(join(process.cwd(), path)), path).toBe(true);
      }
    }

    expect(surfaceMatrix.flatMap((row) => row.routes)).toEqual(
      expect.arrayContaining([
        '/login',
        '/intake',
        '/incidents',
        '/inspections/establishments',
        '/residents',
        '/vehicles/registry',
        '/field/vehicles',
        '/land/applications',
        '/land/parcels',
        '/public/land/lookup',
        '/map?parcelId=:parcelId',
        'Map',
        'RelatedInfo',
        'Alarms',
        'Dispatches',
        'Tasks',
        'Incident',
        'Land',
        'Settings',
      ]),
    );
  });

  it('keeps route/back/deep-link/action edges inside the approved registry', () => {
    const navigation = readSource(
      '.scratch/civicos-uiux-alignment/ui/navigation-flow.md',
    );
    const prototype = readSource(
      '.scratch/civicos-uiux-alignment/ui/prototype/index.html',
    );
    const edges = [...prototype.matchAll(/data-edge="([^"]+)"/g)].map(
      (match) => match[1],
    );
    const uniqueEdges = [...new Set(edges)];

    expect(uniqueEdges).toHaveLength(33);
    expect(edges.length).toBeGreaterThan(uniqueEdges.length);
    for (const edge of uniqueEdges) expect(navigation).toContain(edge);

    const shell = readSource('src/components/shell/ModuleShell.tsx');
    const registry = readSource(
      'src/components/navigation/feature-registry.ts',
    );
    const deepLinks = readSource('mobile/src/navigation/deepLinks.ts');
    const navigator = readSource('mobile/src/navigation/AppNavigator.tsx');
    expect(shell).toContain('activeFeatureId');
    expect(registry).toContain('visibleFeatures');
    expect(deepLinks).toContain('return null;');
    expect(navigator).toContain('setContext(link.params)');
    expect(navigator).toContain('openMap(item, context)');
  });

  it('accounts for the locked state matrix without changing state meaning', () => {
    for (const { source, anchor } of stateMatrix) {
      expect(existsSync(join(process.cwd(), source)), source).toBe(true);
      expect(readSource(source), `${source} → ${anchor}`).toContain(anchor);
    }

    const prototype = readSource(
      '.scratch/civicos-uiux-alignment/ui/prototype/index.html',
    );
    for (const state of [
      'loading',
      'empty',
      'ready',
      'forbidden',
      'not-found',
      'stale',
      'offline',
      'error',
    ]) {
      expect(prototype).toContain(`data-state-value="${state}"`);
    }
    expect(prototype).toContain('const safeStates = new Set');
    expect(prototype).toContain('providerFrame.hidden = true');
    expect(prototype).toContain('providerFrame.hidden = false');
  });

  it('preserves masking/privacy, read-only mobile and no-offline-polygon guards', () => {
    const privacySources = [
      'src/components/identity/AccessDenied.tsx',
      'src/components/incidents/IntakeReportDetail.tsx',
      'src/components/residents/ResidentDetail.tsx',
      'src/components/land/ParcelDetail.tsx',
      'src/components/map/MapWorkspace.tsx',
      'mobile/src/features/incident/IncidentScreen.tsx',
      'mobile/src/features/related-info/RelatedInfoDetail.tsx',
    ];
    for (const path of privacySources) {
      const source = readSource(path);
      expect(source).not.toContain('dangerouslySetInnerHTML');
      expect(source).not.toContain('innerHTML');
      expect(source).not.toContain('console.');
    }

    const taskPath = 'mobile/src/features/task/TaskScreen.tsx';
    for (const path of mobileSources.filter((path) => path !== taskPath)) {
      const source = readSource(path);
      expect(source).not.toMatch(
        /Tạo hồ sơ|Tạo mới|Gửi hồ sơ|Phê duyệt|Từ chối|Đồng bộ|Phân công|submitOffline|public-intake|CitizenIntake/i,
      );
      expect(source).not.toMatch(/\bapprove\b|\bupload\b/i);
    }
    const task = readSource(taskPath);
    for (const command of [
      'resident.record_activity',
      'inspection.start',
      'inspection.save_checklist',
      'inspection.finding',
    ])
      expect(task).toContain(command);
    expect(task).not.toContain('submitOffline');
    expect(task).not.toMatch(/public-intake|CitizenIntake/i);

    const mobileMap = readSource('mobile/src/features/map/MapScreen.tsx');
    const webMap = readSource('src/components/map/MapWorkspace.tsx');
    expect(mobileMap).toContain('isLandParcelFocusOffline()');
    expect(mobileMap).toContain('setLandParcel(null)');
    expect(webMap).toContain("focusStatus === 'ready'");
    expect(webMap).toContain('!focusStale');
    expect(webMap).toContain('online');
    expect(webMap).toContain('isFocusPolygonGeometry');
  });

  it('keeps keyboard/focus, accessible state copy, responsive labels and reduced-motion seams traceable', () => {
    const globals = readSource('src/app/globals.css');
    const webShell = readSource('src/components/shell/ModuleShell.tsx');
    const webSidebar = readSource(
      'src/components/navigation/ModuleSidebar.tsx',
    );
    const mobileStates = readSource('mobile/src/components/States.tsx');
    const prototype = readSource(
      '.scratch/civicos-uiux-alignment/ui/prototype/index.html',
    );

    expect(globals).toContain(':focus-visible');
    expect(globals).toContain('prefers-reduced-motion');
    expect(globals).toContain('--civicos-control-min: 44px');
    expect(webShell).toContain('min-h-[44px]');
    expect(webShell).toContain('max-w-[85vw]');
    expect(webSidebar).toContain('truncate');
    expect(mobileStates).toContain('controlMin: 44');
    expect(mobileStates).toContain('accessibilityLabel="Thử lại"');
    expect(prototype).toContain('prefers-reduced-motion: reduce');
    expect(prototype).toContain('button {');
    expect(prototype).toContain('min-height: 44px');
  });
});
