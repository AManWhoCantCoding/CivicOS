import type { ForceLink } from '../api/forces';

export type NavigationContext = ForceLink;

export type VehicleObservationOrigin = 'Alarms' | 'Dispatches' | 'Tasks';

export function isVehicleObservationLink(link: ForceLink): boolean {
  return (
    link.resourceType === 'VehicleObservation' &&
    typeof link.resourceId === 'string' &&
    link.resourceId.length > 0
  );
}

export function deepLinkFor(link: ForceLink) {
  const context: NavigationContext = {
    resourceType: link.resourceType,
    incidentId: link.incidentId,
    resourceId: link.resourceId,
    coordinates: link.coordinates,
    relatedInfo: link.incidentId ? undefined : link.relatedInfo,
    assignmentSummary: link.assignmentSummary,
  };
  if (link.incidentId) return { route: 'Incident' as const, params: context };
  if (isVehicleObservationLink(link))
    return { route: 'VehicleObservationDetail' as const, params: context };
  if (link.relatedInfo)
    return { route: 'RelatedInfoDetail' as const, params: context };
  if (link.resourceId || link.coordinates)
    return { route: 'Map' as const, params: context };
  return null;
}
