jest.mock('../../features/map/MapScreen', () => ({
  MapScreen: () => null,
}));

import { routes } from '../../navigation/AppNavigator';

describe('navigation remains read-only', () => {
  it('does not expose create, update, or citizen intake routes', () => {
    expect(routes).not.toEqual(
      expect.arrayContaining(['Create', 'Update', 'CitizenIntake']),
    );
  });
});
