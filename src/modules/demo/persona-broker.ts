import type { DemoGuardTarget } from './target-guard';

export const DEMO_PERSONA_MODE = 'LIVE_DEMO';

export type DemoPersonaAlias =
  'commander' | 'duty' | 'field' | 'office' | 'unassigned';

export type DemoPersonaEntry = {
  alias: DemoPersonaAlias;
  /** Local/demo login email. Server-side only, never returned to callers. */
  email: string;
  displayName: string;
  roleLabel: string;
};

export const DEMO_PERSONA_ALLOWLIST: readonly DemoPersonaEntry[] = [
  {
    alias: 'commander',
    email: 'commander@civicos.local',
    displayName: 'Commander demo',
    roleLabel: 'commander',
  },
  {
    alias: 'duty',
    email: 'trucban@civicos.local',
    displayName: 'Duty officer demo',
    roleLabel: 'duty_officer',
  },
  {
    alias: 'field',
    email: 'field@civicos.local',
    displayName: 'Field officer demo',
    roleLabel: 'field_officer',
  },
  {
    alias: 'office',
    email: 'vanphong@civicos.local',
    displayName: 'Office officer demo',
    roleLabel: 'office_officer',
  },
  {
    alias: 'unassigned',
    email: 'khongduocphancong@civicos.local',
    displayName: 'Unassigned demo',
    roleLabel: 'field_officer',
  },
];

export type PersonaBrokerRequest = {
  alias: string;
  mode: string;
  guardState: 'ready' | 'blocked';
  target: DemoGuardTarget;
};

export type PersonaProviderUser = {
  displayName: string;
  roleLabel: string;
  organizationUnitId?: string;
};

export type PersonaBrokerDeps = {
  providerAvailable: boolean;
  endCurrentSession: () => Promise<void> | void;
  authenticate: (email: string) => Promise<PersonaProviderUser | null>;
  establishSession: () => Promise<{ expiresAt: Date | string }>;
  reloadScope: () => Promise<{
    organizationUnitId?: string;
    assignmentCount: number;
  }>;
};

export type PersonaScopeSummary = {
  organizationUnitId?: string;
  assignmentCount: number;
  assignmentState: 'ready' | 'empty';
};

export type PersonaBrokerResult =
  | {
      status: 'authenticated';
      alias: DemoPersonaAlias;
      displayName: string;
      roleLabel: string;
      expiresAt: string;
      scope: PersonaScopeSummary;
    }
  | { status: 'blocked' | 'rejected'; reason: string };

export function isDemoPersonaAlias(value: string): value is DemoPersonaAlias {
  return DEMO_PERSONA_ALLOWLIST.some((entry) => entry.alias === value);
}

function findPersonaEntry(alias: string): DemoPersonaEntry | null {
  const entry = DEMO_PERSONA_ALLOWLIST.find(
    (candidate) => candidate.alias === alias,
  );
  return entry ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toSafeProviderUser(value: unknown): PersonaProviderUser | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.displayName !== 'string' ||
    !value.displayName.trim() ||
    typeof value.roleLabel !== 'string' ||
    !value.roleLabel.trim()
  ) {
    return null;
  }
  const organizationUnitId =
    typeof value.organizationUnitId === 'string' &&
    value.organizationUnitId.trim()
      ? value.organizationUnitId
      : undefined;
  return {
    displayName: value.displayName,
    roleLabel: value.roleLabel,
    ...(organizationUnitId ? { organizationUnitId } : {}),
  };
}

function toSafeScope(value: unknown): PersonaScopeSummary | null {
  if (!isRecord(value)) return null;
  const { organizationUnitId, assignmentCount } = value;
  if (
    typeof assignmentCount !== 'number' ||
    !Number.isInteger(assignmentCount) ||
    assignmentCount < 0
  ) {
    return null;
  }
  return {
    ...(typeof organizationUnitId === 'string' && organizationUnitId.trim()
      ? { organizationUnitId }
      : {}),
    assignmentCount,
    assignmentState: assignmentCount > 0 ? 'ready' : 'empty',
  };
}

function toIsoDateOrNull(value: unknown): string | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Pure persona switch: fail-closed guard first, then ordered
 * end-session -> authenticate -> establish-session -> scope reload.
 * Returns only safe display fields; never password/token/cookie/email.
 */
export async function switchDemoPersona(
  request: PersonaBrokerRequest,
  deps: PersonaBrokerDeps,
): Promise<PersonaBrokerResult> {
  const rawRequest: unknown = request;
  const rawInput: Record<string, unknown> = isRecord(rawRequest)
    ? rawRequest
    : {};
  const mode = typeof rawInput.mode === 'string' ? rawInput.mode : '';
  if (mode !== DEMO_PERSONA_MODE) {
    return { status: 'rejected', reason: 'INVALID_MODE' };
  }
  const guardState = rawInput.guardState;
  const target = rawInput.target;
  if (guardState !== 'ready' || target !== 'civicos') {
    return { status: 'blocked', reason: 'TARGET_NOT_READY' };
  }
  const rawAlias =
    typeof rawInput.alias === 'string' ? rawInput.alias.trim() : '';
  const entry = findPersonaEntry(rawAlias);
  if (!entry) return { status: 'rejected', reason: 'UNKNOWN_ALIAS' };
  if (!deps.providerAvailable) {
    return { status: 'blocked', reason: 'PROVIDER_UNAVAILABLE' };
  }

  try {
    await deps.endCurrentSession();
  } catch {
    return { status: 'blocked', reason: 'SESSION_FAILED' };
  }

  let rawProviderResult: unknown;
  try {
    rawProviderResult = await deps.authenticate(entry.email);
  } catch {
    return { status: 'blocked', reason: 'PROVIDER_FAILED' };
  }
  if (rawProviderResult === null) {
    return { status: 'rejected', reason: 'AUTH_FAILED' };
  }
  const providerUser = toSafeProviderUser(rawProviderResult);
  if (!providerUser) {
    return { status: 'rejected', reason: 'PROVIDER_INVALID' };
  }

  let expiresAt: string | null;
  try {
    const session: unknown = await deps.establishSession();
    expiresAt = isRecord(session) ? toIsoDateOrNull(session.expiresAt) : null;
  } catch {
    return { status: 'blocked', reason: 'SESSION_FAILED' };
  }
  if (!expiresAt) {
    return { status: 'blocked', reason: 'SESSION_FAILED' };
  }

  let scope: PersonaScopeSummary | null;
  try {
    scope = toSafeScope(await deps.reloadScope());
  } catch {
    return { status: 'blocked', reason: 'SCOPE_FAILED' };
  }
  if (!scope) {
    return { status: 'blocked', reason: 'SCOPE_FAILED' };
  }

  return {
    status: 'authenticated',
    alias: entry.alias,
    displayName: providerUser.displayName,
    roleLabel: providerUser.roleLabel,
    expiresAt,
    scope,
  };
}
