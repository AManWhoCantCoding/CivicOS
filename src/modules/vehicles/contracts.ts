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

export type VehicleVerificationInput = {
  observationId: string;
  result: string;
  notes: string;
  ownerLookup?: string | null;
  latitude?: number;
  longitude?: number;
  evidenceIds?: string[];
};

export type ConfirmVehicleMatchInput = {
  observationId: string;
  baseVersion?: number;
};

export function normalizeOwnerLookup(value?: string | null): string | null {
  const lookup = (value ?? '').trim();
  return lookup ? lookup : null;
}

export function normalizePlate(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s.-]/g, '');
}

export function assertPlateFormat(
  value: string,
  error = 'INVALID_PLATE',
): string {
  const plate = normalizePlate(value);
  if (!/^[A-Z0-9]{3,15}$/.test(plate)) throw new Error(error);
  return plate;
}
