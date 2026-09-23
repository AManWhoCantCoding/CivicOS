// Server-only entry gate: imports @/modules/identity (prisma access).
// Never import this module from client components; it is only used by
// server layouts and pages to authorize Feature entry URLs.
import { listAssignments, type IdentityUser } from '@/modules/identity';
import {
  FEATURES,
  canEnterAnyFeature,
  type AssignmentScope,
  type SessionScope,
} from '@/components/navigation/feature-registry';

function toSessionScope(actor: IdentityUser): NonNullable<SessionScope> {
  return {
    id: actor.id,
    roles: actor.roles,
    organizationUnitId: actor.organizationUnitId,
  };
}

export async function canEnterEntry(
  actor: IdentityUser | null,
  featureIds: readonly string[],
): Promise<boolean> {
  if (!actor) return false;
  const session = toSessionScope(actor);
  if (canEnterAnyFeature(featureIds, session, [])) return true;
  const taskGated = FEATURES.some(
    (feature) =>
      featureIds.includes(feature.id) &&
      feature.requiresTask &&
      feature.visibleRoles.some((role) => session.roles.includes(role)) &&
      !(feature.bypassTaskRoles ?? []).some((role) =>
        session.roles.includes(role),
      ),
  );
  if (!taskGated) return false;
  const rows = await listAssignments({ actor });
  const assignments: AssignmentScope[] = rows.map((row) => ({
    task: row.task,
    status: row.status,
    assigneeUserId: row.assigneeUserId,
    organizationId: row.organizationId ?? null,
  }));
  return canEnterAnyFeature(featureIds, session, assignments);
}
