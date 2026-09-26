import type { MapProvider } from '../../api/map';
export function mapProviderProps(provider: MapProvider) {
  return {
    styleURL: provider.styleUrl,
    attribution: provider.attribution.includes('OpenStreetMap')
      ? provider.attribution
      : `${provider.attribution} · OpenStreetMap`,
    offline: provider.offline ?? false,
  };
}
