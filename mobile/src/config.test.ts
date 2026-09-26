import { resolveApiBaseUrl } from './config';

describe('resolveApiBaseUrl', () => {
  it('prefers a valid runtime URL over build-time configuration', () => {
    expect(
      resolveApiBaseUrl({
        runtimeBaseUrl: 'http://10.0.2.2:3000',
        buildTimeBaseUrl: 'http://10.0.2.2:3100',
      }),
    ).toBe('http://10.0.2.2:3000');
  });

  it('uses build-time configuration when runtime is absent', () => {
    expect(
      resolveApiBaseUrl({ buildTimeBaseUrl: 'http://10.0.2.2:3100' }),
    ).toBe('http://10.0.2.2:3100');
  });

  it.each(['http://10.0.2.2:3000', 'http://10.0.2.2:3100'])(
    'accepts injected build value %s',
    (buildTimeBaseUrl: string) => {
      expect(resolveApiBaseUrl({ buildTimeBaseUrl })).toBe(buildTimeBaseUrl);
    },
  );
});
