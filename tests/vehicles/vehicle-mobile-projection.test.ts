import { describe, expect, it } from 'vitest';

import { MOBILE_READ_ENTITY_TYPES } from '@/modules/mobile-readonly/contracts';
import { mobileObservationState } from '@/modules/vehicles/projection';

const fullState = {
  id: 'vehicle-observation-t010',
  plate: '43DEMO01',
  status: 'escalated',
  observedAt: '2026-09-28T08:00:00.000Z',
  latitude: '20.98',
  longitude: '106.05',
  description: 'Synthetic sensitive description',
  observedById: 'observer-user-id',
  clientCommandId: 'demo-observation-key',
  version: 3,
  evidenceIds: ['evidence-id'],
  matchedRegistryId: 'registry-id',
  matchConfirmedAt: '2026-09-28T09:00:00.000Z',
  matchConfirmedById: 'confirmer-id',
  escalatedAt: '2026-09-28T10:00:00.000Z',
  createdAt: '2026-09-28T08:00:00.000Z',
};

describe('vehicle mobile projection allowlist', () => {
  it('returns exactly the six DS-09 mobile fields with the full plate', () => {
    expect(mobileObservationState(fullState)).toEqual({
      id: 'vehicle-observation-t010',
      plate: '43DEMO01',
      status: 'escalated',
      observedAt: '2026-09-28T08:00:00.000Z',
      latitude: '20.98',
      longitude: '106.05',
    });
    expect(Object.keys(mobileObservationState(fullState)).sort()).toEqual(
      ['id', 'latitude', 'longitude', 'observedAt', 'plate', 'status'].sort(),
    );
  });

  it('never leaks web-only, owner, verification, or mutation fields', () => {
    const text = JSON.stringify(mobileObservationState(fullState));
    for (const leaked of [
      'description',
      'observedById',
      'clientCommandId',
      'version',
      'evidenceIds',
      'matchedRegistryId',
      'verifications',
      'ownerLookup',
      'permissions',
      'canConfirm',
      'canVerify',
      'canEscalate',
      'notes',
    ]) {
      expect(text).not.toContain(leaked);
    }
  });

  it('does not add VehicleObservation to RelatedInfo entity types', () => {
    expect([...MOBILE_READ_ENTITY_TYPES]).toEqual([
      'RESIDENT',
      'BUSINESS',
      'HOTSPOT',
      'VIOLATION',
    ]);
  });
});
