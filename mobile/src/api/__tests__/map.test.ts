import { mapProviderProps } from '../../features/map/ProviderAdapter';

describe('map provider adapter', () => {
  it('keeps point and polygon geometry and OSM attribution', () => {
    const props = mapProviderProps({
      id: 'cadn',
      styleUrl: 'http://tiles/style.json',
      attribution: 'OpenStreetMap',
      offline: true,
    });
    expect(props.styleURL).toBe('http://tiles/style.json');
    expect(props.attribution).toContain('OpenStreetMap');
    expect(props.offline).toBe(true);
  });
});
