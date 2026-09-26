import { requestJson } from './client';
import type { RelatedInfoItem } from '../features/related-info/types';

export type MapLayer = {
  id: string;
  label: string;
  visibleByDefault: boolean;
  entityTypes: string[];
};
export type MapLayersResponse = { layers: MapLayer[] };
export type MapProvider = {
  id: string;
  styleUrl: string;
  attribution: string;
  offline?: boolean;
  bounds?: [number, number, number, number];
};

export function getMapLayers() {
  return requestJson<MapLayersResponse>('/api/map/layers');
}
export function getMapItems() {
  return requestJson<{ data: RelatedInfoItem[] }>(
    '/api/related-info/search?page=1&pageSize=100',
  );
}
export async function getMapProvider() {
  const response = await requestJson<{ provider: MapProvider }>(
    '/api/map/config',
  );
  return response.provider;
}
