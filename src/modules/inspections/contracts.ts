import type { IdentityUser } from '@/modules/identity';

export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed';
export type InspectionResult = 'pass' | 'reminder' | 'needs_action';

export type EstablishmentType = string;
export type EstablishmentRisk = 'low' | 'medium' | 'high';
export type EstablishmentStatus = 'active' | 'archived';

export type ChecklistTemplateVersion = number;

export type InspectionFindingResult = InspectionResult;

export type InspectionFindingRecord = {
  id: string;
  inspectionId: string;
  checklistKey: string;
  description: string;
  result: InspectionFindingResult;
  severity?: string;
  category?: string;
  evidenceIds: string[];
};

export type EnforcementRecommendationStatus =
  'pending_approval' | 'approved' | 'rejected' | 'transferred';

export type InspectionStats = {
  generatedAt: string;
  from?: string;
  to?: string;
  establishmentType?: string;
  ratesByType?: Record<
    string,
    {
      total: number;
      completed: number;
      passRate: number;
      reminderRate: number;
      needsActionRate: number;
    }
  >;
  totalEstablishments: number;
  totalInspections: number;
  results: Record<InspectionResult, number>;
  recommendations: Record<EnforcementRecommendationStatus, number>;
  recommendationSla: { active: number; overdue: number; completed: number };
};

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
  risk?: EstablishmentRisk;
  status?: EstablishmentStatus;
};

export type InspectionActor = IdentityUser;
