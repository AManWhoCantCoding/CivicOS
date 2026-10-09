import {
  MODULES,
  visibleNavigationFeatures,
  type AssignmentScope,
  type FeatureDef,
  type ModuleDef,
  type ModuleId,
  type SessionScope,
} from './feature-registry';

export type WorkspaceModuleProjection = {
  module: ModuleDef;
  features: FeatureDef[];
};

export type WorkspaceProjection = {
  modules: WorkspaceModuleProjection[];
  features: FeatureDef[];
};

const MODULE_ORDER: readonly ModuleId[] = Object.keys(MODULES) as ModuleId[];

// Typed workspace/module projection for the root/shell tickets (T-001).
// Derives eligible features from the existing MODULES/FEATURES registry via
// visibleNavigationFeatures(), groups by FEATURES.moduleId, dedupes by
// feature ID, and omits modules with no eligible feature. A valid session
// with no eligible navigation feature yields an empty projection; the root
// ticket maps that result to AccessDenied.
export function buildWorkspaceProjection(
  session: SessionScope,
  assignments: readonly AssignmentScope[],
): WorkspaceProjection {
  const modules: WorkspaceModuleProjection[] = [];
  const features: FeatureDef[] = [];
  const seen = new Set<string>();
  for (const moduleId of MODULE_ORDER) {
    const eligible = visibleNavigationFeatures(
      moduleId,
      session,
      assignments,
    ).filter((feature) => {
      if (seen.has(feature.id)) return false;
      seen.add(feature.id);
      return true;
    });
    if (eligible.length === 0) continue;
    modules.push({ module: MODULES[moduleId], features: eligible });
    features.push(...eligible);
  }
  return { modules, features };
}

export function hasNavigableFeature(
  session: SessionScope,
  assignments: readonly AssignmentScope[],
): boolean {
  return MODULE_ORDER.some(
    (moduleId) =>
      visibleNavigationFeatures(moduleId, session, assignments).length > 0,
  );
}
