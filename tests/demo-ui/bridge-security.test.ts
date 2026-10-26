import { describe, expect, it, vi } from 'vitest';

import {
  normalizeBridgeResult,
  sendBridgeCommand,
  validateBridgeCommand,
} from '@/modules/demo/bridge';

function validCommand(overrides: Record<string, unknown> = {}) {
  return {
    mode: 'LIVE_DEMO',
    target: 'civicos',
    origin: 'local',
    manifestVersion: '1',
    sceneId: 'scene-01',
    stepId: 'step-1',
    action: 'native-tap',
    surface: 'mobile',
    ...overrides,
  };
}

describe('T-008 bridge security boundary', () => {
  it('rejects stale demo, lookalike and unknown targets', () => {
    for (const target of [
      'civicos_demo',
      'civicos_demo_shadow',
      'unknown',
      '',
    ]) {
      const result = validateBridgeCommand(validCommand({ target }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('BRIDGE_FORBIDDEN_TARGET');
    }
  });

  it('rejects production and unknown origins', () => {
    for (const origin of ['production', 'web', 'unknown', '']) {
      const result = validateBridgeCommand(validCommand({ origin }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('BRIDGE_FORBIDDEN_ORIGIN');
    }
  });

  it('rejects stale mode and malformed shapes', () => {
    const staleMode = validateBridgeCommand(
      validCommand({ mode: 'LIVE_PROD' }),
    );
    expect(staleMode.ok).toBe(false);
    if (!staleMode.ok) expect(staleMode.reason).toBe('BRIDGE_STALE_MODE');

    for (const malformed of [null, undefined, 'native-tap', 42, []]) {
      const result = validateBridgeCommand(malformed);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('BRIDGE_INVALID_SHAPE');
    }
  });

  it('rejects secret, raw-body, PII and arbitrary-JS fields', () => {
    const payloads = [
      validCommand({ body: 'raw response' }),
      validCommand({ token: 's3cret' }),
      validCommand({ password: 'hidden' }),
      validCommand({ credential: 'hidden' }),
      validCommand({ responseBody: '{}' }),
      validCommand({ email: 'guide@civicos.local' }),
      validCommand({ script: '<script>alert(1)</script>' }),
      validCommand({ databaseUrl: 'postgresql://x/civicos_demo' }),
      validCommand({ extraField: 'not-allowlisted' }),
    ];
    for (const payload of payloads) {
      const result = validateBridgeCommand(payload);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('BRIDGE_UNSAFE_CONTENT');
    }
  });

  it('never invokes the injected transport for rejected commands', async () => {
    const transport = vi.fn(async () => ({
      sceneId: 'scene-01',
      stepId: 'step-1',
      action: 'native-tap',
      status: 'ready' as const,
      state: 'settled' as const,
      reason: 'DEMO_STEP_SETTLED',
      durationMs: 120,
    }));
    const rejected = [
      validCommand({ target: 'civicos_demo' }),
      validCommand({ origin: 'production' }),
      validCommand({ mode: 'LIVE_PROD' }),
      validCommand({ manifestVersion: '0' }),
      validCommand({ action: 'double-tap' }),
      validCommand({ token: 's3cret' }),
      validCommand({ body: 'raw' }),
    ];
    for (const command of rejected) {
      const outcome = await sendBridgeCommand({ command, transport });
      expect(outcome.ok).toBe(false);
    }
    expect(transport).not.toHaveBeenCalled();
  });

  it('bounds result duration and allowlists result state/reason codes', () => {
    const base = {
      sceneId: 'scene-01',
      stepId: 'step-1',
      action: 'native-tap',
      status: 'blocked',
      state: 'blocked',
      reason: 'DEMO_STEP_BLOCKED',
      durationMs: 250,
    };
    expect(normalizeBridgeResult(base).ok).toBe(true);

    const tooLong = normalizeBridgeResult({ ...base, durationMs: 999_999_999 });
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok)
      expect(tooLong.reason).toBe('BRIDGE_RESULT_DURATION_OUT_OF_BOUNDS');

    const badState = normalizeBridgeResult({ ...base, state: 'started' });
    expect(badState.ok).toBe(false);
    if (!badState.ok)
      expect(badState.reason).toBe('BRIDGE_RESULT_UNKNOWN_STATE');

    const badReason = normalizeBridgeResult({
      ...base,
      reason: 'alert(1)',
    });
    expect(badReason.ok).toBe(false);
    if (!badReason.ok)
      expect(badReason.reason).toBe('BRIDGE_RESULT_UNKNOWN_REASON');

    const secretResult = normalizeBridgeResult({ ...base, token: 's3cret' });
    expect(secretResult.ok).toBe(false);
    if (!secretResult.ok)
      expect(secretResult.reason).toBe('BRIDGE_UNSAFE_CONTENT');
  });
});
