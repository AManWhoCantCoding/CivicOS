export type RelatedInfoEntityType =
  'RESIDENT' | 'BUSINESS' | 'HOTSPOT' | 'VIOLATION';
export type RelatedInfoQuery = {
  q?: string;
  entityType?: RelatedInfoEntityType;
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  category?: string;
  riskLevel?: string;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  geoLatMin?: number;
  geoLatMax?: number;
  geoLngMin?: number;
  geoLngMax?: number;
};
export type RelatedInfoItem = {
  entityType: RelatedInfoEntityType;
  id: string;
  title: string;
  status: string;
  address?: string;
  lat?: number;
  lng?: number;
  geometry?: unknown;
  updatedAt: string;
  masked: boolean;
};
export type RelatedInfoReference = Pick<RelatedInfoItem, 'entityType' | 'id'>;
export type RelatedInfoSearchResponse = {
  data: RelatedInfoItem[];
  total: number;
  page: number;
  pageSize: number;
};
export type RelatedInfoCounts = {
  ALL: number;
  RESIDENT: number;
  BUSINESS: number;
  HOTSPOT: number;
  VIOLATION: number;
};
export type RelatedInfoDetailResponse = {
  entityType: RelatedInfoEntityType;
  data: RelatedInfoItem;
};
