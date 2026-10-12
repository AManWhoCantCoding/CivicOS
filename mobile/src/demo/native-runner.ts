import { assertReadOnly } from '../components/WriteGuard';
import { deepLinkFor, type NavigationContext } from '../navigation/deepLinks';

export const DEMO_MANIFEST_VERSION = '1' as const;
export const DEMO_ACTIONS = [
  'navigate',
  'click',
  'fill',
  'open-select',
  'choose-option',
  'check',
  'submit',
  'wait-ready',
  'assert-state',
  'native-tap',
  'pause',
] as const;
export type DemoAction = (typeof DEMO_ACTIONS)[number];
export type NativeCommand = {
  mode: 'LIVE_DEMO';
  target: 'civicos_demo';
  origin: 'local' | 'demo';
  manifestVersion: string;
  sceneId: string;
  stepId: string;
  action: string;
  surface: 'mobile';
};
type NativeRoute =
  | 'Map'
  | 'RelatedInfo'
  | 'Alarms'
  | 'Dispatches'
  | 'Tasks'
  | 'Incident'
  | 'Land'
  | 'Settings';
type RelatedEntity = 'RESIDENT' | 'BUSINESS' | 'HOTSPOT' | 'VIOLATION';
export type NativeIntent =
  | { type: 'tab'; route: NativeRoute }
  | {
      type: 'related-info';
      query?: string;
      status?: string;
      entityType?: 'RESIDENT' | 'BUSINESS' | 'HOTSPOT' | 'VIOLATION';
    }
  | { type: 'deep-link'; link: Exclude<ReturnType<typeof deepLinkFor>, null> }
  | { type: 'unsupported' };
export type NativeResult = {
  sceneId: string;
  stepId: string;
  action: string;
  status: 'ready' | 'blocked';
  state: 'settled' | 'blocked' | 'failed';
  reason: string;
  durationMs: number;
};
export type NativeSceneDescriptor = {
  intent?: NativeIntent;
  writeMethod?: string;
  writePath?: string;
};

const routes = new Set<NativeRoute>([
  'Map',
  'RelatedInfo',
  'Alarms',
  'Dispatches',
  'Tasks',
  'Incident',
  'Land',
  'Settings',
]);
const commandKeys = [
  'mode',
  'target',
  'origin',
  'manifestVersion',
  'sceneId',
  'stepId',
  'action',
  'surface',
];
const resultKeys = [
  'sceneId',
  'stepId',
  'action',
  'status',
  'state',
  'reason',
  'durationMs',
];
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/;
const unsafe =
  /password|passwd|secret|token|credential|<script|javascript:|eval\s*\(|on\w+\s*=/i;
const safeReasons = new Set([
  'DEMO_STEP_SETTLED',
  'DEMO_STEP_BLOCKED',
  'DEMO_STEP_FAILED',
  'DEMO_STEP_INVALID_DESCRIPTOR',
  'DEMO_STEP_INTERACTION_UNAVAILABLE',
  'NATIVE_SESSION_REQUIRED',
  'READ_ONLY_MVP',
  'MAP_OFFLINE_WRITE_BLOCKED',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function safeId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    idPattern.test(value.trim()) &&
    !unsafe.test(value)
  );
}
function safeText(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length <= 128 && !unsafe.test(value)
  );
}
function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}
function normalizedCommand(input: unknown): NativeCommand | null {
  if (!isRecord(input) || !exactKeys(input, commandKeys)) return null;
  if (
    input.mode !== 'LIVE_DEMO' ||
    typeof input.target !== 'string' ||
    input.target.trim() !== 'civicos_demo' ||
    input.surface !== 'mobile'
  )
    return null;
  if (
    typeof input.origin !== 'string' ||
    !['local', 'demo'].includes(input.origin.trim())
  )
    return null;
  if (
    typeof input.manifestVersion !== 'string' ||
    input.manifestVersion.trim() !== DEMO_MANIFEST_VERSION
  )
    return null;
  if (
    !safeId(input.sceneId) ||
    !safeId(input.stepId) ||
    typeof input.action !== 'string'
  )
    return null;
  const action = input.action.trim();
  if (!(DEMO_ACTIONS as readonly string[]).includes(action)) return null;
  return {
    mode: 'LIVE_DEMO',
    target: 'civicos_demo',
    origin: input.origin.trim() as 'local' | 'demo',
    manifestVersion: DEMO_MANIFEST_VERSION,
    sceneId: input.sceneId.trim(),
    stepId: input.stepId.trim(),
    action,
    surface: 'mobile',
  };
}
export function validateNativeCommand(
  input: unknown,
): { ok: true; command: NativeCommand } | { ok: false; reason: string } {
  if (!isRecord(input)) return { ok: false, reason: 'BRIDGE_INVALID_SHAPE' };
  if (!exactKeys(input, commandKeys))
    return { ok: false, reason: 'BRIDGE_UNSAFE_CONTENT' };
  if (input.mode !== 'LIVE_DEMO')
    return { ok: false, reason: 'BRIDGE_STALE_MODE' };
  if (
    typeof input.target !== 'string' ||
    input.target.trim() !== 'civicos_demo'
  )
    return { ok: false, reason: 'BRIDGE_FORBIDDEN_TARGET' };
  if (
    typeof input.origin !== 'string' ||
    !['local', 'demo'].includes(input.origin.trim())
  )
    return { ok: false, reason: 'BRIDGE_FORBIDDEN_ORIGIN' };
  if (
    typeof input.manifestVersion !== 'string' ||
    input.manifestVersion.trim() !== DEMO_MANIFEST_VERSION
  )
    return { ok: false, reason: 'BRIDGE_VERSION_UNSUPPORTED' };
  if (input.surface !== 'mobile')
    return { ok: false, reason: 'BRIDGE_UNSUPPORTED_SURFACE' };
  if (!safeId(input.sceneId) || !safeId(input.stepId))
    return { ok: false, reason: 'BRIDGE_UNSAFE_CONTENT' };
  if (
    typeof input.action !== 'string' ||
    !(DEMO_ACTIONS as readonly string[]).includes(input.action.trim())
  )
    return { ok: false, reason: 'BRIDGE_UNKNOWN_ACTION' };
  const command = normalizedCommand(input);
  return command
    ? { ok: true, command }
    : { ok: false, reason: 'BRIDGE_INVALID_SHAPE' };
}

function normalizedContext(input: unknown): NavigationContext | null {
  if (
    !isRecord(input) ||
    !exactKeys(input, [
      'resourceType',
      'resourceId',
      'incidentId',
      'coordinates',
      'relatedInfo',
      'assignmentSummary',
    ])
  )
    return null;
  if (
    input.resourceType !== undefined &&
    !['Incident', 'VehicleObservation', 'RelatedInfo', 'Map'].includes(
      String(input.resourceType),
    )
  )
    return null;
  if (input.resourceId !== undefined && !safeId(input.resourceId)) return null;
  if (input.incidentId !== undefined && !safeId(input.incidentId)) return null;
  if (input.coordinates !== undefined) {
    const coordinates = input.coordinates;
    if (
      !isRecord(coordinates) ||
      !exactKeys(coordinates, ['lat', 'lng']) ||
      typeof coordinates.lat !== 'number' ||
      typeof coordinates.lng !== 'number' ||
      !Number.isFinite(coordinates.lat) ||
      !Number.isFinite(coordinates.lng) ||
      coordinates.lat < -90 ||
      coordinates.lat > 90 ||
      coordinates.lng < -180 ||
      coordinates.lng > 180
    )
      return null;
  }
  if (input.relatedInfo !== undefined) {
    const related = input.relatedInfo;
    if (
      !isRecord(related) ||
      !exactKeys(related, ['entityType', 'id']) ||
      !safeId(related.id) ||
      !['RESIDENT', 'BUSINESS', 'HOTSPOT', 'VIOLATION'].includes(
        String(related.entityType),
      )
    )
      return null;
  }
  if (input.assignmentSummary !== undefined) {
    const assignment = input.assignmentSummary;
    if (
      !isRecord(assignment) ||
      !exactKeys(assignment, ['assignmentId', 'task', 'status']) ||
      !safeId(assignment.assignmentId) ||
      !safeId(assignment.task) ||
      !safeId(assignment.status)
    )
      return null;
  }
  return {
    ...(input.resourceType === undefined
      ? {}
      : { resourceType: input.resourceType as string }),
    ...(input.resourceId === undefined
      ? {}
      : { resourceId: input.resourceId as string }),
    ...(input.incidentId === undefined
      ? {}
      : { incidentId: input.incidentId as string }),
    ...(input.coordinates === undefined
      ? {}
      : {
          coordinates: {
            lat: (input.coordinates as { lat: number }).lat,
            lng: (input.coordinates as { lng: number }).lng,
          },
        }),
    ...(input.relatedInfo === undefined
      ? {}
      : {
          relatedInfo: {
            entityType: (
              input.relatedInfo as {
                entityType: RelatedEntity;
              }
            ).entityType,
            id: (input.relatedInfo as { id: string }).id,
          },
        }),
    ...(input.assignmentSummary === undefined
      ? {}
      : {
          assignmentSummary: {
            assignmentId: (input.assignmentSummary as { assignmentId: string })
              .assignmentId,
            task: (input.assignmentSummary as { task: string }).task,
            status: (input.assignmentSummary as { status: string }).status,
          },
        }),
  };
}

function normalizeIntent(input: unknown): NativeIntent {
  if (
    !isRecord(input) ||
    !exactKeys(input, [
      'type',
      'route',
      'query',
      'status',
      'entityType',
      'link',
    ])
  )
    return { type: 'unsupported' };
  if (
    input.type === 'tab' &&
    routes.has(input.route as NativeRoute) &&
    exactKeys(input, ['type', 'route'])
  )
    return { type: 'tab', route: input.route as NativeRoute };
  if (
    input.type === 'related-info' &&
    exactKeys(input, ['type', 'query', 'status', 'entityType']) &&
    (input.query === undefined || safeText(input.query)) &&
    (input.status === undefined || safeText(input.status)) &&
    (input.entityType === undefined ||
      ['RESIDENT', 'BUSINESS', 'HOTSPOT', 'VIOLATION'].includes(
        String(input.entityType),
      ))
  )
    return {
      type: 'related-info',
      query: input.query as string | undefined,
      status: input.status as string | undefined,
      entityType: input.entityType as RelatedEntity | undefined,
    };
  if (
    input.type === 'deep-link' &&
    isRecord(input.link) &&
    exactKeys(input.link, ['route', 'params'])
  ) {
    const context = normalizedContext(input.link.params);
    const link = context ? deepLinkFor(context) : null;
    return link ? { type: 'deep-link', link } : { type: 'unsupported' };
  }
  return { type: 'unsupported' };
}
export function resolveNativeIntent(descriptor: unknown): NativeIntent {
  if (
    !isRecord(descriptor) ||
    !exactKeys(descriptor, ['intent', 'writeMethod', 'writePath'])
  )
    return { type: 'unsupported' };
  return normalizeIntent(descriptor.intent);
}

function safeResultPart(value: unknown): string {
  return safeId(value) ? value.trim() : 'unknown';
}
function safeAction(value: unknown): string {
  return typeof value === 'string' &&
    (DEMO_ACTIONS as readonly string[]).includes(value.trim())
    ? value.trim()
    : 'unknown';
}
function safeResultAction(value: unknown): string {
  return value === 'unknown' ? 'unknown' : safeAction(value);
}
export function runNativeCommand(input: {
  command: unknown;
  authenticated: boolean;
  scene?: unknown;
}): NativeResult {
  const checked = validateNativeCommand(input.command);
  const command = normalizedCommand(input.command);
  const base = {
    sceneId: safeResultPart(
      isRecord(input.command) ? input.command.sceneId : undefined,
    ),
    stepId: safeResultPart(
      isRecord(input.command) ? input.command.stepId : undefined,
    ),
    action: safeAction(
      isRecord(input.command) ? input.command.action : undefined,
    ),
  };
  if (!checked.ok || !command)
    return {
      ...base,
      status: 'blocked',
      state: 'blocked',
      reason: 'DEMO_STEP_INVALID_DESCRIPTOR',
      durationMs: 0,
    };
  if (!input.authenticated)
    return {
      ...base,
      status: 'blocked',
      state: 'blocked',
      reason: 'NATIVE_SESSION_REQUIRED',
      durationMs: 0,
    };
  if (command.action === 'submit')
    return {
      ...base,
      status: 'blocked',
      state: 'blocked',
      reason: 'READ_ONLY_MVP',
      durationMs: 0,
    };
  const rawScene = isRecord(input.scene) ? input.scene : {};
  if (
    input.scene !== undefined &&
    (!isRecord(input.scene) ||
      !exactKeys(rawScene, ['intent', 'writeMethod', 'writePath']) ||
      (rawScene.writeMethod !== undefined &&
        typeof rawScene.writeMethod !== 'string') ||
      (rawScene.writePath !== undefined &&
        typeof rawScene.writePath !== 'string') ||
      (rawScene.intent !== undefined &&
        normalizeIntent(rawScene.intent).type === 'unsupported'))
  )
    return {
      ...base,
      status: 'blocked',
      state: 'blocked',
      reason: 'DEMO_STEP_INVALID_DESCRIPTOR',
      durationMs: 0,
    };
  const rawWriteMethod = rawScene.writeMethod;
  if (
    typeof rawWriteMethod === 'string' &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      rawWriteMethod.trim().toUpperCase(),
    ) &&
    assertReadOnly(
      rawWriteMethod,
      false,
      typeof rawScene.writePath === 'string' ? rawScene.writePath : '',
    )
  )
    return {
      ...base,
      status: 'blocked',
      state: 'blocked',
      reason: 'READ_ONLY_MVP',
      durationMs: 0,
    };
  const scene = exactKeys(rawScene, ['intent', 'writeMethod', 'writePath'])
    ? rawScene
    : {};
  if (normalizeIntent(scene.intent).type === 'unsupported')
    return {
      ...base,
      status: 'blocked',
      state: 'blocked',
      reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
      durationMs: 0,
    };
  return {
    ...base,
    status: 'ready',
    state: 'settled',
    reason: 'DEMO_STEP_SETTLED',
    durationMs: 0,
  };
}

export function normalizeNativeResult(
  input: unknown,
): { ok: true; result: NativeResult } | { ok: false; reason: string } {
  if (!isRecord(input) || !exactKeys(input, resultKeys))
    return { ok: false, reason: 'BRIDGE_UNSAFE_CONTENT' };
  const durationMs = input.durationMs;
  const action = input.action;
  const normalizedAction = safeResultAction(action);
  const validResultAction =
    action === 'unknown' ||
    (typeof action === 'string' &&
      (DEMO_ACTIONS as readonly string[]).includes(action.trim()));
  if (
    !safeId(input.sceneId) ||
    !safeId(input.stepId) ||
    !validResultAction ||
    (input.status !== 'ready' && input.status !== 'blocked') ||
    !['settled', 'blocked', 'failed'].includes(String(input.state)) ||
    typeof input.reason !== 'string' ||
    !safeReasons.has(input.reason) ||
    typeof durationMs !== 'number' ||
    !Number.isInteger(durationMs) ||
    durationMs < 0 ||
    durationMs > 300000
  )
    return {
      ok: false,
      reason:
        typeof durationMs !== 'number' ||
        !Number.isInteger(durationMs) ||
        durationMs < 0 ||
        durationMs > 300000
          ? 'BRIDGE_RESULT_DURATION_OUT_OF_BOUNDS'
          : 'BRIDGE_RESULT_INVALID_SHAPE',
    };
  return {
    ok: true,
    result: {
      sceneId: input.sceneId.trim(),
      stepId: input.stepId.trim(),
      action: normalizedAction,
      status: input.status,
      state: input.state as NativeResult['state'],
      reason: input.reason,
      durationMs,
    },
  };
}
export function serializeNativeResult(result: unknown): string {
  const normalized = normalizeNativeResult(result);
  if (!normalized.ok) throw new Error(normalized.reason);
  return JSON.stringify(normalized.result);
}
export function deepLinkIntent(context: unknown): NativeIntent {
  const normalized = normalizedContext(context);
  const link = normalized ? deepLinkFor(normalized) : null;
  return link ? { type: 'deep-link', link } : { type: 'unsupported' };
}
export function nativeCommandIdentity(input: unknown): string {
  const command = normalizedCommand(input);
  return command
    ? [
        command.mode,
        command.target,
        command.origin,
        command.manifestVersion,
        command.surface,
        command.sceneId,
        command.stepId,
        command.action,
      ].join('|')
    : 'invalid';
}
