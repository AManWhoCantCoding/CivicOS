import { DEMO_MANIFEST_VERSION, type DemoManifest } from '../manifest';
import type { DemoPersonaAlias } from '../persona-broker';

export const WEB_SCENARIO_CATALOG_VERSION = DEMO_MANIFEST_VERSION;

export type WebScenarioDomain =
  | 'incident'
  | 'inspection'
  | 'vehicle'
  | 'resident'
  | 'map'
  | 'identity'
  | 'land';

export type WebScenarioEvidence = {
  sources: readonly string[];
  tests: readonly string[];
  docs: readonly string[];
};

export type WebScenarioEntry = {
  id: string;
  domain: WebScenarioDomain;
  personaAlias: DemoPersonaAlias;
  entryRoute: string;
  /** Null only for public routes with no feature-registry entry. */
  featureId: string | null;
  heading: string;
  manifest: DemoManifest;
  evidence: WebScenarioEvidence;
};

export type BlockedWebScenario = {
  id: string;
  domain: WebScenarioDomain;
  reason: string;
  detail: string;
};

export type WebScenarioResolution =
  | { status: 'ready'; entry: WebScenarioEntry }
  | { status: 'unsupported'; reason: 'UNKNOWN_SCENARIO' }
  | { status: 'blocked'; reason: string };

function readOnlyManifest(
  id: string,
  personaAlias: DemoPersonaAlias,
  route: string,
  heading: string,
  precondition: string,
  explanation: string,
  navigateFirst = true,
): DemoManifest {
  // Operator-entry scenes (public routes with no nav entry) skip the visible
  // `navigate` link step: the operator opens the route directly and the runner
  // only observes readiness and state. Never synthesize URL assignment.
  const steps: DemoManifest['steps'] = navigateFirst
    ? [
        {
          id: 'go',
          action: 'navigate',
          detail: JSON.stringify({ path: route }),
        },
      ]
    : [];
  return {
    version: DEMO_MANIFEST_VERSION,
    scenarioId: id,
    sceneId: `${id}-scene`,
    surface: 'web',
    personaAlias,
    precondition,
    explanation,
    expectedState: 'completed',
    mutationClass: 'none',
    cleanupPolicy: 'Chỉ đọc, không thay đổi dữ liệu nên không cần dọn dẹp.',
    blockedPolicy:
      'Dừng lại và giữ nguyên trạng thái không có quyền hoặc danh sách trống; không thực hiện thêm thao tác nào.',
    steps: [
      ...steps,
      {
        id: 'ready',
        action: 'wait-ready',
        detail: JSON.stringify({ path: route, text: heading }),
      },
      {
        id: 'state',
        action: 'assert-state',
        detail: JSON.stringify({ text: heading }),
      },
    ],
  };
}

function scene(
  id: string,
  domain: WebScenarioDomain,
  personaAlias: DemoPersonaAlias,
  entryRoute: string,
  featureId: string | null,
  heading: string,
  precondition: string,
  explanation: string,
  evidence: WebScenarioEvidence,
  navigateFirst = true,
): WebScenarioEntry {
  return {
    id,
    domain,
    personaAlias,
    entryRoute,
    featureId,
    heading,
    manifest: readOnlyManifest(
      id,
      personaAlias,
      entryRoute,
      heading,
      precondition,
      explanation,
      navigateFirst,
    ),
    evidence,
  };
}

const UI_MAP = 'docs/UI-map.md';
const DEMO_SCRIPT = 'docs/demo-script.md';
const REGISTRY = 'src/components/navigation/feature-registry.ts';
const SHELL_SPEC = 'tests/e2e/module-shell.spec.ts';

const COMMANDER_READY =
  'Đã đăng nhập persona demo commander trên target civicos_demo.';
const DUTY_READY = 'Đã đăng nhập persona demo duty trên target civicos_demo.';
const OFFICE_READY =
  'Đã đăng nhập persona demo office trên target civicos_demo.';
const FIELD_READY = 'Đã đăng nhập persona demo field trên target civicos_demo.';

// Evidence-backed read/navigation catalog. Every entry traces to an existing
// route/component/source or test anchor; live mutation belongs to T-007.
export const WEB_SCENARIO_CATALOG: readonly WebScenarioEntry[] = Object.freeze([
  scene(
    'web-incident-queue',
    'incident',
    'commander',
    '/incidents',
    'incident-queue',
    'Hàng đợi Incident',
    COMMANDER_READY,
    'Mở hàng đợi Incident và đọc trạng thái danh sách đang hiển thị.',
    {
      sources: ['src/app/incidents/page.tsx', REGISTRY],
      tests: [SHELL_SPEC, 'tests/e2e/ps005-incident.spec.ts'],
      docs: [UI_MAP, DEMO_SCRIPT],
    },
  ),
  scene(
    'web-intake-reports',
    'incident',
    'duty',
    '/intake',
    'incident-intake',
    'Ghi nhận tin báo',
    DUTY_READY,
    'Mở hàng đợi tiếp nhận và đọc trạng thái danh sách IntakeReport đang hiển thị.',
    {
      sources: ['src/app/intake/page.tsx', REGISTRY],
      tests: [SHELL_SPEC],
      docs: [UI_MAP, DEMO_SCRIPT],
    },
  ),
  scene(
    'web-inspection-catalogue',
    'inspection',
    'office',
    '/inspections/establishments',
    'inspection-catalogue',
    'Cơ sở kinh doanh',
    OFFICE_READY,
    'Mở danh mục cơ sở và đọc trạng thái danh sách đang hiển thị.',
    {
      sources: ['src/app/inspections/establishments/page.tsx', REGISTRY],
      tests: [SHELL_SPEC, 'tests/e2e/ps007-inspection.spec.ts'],
      docs: [UI_MAP, DEMO_SCRIPT],
    },
  ),
  scene(
    'web-vehicle-registry',
    'vehicle',
    'commander',
    '/vehicles/registry',
    'vehicle-registry',
    'Registry xe cần chú ý',
    COMMANDER_READY,
    'Mở registry xe và đọc trạng thái danh sách đang hiển thị.',
    {
      sources: ['src/app/vehicles/registry/page.tsx', REGISTRY],
      tests: [SHELL_SPEC, 'tests/e2e/ps009-vehicle-watch.spec.ts'],
      docs: [UI_MAP, DEMO_SCRIPT],
    },
  ),
  scene(
    'web-vehicle-field',
    'vehicle',
    'field',
    '/field/vehicles',
    'vehicle-observation',
    'Phương tiện tại hiện trường',
    FIELD_READY,
    'Mở khu vực quan sát hiện trường và đọc trạng thái danh sách đang hiển thị.',
    {
      sources: ['src/app/field/vehicles/page.tsx', REGISTRY],
      tests: [
        'tests/e2e/field-shell.spec.ts',
        'tests/e2e/ps009-vehicle-watch.spec.ts',
      ],
      docs: [UI_MAP, DEMO_SCRIPT],
    },
  ),
  scene(
    'web-resident-list',
    'resident',
    'commander',
    '/residents',
    'resident-list',
    'Danh sách cư dân đặc biệt',
    COMMANDER_READY,
    'Mở danh sách cư dân và đọc trạng thái danh sách đã che đang hiển thị.',
    {
      sources: ['src/app/residents/page.tsx', REGISTRY],
      tests: [SHELL_SPEC, 'tests/e2e/ps004-resident.spec.ts'],
      docs: [UI_MAP, DEMO_SCRIPT],
    },
  ),
  scene(
    'web-map-workspace',
    'map',
    'commander',
    '/map',
    'map-workspace',
    'Bản đồ nghiệp vụ',
    COMMANDER_READY,
    'Mở workspace bản đồ và đọc trạng thái lớp dữ liệu đang hiển thị.',
    {
      sources: ['src/app/map/page.tsx', REGISTRY],
      tests: [SHELL_SPEC],
      docs: [UI_MAP, DEMO_SCRIPT],
    },
  ),
  scene(
    'web-identity-assignments',
    'identity',
    'commander',
    '/assignments',
    'identity-assignments',
    'Phân công theo hồ sơ',
    COMMANDER_READY,
    'Mở workspace Assignment và đọc trạng thái phân công đang hiển thị.',
    {
      sources: ['src/app/assignments/page.tsx', REGISTRY],
      tests: [SHELL_SPEC, 'tests/e2e/login-and-access.spec.ts'],
      docs: [UI_MAP, DEMO_SCRIPT],
    },
  ),
  scene(
    'web-land-public-lookup',
    'land',
    'commander',
    '/public/land/lookup',
    null,
    'Tra cứu hồ sơ đất đai',
    'Trên target civicos_demo; operator mở trực tiếp trang tra cứu công khai, runner chỉ kiểm tra trạng thái sẵn sàng.',
    'Đọc trạng thái tra cứu mô phỏng đang hiển thị trên trang công khai.',
    {
      sources: [
        'src/app/public/land/lookup/page.tsx',
        'src/components/land/PublicLandLookup.tsx',
      ],
      tests: ['tests/land-ui/lnd15-web-public-lookup.test.ts'],
      docs: [UI_MAP, DEMO_SCRIPT],
    },
    false,
  ),
]);

// Internal paths without brokered persona or Assignment evidence stay
// explicitly blocked instead of faked.
export const BLOCKED_WEB_SCENARIOS: readonly BlockedWebScenario[] =
  Object.freeze([
    {
      id: 'web-land-internal-parcels',
      domain: 'land',
      reason: 'NO_BROKERED_LAND_PERSONA',
      detail:
        'Internal land parcels need a land_review Assignment held by a land role; ' +
        'the demo persona broker only allowlists commander, duty, field, office ' +
        'and unassigned, so this scene stays blocked until brokered land persona ' +
        'evidence exists. See src/modules/demo/persona-broker.ts and ' +
        'src/components/navigation/feature-registry.ts.',
    },
  ]);

export function resolveWebScenario(id: unknown): WebScenarioResolution {
  if (typeof id !== 'string' || !id.trim()) {
    return { status: 'unsupported', reason: 'UNKNOWN_SCENARIO' };
  }
  const key = id.trim();
  const entry = WEB_SCENARIO_CATALOG.find((item) => item.id === key);
  if (entry) return { status: 'ready', entry };
  const blocked = BLOCKED_WEB_SCENARIOS.find((item) => item.id === key);
  if (blocked) return { status: 'blocked', reason: blocked.reason };
  return { status: 'unsupported', reason: 'UNKNOWN_SCENARIO' };
}
