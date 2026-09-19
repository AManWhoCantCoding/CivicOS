import type { IdentityUser } from '@/modules/identity';

export type VehicleActor = IdentityUser;

export type VehicleObservationInput = {
  plate: string;
  observedAt: string;
  latitude: number;
  longitude: number;
  description?: string;
  evidenceIds?: string[];
  clientCommandId?: string;
  baseVersion?: number;
};

export function normalizePlate(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s.-]/g, '');
}
