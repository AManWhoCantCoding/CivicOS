import { requestJson } from './client';
import type {
  RelatedInfoEntityType,
  RelatedInfoItem,
  RelatedInfoQuery,
  RelatedInfoSearchResponse,
  RelatedInfoCounts,
  RelatedInfoDetailResponse,
} from '../features/related-info/types';

export function buildRelatedInfoPath(
  kind: 'search' | 'counts',
  query: RelatedInfoQuery = {},
): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return `/api/related-info/${kind}${params.size ? `?${params.toString()}` : ''}`;
}

export function searchRelatedInfo(query: RelatedInfoQuery) {
  return requestJson<RelatedInfoSearchResponse>(
    buildRelatedInfoPath('search', query),
  );
}
export function countRelatedInfo(query: RelatedInfoQuery) {
  return requestJson<RelatedInfoCounts>(buildRelatedInfoPath('counts', query));
}
export function getRelatedInfoDetail(
  entityType: RelatedInfoEntityType,
  id: string,
) {
  return requestJson<RelatedInfoDetailResponse>(
    `/api/related-info/${entityType}/${encodeURIComponent(id)}`,
  );
}

export type { RelatedInfoItem };
