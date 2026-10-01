export type RoleName =
  | 'commander'
  | 'duty_officer'
  | 'field_officer'
  | 'office_officer'
  | 'village_officer'
  | 'supervisor'
  | 'superior_officer'
  | 'superior_commander'
  | 'system_operator'
  | 'land_officer'
  | 'commune_leader'
  | 'citizen';

export type Capability =
  'read' | 'mutate' | 'assign' | 'approve' | 'read_sensitive';

export type AssignmentTask =
  | 'incident_verification'
  | 'inspection_fieldwork'
  | 'vehicle_verification'
  | 'resident_followup'
  | 'mobile_read'
  | (string & {});

export type PolicyAssignmentStatus = 'active' | 'revoked';

export type PolicyAssignment = {
  task: string;
  resourceType: string;
  resourceId: string;
  status: PolicyAssignmentStatus;
  organizationId?: string;
};

export type IdentityUser = {
  id: string;
  email: string;
  name: string;
  roles: RoleName[];
  organizationUnitId?: string;
};

export type ResourceRef = {
  resourceType: string;
  resourceId: string;
  organizationId?: string;
};

export type AuthorizationAction =
  'read' | 'mutate' | 'assign' | 'approve' | 'read_sensitive';

export type AssignmentInput = ResourceRef & {
  task: string;
  assigneeUserIds: string[];
  organizationId?: string;
};

export const ROLE_CATALOG: readonly RoleName[] = [
  'commander',
  'duty_officer',
  'field_officer',
  'office_officer',
  'village_officer',
  'superior_officer',
  'superior_commander',
  'system_operator',
  'land_officer',
  'commune_leader',
  'citizen',
];

export const ROLE_BASE_CAPABILITIES: Record<RoleName, readonly Capability[]> = {
  commander: ['read', 'mutate', 'read_sensitive', 'assign', 'approve'],
  superior_commander: ['read', 'mutate', 'read_sensitive', 'assign', 'approve'],
  duty_officer: ['read', 'mutate', 'read_sensitive'],
  field_officer: ['read', 'mutate', 'read_sensitive'],
  office_officer: ['read', 'mutate', 'read_sensitive'],
  village_officer: ['read', 'mutate', 'read_sensitive'],
  superior_officer: ['read', 'mutate', 'read_sensitive'],
  supervisor: [],
  system_operator: [],
  land_officer: ['read', 'mutate', 'read_sensitive'],
  commune_leader: ['read', 'read_sensitive', 'assign', 'approve'],
  citizen: [],
};

export const ASSIGNMENT_TASKS: readonly string[] = [
  'incident_verification',
  'inspection_fieldwork',
  'vehicle_verification',
  'resident_followup',
  'mobile_read',
  'land_review',
];

const BUSINESS_ROLES: readonly RoleName[] = [
  'commander',
  'duty_officer',
  'field_officer',
  'office_officer',
  'village_officer',
  'superior_officer',
  'superior_commander',
];

export const TASK_CAPABILITIES: Record<string, readonly Capability[]> = {
  incident_verification: ['read', 'mutate', 'read_sensitive'],
  inspection_fieldwork: ['read', 'mutate', 'read_sensitive'],
  vehicle_verification: ['read', 'mutate', 'read_sensitive'],
  resident_followup: ['read', 'mutate', 'read_sensitive'],
  mobile_read: ['read'],
  land_review: ['read', 'mutate', 'read_sensitive'],
};

export const TASK_ALLOWED_ROLES: Record<string, readonly RoleName[]> = {
  incident_verification: BUSINESS_ROLES,
  inspection_fieldwork: BUSINESS_ROLES,
  vehicle_verification: BUSINESS_ROLES,
  resident_followup: BUSINESS_ROLES,
  mobile_read: BUSINESS_ROLES,
  land_review: ['land_officer'],
};

export function isTaskCompatibleWithRoles(
  task: string,
  roles: readonly RoleName[],
): boolean {
  const allowed = TASK_ALLOWED_ROLES[task];
  if (!allowed) return false;
  return roles.some((role) => allowed.includes(role));
}
