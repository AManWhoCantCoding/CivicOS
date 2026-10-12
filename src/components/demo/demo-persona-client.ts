export type DemoPersonaClientResult =
  | {
      status: 'authenticated';
      alias: string;
      displayName: string;
      roleLabel: string;
      expiresAt: string;
      scope: {
        organizationUnitId?: string;
        assignmentCount: number;
        assignmentState: 'ready' | 'empty';
      };
    }
  | { status: 'blocked' | 'rejected'; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Demo persona switch for local/demo runs. Posts only the allowlisted alias
 * with explicit LIVE_DEMO mode, then awaits the injected scope reload
 * (useWorkspaceSession `retry`) after successful authentication.
 */
export async function switchDemoPersonaClient(
  alias: string,
  options: { reloadScope: () => Promise<void> | void },
): Promise<DemoPersonaClientResult> {
  let response: Response;
  try {
    response = await fetch('/api/demo/persona', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ alias, mode: 'LIVE_DEMO' }),
    });
  } catch {
    return { status: 'blocked', reason: 'PERSONA_UNAVAILABLE' };
  }
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok || !isRecord(body) || body.status !== 'authenticated') {
    const reason =
      isRecord(body) && typeof body.reason === 'string'
        ? body.reason
        : 'PERSONA_UNAVAILABLE';
    const status =
      isRecord(body) && body.status === 'rejected' ? 'rejected' : 'blocked';
    return { status, reason };
  }
  if (
    typeof body.displayName !== 'string' ||
    typeof body.roleLabel !== 'string' ||
    typeof body.expiresAt !== 'string' ||
    !isRecord(body.scope)
  ) {
    return { status: 'blocked', reason: 'PERSONA_UNAVAILABLE' };
  }
  // Never normalize a malformed scope into an authenticated session: reject it.
  const scope = body.scope;
  if (
    typeof scope.assignmentCount !== 'number' ||
    !Number.isInteger(scope.assignmentCount) ||
    scope.assignmentCount < 0 ||
    (scope.assignmentState !== 'ready' && scope.assignmentState !== 'empty') ||
    ('organizationUnitId' in scope &&
      typeof scope.organizationUnitId !== 'string')
  ) {
    return { status: 'blocked', reason: 'PERSONA_UNAVAILABLE' };
  }
  await options.reloadScope();
  return {
    status: 'authenticated',
    alias: typeof body.alias === 'string' ? body.alias : alias,
    displayName: body.displayName,
    roleLabel: body.roleLabel,
    expiresAt: body.expiresAt,
    scope: {
      ...('organizationUnitId' in scope &&
      typeof scope.organizationUnitId === 'string'
        ? { organizationUnitId: scope.organizationUnitId }
        : {}),
      assignmentCount: scope.assignmentCount,
      assignmentState: scope.assignmentState,
    },
  };
}
