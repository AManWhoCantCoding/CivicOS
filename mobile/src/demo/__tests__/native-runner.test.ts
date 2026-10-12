import {
  deepLinkIntent,
  normalizeNativeResult,
  resolveNativeIntent,
  runNativeCommand,
  serializeNativeResult,
  validateNativeCommand,
} from '../native-runner';

const command = (action = 'native-tap') => ({
  mode: 'LIVE_DEMO',
  target: 'civicos_demo',
  origin: 'local',
  manifestVersion: '1',
  sceneId: 'scene-1',
  stepId: 'step-1',
  action,
  surface: 'mobile',
});

describe('native read-only runner', () => {
  it('accepts only the closed descriptor boundary', () => {
    expect(validateNativeCommand(command()).ok).toBe(true);
    expect(validateNativeCommand({ ...command(), token: 'secret' }).ok).toBe(
      false,
    );
    expect(
      validateNativeCommand({ ...command(), manifestVersion: '2' }),
    ).toEqual({ ok: false, reason: 'BRIDGE_VERSION_UNSUPPORTED' });
    expect(
      validateNativeCommand({
        ...command(),
        sceneId: ' scene-1 ',
        action: ' native-tap ',
      }),
    ).toMatchObject({
      ok: true,
      command: { sceneId: 'scene-1', action: 'native-tap' },
    });
  });
  it('blocks before any callback or navigation for writes and unauthenticated sessions', () => {
    expect(
      runNativeCommand({
        command: command('submit'),
        authenticated: true,
        scene: { intent: { type: 'tab', route: 'Map' } },
      }).reason,
    ).toBe('READ_ONLY_MVP');
    expect(
      runNativeCommand({
        command: command('submit'),
        authenticated: true,
        scene: { writeMethod: 'GET', intent: { type: 'tab', route: 'Map' } },
      }).reason,
    ).toBe('READ_ONLY_MVP');
    expect(
      runNativeCommand({
        command: command(),
        authenticated: true,
        scene: { writeMethod: 'POST', intent: { type: 'tab', route: 'Map' } },
      }).reason,
    ).toBe('READ_ONLY_MVP');
    expect(
      runNativeCommand({
        command: {
          ...command(),
          sceneId: { token: 'secret' },
          action: { password: 'x' },
        },
        authenticated: true,
      }),
    ).toMatchObject({ sceneId: 'unknown', action: 'unknown' });
    expect(
      runNativeCommand({ command: command(), authenticated: false }).reason,
    ).toBe('NATIVE_SESSION_REQUIRED');
  });
  it('serializes only safe result fields', () => {
    const result = runNativeCommand({
      command: command(),
      authenticated: true,
      scene: { intent: { type: 'tab', route: 'Map' } },
    });
    expect(JSON.parse(serializeNativeResult(result))).toEqual(result);
    expect(serializeNativeResult(result)).not.toContain('token');
  });
  it('maps normalized tabs, RelatedInfo filters, and authoritative deep links', () => {
    expect(
      resolveNativeIntent({ intent: { type: 'tab', route: 'Map' } }),
    ).toEqual({ type: 'tab', route: 'Map' });
    expect(
      resolveNativeIntent({
        intent: { type: 'tab', route: 'Map', secret: 'x' },
      }),
    ).toEqual({ type: 'unsupported' });
    expect(
      resolveNativeIntent({
        intent: {
          type: 'related-info',
          query: 'patrol',
          status: 'open',
          entityType: 'RESIDENT',
        },
      }),
    ).toEqual({
      type: 'related-info',
      query: 'patrol',
      status: 'open',
      entityType: 'RESIDENT',
    });
    expect(
      resolveNativeIntent({
        intent: { type: 'related-info', query: 'patrol', extra: true },
      }),
    ).toEqual({ type: 'unsupported' });
    expect(
      resolveNativeIntent({
        intent: {
          type: 'deep-link',
          link: {
            route: 'Map',
            params: {
              incidentId: 'incident-1',
              resourceId: 'vehicle-1',
              resourceType: 'VehicleObservation',
            },
          },
        },
      }),
    ).toMatchObject({ type: 'deep-link', link: { route: 'Incident' } });
  });
  it('uses existing deep-link precedence and rejects unsafe context', () => {
    expect(
      deepLinkIntent({ incidentId: 'incident-1', resourceType: 'Incident' }),
    ).toMatchObject({ type: 'deep-link', link: { route: 'Incident' } });
    expect(
      deepLinkIntent({
        resourceId: 'vehicle-1',
        resourceType: 'VehicleObservation',
      }),
    ).toMatchObject({
      type: 'deep-link',
      link: { route: 'VehicleObservationDetail' },
    });
    expect(
      deepLinkIntent({ coordinates: { lat: Number.NaN, lng: 1 } }),
    ).toEqual({ type: 'unsupported' });
    expect(
      deepLinkIntent({ coordinates: { lat: 1, lng: 2, secret: 'x' } } as never),
    ).toEqual({ type: 'unsupported' });
    expect(() => deepLinkIntent(null as never)).not.toThrow();
  });
  it('normalizes forged results and rejects unsafe result fields', () => {
    const result = runNativeCommand({
      command: command(),
      authenticated: true,
      scene: { intent: { type: 'tab', route: 'Map' } },
    });
    expect(normalizeNativeResult(result)).toMatchObject({ ok: true, result });
    expect(normalizeNativeResult({ ...result, token: 'secret' })).toEqual({
      ok: false,
      reason: 'BRIDGE_UNSAFE_CONTENT',
    });
    expect(() =>
      serializeNativeResult({
        ...result,
        durationMs: Number.POSITIVE_INFINITY,
      }),
    ).toThrow('BRIDGE_RESULT_DURATION_OUT_OF_BOUNDS');
    const malformed = runNativeCommand({
      command: {
        ...command(),
        sceneId: 'email@example.test',
        action: { token: 'secret' },
      },
      authenticated: true,
    });
    expect(() => serializeNativeResult(malformed)).not.toThrow();
    expect(serializeNativeResult(malformed)).not.toContain(
      'email@example.test',
    );
    expect(serializeNativeResult(malformed)).not.toContain('secret');
  });
  it('blocks malformed scene descriptors without settling', () => {
    expect(
      runNativeCommand({
        command: command(),
        authenticated: true,
        scene: { intent: { type: 'tab', route: 'Map' }, writeMethod: 123 },
      }).reason,
    ).toBe('DEMO_STEP_INVALID_DESCRIPTOR');
    expect(
      runNativeCommand({
        command: command(),
        authenticated: true,
        scene: {
          intent: { type: 'tab', route: 'Map' },
          writePath: { token: 'x' },
        },
      }).reason,
    ).toBe('DEMO_STEP_INVALID_DESCRIPTOR');
  });
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'blocks domain write descriptor %s before intent dispatch',
    (writeMethod) => {
      expect(
        runNativeCommand({
          command: command(),
          authenticated: true,
          scene: { writeMethod, intent: { type: 'tab', route: 'Map' } },
        }).reason,
      ).toBe('READ_ONLY_MVP');
    },
  );
});
