import { describe, expect, it, vi } from 'vitest';

import { startDemoFlow } from '@/components/demo/DemoCenter';
import { makeValidManifest } from '../demo-ui/demo-manifest-fixture';

describe('T-010 dependency failure', () => {
  it.each(['bridge', 'device', 'worker', 'map', 'persona', 'target'])(
    'blocks %s before persona or executor work',
    async () => {
      const persona = vi.fn();
      const executor = vi.fn();
      const result = await startDemoFlow({
        target: {
          state: 'blocked',
          canStart: false,
          reason: 'DEMO_DEPENDENCY_UNAVAILABLE',
          target: 'civicos',
          web: 'unavailable',
          message: 'safe prerequisite',
        },
        manifest: makeValidManifest(),
        personaSwitch: persona,
        reloadScope: vi.fn(),
        runnerStart: executor,
      });
      expect(result).toEqual({
        status: 'blocked',
        reason: 'DEMO_DEPENDENCY_UNAVAILABLE',
      });
      expect(persona).not.toHaveBeenCalled();
      expect(executor).not.toHaveBeenCalled();
    },
  );
});
