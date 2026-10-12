import { resolveNativeRecovery } from '../recovery';

describe('native demo recovery mapping', () => {
  it('maps existing DataState vocabulary without side effects', () => {
    expect(resolveNativeRecovery({ state: 'offline' })).toMatchObject({
      state: 'offline',
      reason: 'DEMO_STATE_OFFLINE',
      status: 'observed',
    });
    expect(resolveNativeRecovery({ state: 'masked' }).label).toBe(
      'Thông tin đã được che',
    );
  });

  it('blocks unavailable providers and devices', () => {
    expect(
      resolveNativeRecovery({ dependency: 'device', state: 'unavailable' }),
    ).toMatchObject({
      state: 'dependency-unavailable',
      status: 'blocked',
      reason: 'DEMO_DEPENDENCY_UNAVAILABLE',
    });
  });
});
