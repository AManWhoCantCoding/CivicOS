import type { IdentityUser } from '@/modules/identity';

export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed';
export type InspectionResult = 'pass' | 'reminder' | 'needs_action';

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
