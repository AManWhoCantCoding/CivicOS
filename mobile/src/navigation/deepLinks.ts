import type { ForceLink } from '../api/forces';

export type NavigationContext = ForceLink;

export function deepLinkFor(link: ForceLink) {
  const context: NavigationContext = {
    incidentId: link.incidentId,
    resourceId: link.resourceId,
    coordinates: link.coordinates,
    relatedInfo: link.incidentId ? undefined : link.relatedInfo,
    assignmentSummary: link.assignmentSummary,
  };
  if (link.incidentId) return { route: 'Incident' as const, params: context };
  if (link.relatedInfo)
    return { route: 'RelatedInfoDetail' as const, params: context };
  if (link.resourceId || link.coordinates)
    return { route: 'Map' as const, params: context };
  return null;
}
