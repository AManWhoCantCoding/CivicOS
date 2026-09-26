import { sessionStateFromResponse } from '../session';

describe('session state', () => {
  it('distinguishes authenticated, guest, and expired sessions', () => {
    expect(sessionStateFromResponse(200, { user: { id: 'u1' } }).status).toBe(
      'authenticated',
    );
    expect(sessionStateFromResponse(401, null).status).toBe('expired');
    expect(sessionStateFromResponse(200, null).status).toBe('unauthenticated');
  });
});
