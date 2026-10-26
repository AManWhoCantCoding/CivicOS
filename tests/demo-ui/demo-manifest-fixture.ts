import {
  DEMO_MANIFEST_VERSION,
  type DemoManifest,
} from '@/modules/demo/manifest';

export function makeValidManifest(
  overrides: Partial<DemoManifest> = {},
): DemoManifest {
  return {
    version: DEMO_MANIFEST_VERSION,
    scenarioId: 'scenario-01',
    sceneId: 'scene-01',
    surface: 'web',
    personaAlias: 'demo-guide',
    precondition: 'Target civicos da san sang.',
    explanation: 'Huong dan demo tung buoc bang tieng Viet.',
    expectedState: 'completed',
    mutationClass: 'none',
    cleanupPolicy: 'Khong co mutation nen khong can cleanup.',
    blockedPolicy: 'Dung lai va hien thi trang thai blocked.',
    steps: [
      { id: 'step-1', action: 'navigate', expectedState: 'running' },
      { id: 'step-2', action: 'click', expectedState: 'running' },
    ],
    ...overrides,
  };
}
