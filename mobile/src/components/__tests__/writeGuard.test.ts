import { assertReadOnly } from '../WriteGuard';

describe('read-only guard', () => {
  it('blocks all write commands and never produces a request', () => {
    expect(assertReadOnly('POST', true)).toEqual({
      allowed: false,
      reason: 'MAP_OFFLINE_WRITE_BLOCKED',
    });
    expect(assertReadOnly('PATCH', false)).toEqual({
      allowed: false,
      reason: 'READ_ONLY_MVP',
    });
  });

  it('allows only the session login/logout boundary', () => {
    expect(assertReadOnly('POST', false, '/api/auth/session')).toBeNull();
    expect(assertReadOnly('DELETE', false, '/api/auth/session')).toBeNull();
    expect(assertReadOnly('POST', false, '/api/related-info/search')).toEqual({
      allowed: false,
      reason: 'READ_ONLY_MVP',
    });
  });
});
