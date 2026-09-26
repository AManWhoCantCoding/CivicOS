import { deepLinkFor } from '../../navigation/deepLinks';

describe('read-only deep links', () => {
  it('links force references to map or RelatedInfo without PII', () => {
    expect(deepLinkFor({ resourceId: 'r1', coordinates: { lat: 1, lng: 2 } })).toEqual({
      route: 'Map',
      params: {
        incidentId: undefined,
        resourceId: 'r1',
        coordinates: { lat: 1, lng: 2 },
        relatedInfo: undefined,
        assignmentSummary: undefined,
      },
    });
    expect(deepLinkFor({ relatedInfo: { entityType: 'RESIDENT', id: 'r1' } })).toEqual({
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
});
