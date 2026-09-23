import { ROLE_BASE_CAPABILITIES } from '@/modules/identity/contracts';

export type ModuleId =
  'incidents' | 'inspections' | 'vehicles' | 'identity' | 'map' | 'residents';

export type ModuleDef = {
  id: ModuleId;
  label: string;
  homeHref: string;
  description: string;
};

export type FeatureDef = {
  id: string;
  moduleId: ModuleId;
  label: string;
  href: string;
  visibleRoles: readonly string[];
  requiresTask?: string;
  bypassTaskRoles?: readonly string[];
  activeExact?: string;
  activePrefixes?: readonly string[];
};

export type SessionScope = {
  id: string;
  roles: readonly string[];
  organizationUnitId?: string;
} | null;

export type AssignmentScope = {
  task: string;
  status: string;
  assigneeUserId?: string;
  organizationId?: string | null;
};

const COMMAND_ROLES: readonly string[] = ['commander', 'superior_commander'];

export const MODULES: Record<ModuleId, ModuleDef> = {
  incidents: {
    id: 'incidents',
    label: 'Incident',
    homeHref: '/incidents',
    description: 'Tiếp nhận, phân loại, phân công và theo dõi Incident.',
  },
  inspections: {
    id: 'inspections',
    label: 'Inspection',
    homeHref: '/inspections/establishments',
    description: 'Danh mục cơ sở, lịch kiểm tra và hàng đợi fieldwork.',
  },
  vehicles: {
    id: 'vehicles',
    label: 'Phương tiện',
    homeHref: '/vehicles/registry',
    description: 'Registry xe cần chú ý và quan sát hiện trường.',
  },
  identity: {
    id: 'identity',
    label: 'Identity',
    homeHref: '/identity',
    description: 'User và Assignment trong phạm vi chỉ huy.',
  },
  map: {
    id: 'map',
    label: 'Bản đồ',
    homeHref: '/map',
    description: 'Workspace bản đồ nghiệp vụ và điều hướng tác nghiệp.',
  },
  residents: {
    id: 'residents',
    label: 'Cư dân đặc biệt',
    homeHref: '/residents',
    description: 'Theo dõi tạm trú, người nước ngoài và tái hòa nhập.',
  },
};

export const FEATURES: readonly FeatureDef[] = [
  {
    id: 'incident-queue',
    moduleId: 'incidents',
    label: 'Hàng đợi Incident',
    href: '/incidents',
    visibleRoles: [
      'commander',
      'superior_commander',
      'duty_officer',
      'field_officer',
      'office_officer',
      'village_officer',
      'superior_officer',
    ],
    requiresTask: 'incident_verification',
    bypassTaskRoles: COMMAND_ROLES,
    activeExact: '/incidents',
    activePrefixes: ['/incidents/'],
  },
  {
    id: 'incident-intake',
    moduleId: 'incidents',
    label: 'Ghi nhận tin báo',
    href: '/intake',
    visibleRoles: ['duty_officer'],
    activeExact: '/intake',
  },
  {
    id: 'incident-assignment',
    moduleId: 'incidents',
    label: 'Phân công Incident',
    href: '/assignments',
    visibleRoles: COMMAND_ROLES,
    activeExact: '/assignments',
  },
  {
    id: 'inspection-catalogue',
    moduleId: 'inspections',
    label: 'Danh mục cơ sở',
    href: '/inspections/establishments',
    visibleRoles: ['commander', 'office_officer'],
    activeExact: '/inspections/establishments',
    activePrefixes: ['/inspections/establishments/'],
  },
  {
    id: 'inspection-schedule',
    moduleId: 'inspections',
    label: 'Lịch kiểm tra',
    href: '/inspections/establishments#inspection-schedule',
    visibleRoles: ['commander', 'office_officer'],
    activeExact: '/inspections/establishments',
  },
  {
    id: 'inspection-workqueue',
    moduleId: 'inspections',
    label: 'Hàng đợi fieldwork',
    href: '/inspections/establishments',
    visibleRoles: ['commander', 'field_officer', 'office_officer'],
    requiresTask: 'inspection_fieldwork',
    bypassTaskRoles: ['commander'],
    activePrefixes: ['/inspections/'],
  },
  {
    id: 'vehicle-registry',
    moduleId: 'vehicles',
    label: 'Registry xe cần chú ý',
    href: '/vehicles/registry',
    visibleRoles: COMMAND_ROLES,
    activeExact: '/vehicles/registry',
    activePrefixes: ['/vehicles/'],
  },
  {
    id: 'vehicle-observation',
    moduleId: 'vehicles',
    label: 'Quan sát hiện trường',
    href: '/field/vehicles',
    visibleRoles: [
      'commander',
      'superior_commander',
      'field_officer',
      'village_officer',
    ],
    activeExact: '/field/vehicles',
  },
  {
    id: 'vehicle-verification',
    moduleId: 'vehicles',
    label: 'Xác minh phương tiện',
    href: '/field/vehicles',
    visibleRoles: ['field_officer'],
    requiresTask: 'vehicle_verification',
    activePrefixes: ['/field/vehicles/'],
  },
  {
    id: 'identity-assignments',
    moduleId: 'identity',
    label: 'Assignment',
    href: '/assignments',
    visibleRoles: [
      'commander',
      'superior_commander',
      'duty_officer',
      'field_officer',
      'office_officer',
      'village_officer',
      'superior_officer',
    ],
    activeExact: '/assignments',
  },
  {
    id: 'identity-users',
    moduleId: 'identity',
    label: 'Quản lý User',
    href: '/users',
    visibleRoles: ['commander'],
    activeExact: '/users',
    activePrefixes: ['/users/'],
  },
  {
    id: 'resident-list',
    moduleId: 'residents',
    label: 'Danh sách cư dân đặc biệt',
    href: '/residents',
    visibleRoles: [
      'commander',
      'superior_commander',
      'duty_officer',
      'field_officer',
      'office_officer',
      'village_officer',
    ],
    requiresTask: 'resident_followup',
    bypassTaskRoles: COMMAND_ROLES,
    activeExact: '/residents',
    activePrefixes: ['/residents/'],
  },
  {
    id: 'resident-reports',
    moduleId: 'residents',
    label: 'Báo cáo tháng cư dân',
    href: '/residents/reports',
    visibleRoles: ['commander', 'office_officer'],
    activeExact: '/residents/reports',
  },
  {
    id: 'map-workspace',
    moduleId: 'map',
    label: 'Workspace bản đồ',
    href: '/map',
    visibleRoles: [
      'commander',
      'superior_commander',
      'duty_officer',
      'field_officer',
      'office_officer',
      'village_officer',
      'superior_officer',
    ],
    activeExact: '/map',
    activePrefixes: ['/map/'],
  },
];

export function hasBusinessCapability(roles: readonly string[]): boolean {
  return roles.some(
    (role) =>
      (
        ROLE_BASE_CAPABILITIES[role as keyof typeof ROLE_BASE_CAPABILITIES] ??
        []
      ).length > 0,
  );
}

function assignmentInScope(
  assignment: AssignmentScope,
  session: NonNullable<SessionScope>,
): boolean {
  if (assignment.status !== 'active') return false;
  if (assignment.assigneeUserId && assignment.assigneeUserId !== session.id)
    return false;
  if (
    assignment.organizationId &&
    session.organizationUnitId &&
    assignment.organizationId !== session.organizationUnitId
  )
    return false;
  return true;
}

export function visibleFeatures(
  moduleId: ModuleId,
  session: SessionScope,
  assignments: readonly AssignmentScope[],
): FeatureDef[] {
  if (!session) return [];
  return FEATURES.filter((feature) => {
    if (feature.moduleId !== moduleId) return false;
    if (!feature.visibleRoles.some((role) => session.roles.includes(role)))
      return false;
    if (!feature.requiresTask) return true;
    if (
      (feature.bypassTaskRoles ?? []).some((role) =>
        session.roles.includes(role),
      )
    )
      return true;
    return assignments.some(
      (assignment) =>
        assignment.task === feature.requiresTask &&
        assignmentInScope(assignment, session),
    );
  });
}

export function canEnterFeature(
  featureId: string,
  session: SessionScope,
  assignments: readonly AssignmentScope[],
): boolean {
  const feature = FEATURES.find((entry) => entry.id === featureId);
  if (!feature || !session) return false;
  return visibleFeatures(feature.moduleId, session, assignments).some(
    (entry) => entry.id === featureId,
  );
}

export function canEnterAnyFeature(
  featureIds: readonly string[],
  session: SessionScope,
  assignments: readonly AssignmentScope[],
): boolean {
  return featureIds.some((featureId) =>
    canEnterFeature(featureId, session, assignments),
  );
}

function hrefPath(href: string): string {
  return href.split('#')[0] ?? href;
}

function hrefHash(href: string): string | null {
  const parts = href.split('#');
  return parts.length > 1 ? `#${parts[1]}` : null;
}

export function activeFeatureId(
  features: readonly FeatureDef[],
  pathname: string,
  hash: string,
): string | null {
  let best: { id: string; score: number } | null = null;
  for (const feature of features) {
    const path = hrefPath(feature.href);
    const featureHash = hrefHash(feature.href);
    if (featureHash) {
      if (
        pathname === path &&
        hash === featureHash &&
        (best === null || best.score < 1000)
      ) {
        best = { id: feature.id, score: 1000 };
      }
      continue;
    }
    if (feature.activeExact === pathname && !hash) {
      if (best === null || best.score < 1000)
        best = { id: feature.id, score: 1000 };
      continue;
    }
    if (pathname === path && !hash) {
      if (best === null || best.score < 1000)
        best = { id: feature.id, score: 1000 };
      continue;
    }
    for (const prefix of feature.activePrefixes ?? []) {
      if (pathname.startsWith(prefix)) {
        const score = prefix.length;
        if (best === null || best.score < score)
          best = { id: feature.id, score };
      }
    }
  }
  return best?.id ?? null;
}
