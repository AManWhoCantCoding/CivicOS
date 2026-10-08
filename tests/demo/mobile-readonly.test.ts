import { describe, expect, it } from 'vitest';

import {
  MOBILE_READ_TASK,
  resolveMobileReadonlyTargets,
  type MobileReadonlySeedDeps,
} from '../../scripts/demo/seed-mobile-readonly';
import type { VehiclesSeedResult } from '../../scripts/demo/seed-vehicles';

function deps(
  overrides: Partial<MobileReadonlySeedDeps> = {},
): MobileReadonlySeedDeps {
  return {
    identityResidents: { recordIds: ['record-01'] },
    intakeIncidents: { incidentIds: ['incident-t003'] },
    inspections: {
      establishmentIds: { completed: 'establishment-completed' },
      inspectionIds: { completed: 'inspection-completed' },
    },
    vehicles: {
      observationIds: {
        recorded: 'vehicle-obs-recorded',
        match_suggested: 'vehicle-obs-match',
        escalated: 'vehicle-obs-escalated',
      },
    },
    ...overrides,
  };
}
describe('mobile readonly demo manifest', () => {
  it('maps one resource per mobile entity source from T-002 to T-005 results', () => {
    expect(resolveMobileReadonlyTargets(deps())).toEqual({
      recordId: 'record-01',
      establishmentId: 'establishment-completed',
      incidentId: 'incident-t003',
      completedInspectionId: 'inspection-completed',
      vehicleObservationIds: [
        'vehicle-obs-recorded',
        'vehicle-obs-match',
        'vehicle-obs-escalated',
      ],
    });
  });

  it('fails closed when T-003 has no linked incident', () => {
    expect(() =>
      resolveMobileReadonlyTargets(
        deps({ intakeIncidents: { incidentIds: [] } }),
      ),
    ).toThrow('DEMO_MOBILE_INCIDENT_MISSING');
  });

  it('fails loudly instead of seeding a partial assignment set', () => {
    expect(() =>
      resolveMobileReadonlyTargets(
        deps({ identityResidents: { recordIds: [] } }),
      ),
    ).toThrow('DEMO_MOBILE_RECORD_MISSING');
    expect(() =>
      resolveMobileReadonlyTargets(
        deps({
          inspections: {
            establishmentIds: {},
            inspectionIds: { completed: 'x' },
          },
        }),
      ),
    ).toThrow('DEMO_MOBILE_ESTABLISHMENT_MISSING');
    expect(() =>
      resolveMobileReadonlyTargets(
        deps({
          inspections: {
            establishmentIds: { completed: 'x' },
            inspectionIds: {},
          },
        }),
      ),
    ).toThrow('DEMO_MOBILE_INSPECTION_MISSING');
    expect(() =>
      resolveMobileReadonlyTargets(
        deps({ intakeIncidents: { incidentIds: [] } }),
      ),
    ).toThrow('DEMO_MOBILE_INCIDENT_MISSING');
    expect(() =>
      resolveMobileReadonlyTargets(
        deps({
          vehicles: {
            observationIds: {} as VehiclesSeedResult['observationIds'],
          },
        }),
      ),
    ).toThrow('DEMO_MOBILE_VEHICLE_OBSERVATION_MISSING');
  });

  it('keeps the grant task read-only and compatible with the field actor', () => {
    expect(MOBILE_READ_TASK).toBe('mobile_read');
  });
});
