import {
  deepLinkFor,
  isVehicleObservationLink,
} from '../../navigation/deepLinks';

describe('read-only deep links', () => {
  it('links force references to map or RelatedInfo without PII', () => {
    expect(
      deepLinkFor({ resourceId: 'r1', coordinates: { lat: 1, lng: 2 } }),
    ).toEqual({
      route: 'Map',
      params: {
        incidentId: undefined,
        resourceId: 'r1',
        coordinates: { lat: 1, lng: 2 },
        relatedInfo: undefined,
        assignmentSummary: undefined,
      },
    });
    expect(
      deepLinkFor({ relatedInfo: { entityType: 'RESIDENT', id: 'r1' } }),
    ).toEqual({
      route: 'RelatedInfoDetail',
      params: {
        incidentId: undefined,
        resourceId: undefined,
        coordinates: undefined,
        relatedInfo: { entityType: 'RESIDENT', id: 'r1' },
        assignmentSummary: undefined,
      },
    });
  });

  it('links incident references to the existing Incident envelope flow', () => {
    expect(
      deepLinkFor({
        incidentId: 'incident-1',
        relatedInfo: { entityType: 'HOTSPOT', id: 'hotspot-1' },
      }),
    ).toEqual({
      route: 'Incident',
      params: {
        incidentId: 'incident-1',
        resourceId: undefined,
        coordinates: undefined,
        relatedInfo: undefined,
        assignmentSummary: undefined,
      },
    });
  });

  it('uses RelatedInfo only when no incident reference exists', () => {
    expect(
      deepLinkFor({
        relatedInfo: { entityType: 'HOTSPOT', id: 'hotspot-1' },
      }),
    ).toEqual({
      route: 'RelatedInfoDetail',
      params: {
        incidentId: undefined,
        resourceId: undefined,
        coordinates: undefined,
        relatedInfo: { entityType: 'HOTSPOT', id: 'hotspot-1' },
        assignmentSummary: undefined,
      },
    });
  });
});

describe('vehicle observation deep links', () => {
  it('routes explicit vehicle resource identity to the shared detail route', () => {
    expect(
      deepLinkFor({
        resourceType: 'VehicleObservation',
        resourceId: 'obs-1',
        coordinates: { lat: 10.7, lng: 106.6 },
        assignmentSummary: {
          assignmentId: 'a1',
          task: 'Theo dõi',
          status: 'assigned',
        },
      }),
    ).toEqual({
      route: 'VehicleObservationDetail',
      params: {
        resourceType: 'VehicleObservation',
        incidentId: undefined,
        resourceId: 'obs-1',
        coordinates: { lat: 10.7, lng: 106.6 },
        relatedInfo: undefined,
        assignmentSummary: {
          assignmentId: 'a1',
          task: 'Theo dõi',
          status: 'assigned',
        },
      },
    });
  });

  it('never remaps vehicle links to RelatedInfo search or counts', () => {
    const link = deepLinkFor({
      resourceType: 'VehicleObservation',
      resourceId: 'obs-1',
      relatedInfo: { entityType: 'HOTSPOT', id: 'hotspot-1' },
    });
    expect(link?.route).toBe('VehicleObservationDetail');
    expect(link?.route).not.toBe('RelatedInfoDetail');
  });

  it('keeps incident precedence for vehicle links carrying an incident', () => {
    expect(
      deepLinkFor({
        resourceType: 'VehicleObservation',
        resourceId: 'obs-1',
        incidentId: 'incident-1',
      })?.route,
    ).toBe('Incident');
  });

  it('requires an explicit resource id before opening vehicle detail', () => {
    expect(deepLinkFor({ resourceType: 'VehicleObservation' })?.route).not.toBe(
      'VehicleObservationDetail',
    );
    expect(
      isVehicleObservationLink({ resourceType: 'VehicleObservation' }),
    ).toBe(false);
    expect(
      isVehicleObservationLink({
        resourceType: 'VehicleObservation',
        resourceId: 'obs-1',
      }),
    ).toBe(true);
    expect(
      isVehicleObservationLink({ resourceType: 'Incident', resourceId: 'i1' }),
    ).toBe(false);
  });
});
