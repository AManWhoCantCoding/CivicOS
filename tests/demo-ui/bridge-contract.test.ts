import { describe, expect, it } from 'vitest';

import {
  BRIDGE_MODE,
  BRIDGE_ORIGINS,
  BRIDGE_TARGET,
  serializeBridgeCommand,
  validateBridgeCommand,
} from '@/modules/demo/bridge';
import { DEMO_ACTIONS, DEMO_MANIFEST_VERSION } from '@/modules/demo/manifest';

function validCommand(overrides: Record<string, unknown> = {}) {
  return {
    mode: 'LIVE_DEMO',
    target: 'civicos_demo',
    origin: 'local',
    manifestVersion: DEMO_MANIFEST_VERSION,
    sceneId: 'scene-01',
    stepId: 'step-1',
    action: 'native-tap',
    surface: 'mobile',
    ...overrides,
  };
}

describe('T-008 bridge contract shape', () => {
  it('locks the LIVE_DEMO + civicos_demo + local/demo boundary', () => {
    expect(BRIDGE_MODE).toBe('LIVE_DEMO');
    expect(BRIDGE_TARGET).toBe('civicos_demo');
    expect([...BRIDGE_ORIGINS].sort()).toEqual(['demo', 'local']);
  });

  it('normalizes a valid mobile command to the allowlisted descriptor', () => {
    const result = validateBridgeCommand(validCommand({ origin: 'demo' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.command).toEqual({
      mode: 'LIVE_DEMO',
      target: 'civicos_demo',
      origin: 'demo',
      manifestVersion: DEMO_MANIFEST_VERSION,
      sceneId: 'scene-01',
      stepId: 'step-1',
      action: 'native-tap',
      surface: 'mobile',
    });
  });

  it('accepts every closed action vocabulary member', () => {
    for (const action of DEMO_ACTIONS) {
      const result = validateBridgeCommand(validCommand({ action }));
      expect(result.ok).toBe(true);
    }
  });

  it('rejects missing scene/step ids without a side effect', () => {
    for (const command of [
      validCommand({ sceneId: '' }),
      validCommand({ stepId: '   ' }),
      validCommand({ sceneId: undefined }),
    ]) {
      const result = validateBridgeCommand(command);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.reason).toBe('BRIDGE_ID_MISSING');
    }
  });

  it('rejects stale manifest versions and unknown actions', () => {
    const stale = validateBridgeCommand(validCommand({ manifestVersion: '0' }));
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.reason).toBe('BRIDGE_VERSION_UNSUPPORTED');

    const unknownAction = validateBridgeCommand(
      validCommand({ action: 'double-tap' }),
    );
    expect(unknownAction.ok).toBe(false);
    if (!unknownAction.ok)
      expect(unknownAction.reason).toBe('BRIDGE_UNKNOWN_ACTION');
  });

  it('serializes only the allowlisted keys as JSON', () => {
    const validated = validateBridgeCommand(validCommand());
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const json = serializeBridgeCommand(validated.command);
    expect(JSON.parse(json)).toEqual({
      mode: 'LIVE_DEMO',
      target: 'civicos_demo',
      origin: 'local',
      manifestVersion: DEMO_MANIFEST_VERSION,
      sceneId: 'scene-01',
      stepId: 'step-1',
      action: 'native-tap',
      surface: 'mobile',
    });
    expect(Object.keys(JSON.parse(json)).sort()).toEqual(
      [
        'action',
        'manifestVersion',
        'mode',
        'origin',
        'sceneId',
        'stepId',
        'surface',
        'target',
      ].sort(),
    );
  });

  it('rejects forged commands at the serialization boundary', () => {
    expect(() =>
      serializeBridgeCommand(
        validCommand({
          action: 'javascript:alert(1)',
          token: 'secret',
        }) as never,
      ),
    ).toThrow('BRIDGE_UNKNOWN_ACTION');
  });
});
