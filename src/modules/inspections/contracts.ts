import type { IdentityUser } from '@/modules/identity';

export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed';
export type InspectionResult = 'pass' | 'reminder' | 'needs_action';

export type EstablishmentType = string;

export type ChecklistTemplateVersion = number;

export type InspectionFindingResult = InspectionResult;

export type InspectionFindingRecord = {
  id: string;
  inspectionId: string;
  checklistKey: string;
  description: string;
  result: InspectionFindingResult;
  evidenceIds: string[];
};

export type EnforcementRecommendationStatus =
  'pending_approval' | 'approved' | 'rejected';

export type EnforcementRecommendationRecord = {
  id: string;
  inspectionId: string;
  findingIds: string[];
  action: string;
  reason: string;
  status: EnforcementRecommendationStatus;
};

export type EstablishmentInput = {
  name: string;
  ownerName: string;
  address: string;
  type: string;
  licenseRef?: string;
  latitude?: number;
  longitude?: number;
};

export type InspectionActor = IdentityUser;
