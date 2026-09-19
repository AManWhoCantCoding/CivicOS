export type RoleName =
  | 'commander'
  | 'duty_officer'
  | 'field_officer'
  | 'office_officer'
  | 'village_officer'
  | 'supervisor';

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
