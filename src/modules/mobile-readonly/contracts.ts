import type { IdentityUser, ResourceRef } from '@/modules/identity';

export const MOBILE_READ_ENTITY_TYPES = [
  'RESIDENT',
  'BUSINESS',
  'HOTSPOT',
  'VIOLATION',
] as const;

export type RelatedInfoEntityType = (typeof MOBILE_READ_ENTITY_TYPES)[number];

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
  metadata?: {
    result: string;
    checklistKey: string;
    evidenceIds: string[];
  };
};

export type RelatedInfoSearchQuery = {
  q?: string;
  entityType?: RelatedInfoEntityType;
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
  page?: number;
  pageSize?: number;
};

export type RelatedInfoSearchEnvelope = {
  data: RelatedInfoItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type RelatedInfoCounts = Record<RelatedInfoEntityType | 'ALL', number>;

export type MapLayerItem = {
  id: string;
  label: string;
  visibleByDefault: boolean;
  entityTypes: RelatedInfoEntityType[];
};

export type MapLayersEnvelope = { layers: MapLayerItem[] };

export type Coordinates = { lat: number; lng: number };
export type RelatedInfoRef = { entityType: RelatedInfoEntityType; id: string };
export type AssignmentSummary = {
  assignmentId: string;
  task: string;
  status: string;
};

export type AlarmReadItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  resourceType: string;
  incidentId?: string;
  resourceId?: string;
  coordinates?: Coordinates;
  relatedInfo?: RelatedInfoRef;
  assignmentSummary?: AssignmentSummary;
};

export type DispatchReadItem = AlarmReadItem;
export type TaskReadItem = AlarmReadItem & {
  dispatchId?: string;
  baseVersion?: number;
};

export type MobileListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  incidentId?: string;
  dispatchId?: string;
};

export type MobileReadError =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'INVALID_ENTITY_TYPE'
  | 'INVALID_DISPATCH_ID';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const MOBILE_RESOURCE_TYPES: Record<RelatedInfoEntityType, string> = {
  RESIDENT: 'SubjectManagementRecord',
  BUSINESS: 'Establishment',
  HOTSPOT: 'Incident',
  VIOLATION: 'InspectionFinding',
};

export type MobileActor = IdentityUser;
export type MobileResource = ResourceRef;
