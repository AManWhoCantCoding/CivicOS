import { validateDemoManifest } from './manifest';

// Injected, non-owning readiness seam (T-008). The evaluator only consumes
// observations or probe results supplied by the operator-owned environment;
// it never starts, stops or restarts infrastructure itself.

export type ReadinessStatus = 'ready' | 'unavailable' | 'unknown';

export type ReadinessDependencyKey =
  | 'bridge'
  | 'device'
  | 'api'
  | 'worker'
  | 'map'
  | 'target'
  | 'mode'
  | 'manifest';

export type ReadinessProbeResult =
  | ReadinessStatus
  | { status: ReadinessStatus }
  | { state: 'ready' | 'blocked' };

export type ReadinessProbe =
  | ReadinessProbeResult
  | Promise<ReadinessProbeResult>
  | (() => ReadinessProbeResult | Promise<ReadinessProbeResult>);

export type ReadinessInput = {
  bridge?: ReadinessProbe | null;
  device?: ReadinessProbe | null;
  api?: ReadinessProbe | null;
  worker?: ReadinessProbe | null;
  map?: ReadinessProbe | null;
  target?: ReadinessProbe | { state: string } | null;
  mode?: ReadinessProbe | string | null;
  manifest?: unknown;
};

export type BridgeReadiness = {
  state: 'ready' | 'blocked';
  canStart: boolean;
  dependencies: Record<ReadinessDependencyKey, ReadinessStatus>;
  reasons: string[];
  message: string;
};

const PREREQUISITE_REASONS: Record<ReadinessDependencyKey, string> = {
  bridge:
    'Cầu nối thiết bị chưa sẵn sàng. Liên hệ operator để chuẩn bị cầu nối trước khi chạy mobile.',
  device:
    'Thiết bị chưa sẵn sàng. Liên hệ operator để chuẩn bị thiết bị trước khi chạy mobile.',
  api: 'API đọc chưa sẵn sàng. Liên hệ operator để kiểm tra cấu hình API trước khi chạy mobile.',
  worker:
    'Worker chưa sẵn sàng. Liên hệ operator để xác nhận worker trước khi chạy mobile.',
  map: 'Bản đồ chưa sẵn sàng. Liên hệ operator để xác nhận provider bản đồ trước khi chạy mobile.',
  target:
    'Target demo chưa sẵn sàng. Liên hệ operator để cấu hình target civicos trước khi chạy mobile.',
  mode: 'Chế độ demo chưa bật. Liên hệ operator để bật chế độ LIVE_DEMO trước khi chạy mobile.',
  manifest:
    'Manifest mobile chưa hợp lệ. Liên hệ operator để kiểm tra manifest trước khi chạy mobile.',
};

function statusOf(value: unknown): ReadinessStatus {
  if (value === 'ready' || value === 'unavailable' || value === 'unknown') {
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as { status?: unknown; state?: unknown };
    if (
      record.status === 'ready' ||
      record.status === 'unavailable' ||
      record.status === 'unknown'
    ) {
      return record.status;
    }
    if (record.state === 'ready') return 'ready';
    if (record.state === 'blocked') return 'unavailable';
  }
  return 'unknown';
}

async function resolveProbe(value: unknown): Promise<ReadinessStatus> {
  try {
    if (value === undefined || value === null) return 'unknown';
    if (typeof value === 'function') {
      return statusOf(await Promise.resolve((value as () => unknown)()));
    }
    return statusOf(await Promise.resolve(value));
  } catch {
    return 'unknown';
  }
}

async function resolveMode(value: unknown): Promise<ReadinessStatus> {
  if (value === undefined || value === null) return 'unknown';
  if (typeof value === 'string') {
    return value.trim() === 'LIVE_DEMO' ? 'ready' : 'unavailable';
  }
  return resolveProbe(value);
}

async function resolveTarget(value: unknown): Promise<ReadinessStatus> {
  try {
    if (value === undefined || value === null) return 'unknown';
    const resolved =
      typeof value === 'function'
        ? await Promise.resolve((value as () => unknown)())
        : await Promise.resolve(value);
    if (typeof resolved !== 'object' || resolved === null) return 'unknown';
    const target = resolved as {
      state?: unknown;
      target?: unknown;
      canStart?: unknown;
    };
    if (
      target.state === 'ready' &&
      target.target === 'civicos' &&
      target.canStart === true
    ) {
      return 'ready';
    }
    if (
      target.state === 'blocked' ||
      target.target === 'forbidden' ||
      target.target === 'unknown' ||
      target.canStart === false
    ) {
      return 'unavailable';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

async function resolveManifest(value: unknown): Promise<ReadinessStatus> {
  if (value === undefined || value === null) return 'unknown';
  if (!validateDemoManifest(value).ok) return 'unavailable';
  return typeof value === 'object' &&
    value !== null &&
    (value as { surface?: unknown }).surface === 'mobile'
    ? 'ready'
    : 'unavailable';
}

const DEPENDENCY_ORDER: readonly ReadinessDependencyKey[] = [
  'bridge',
  'device',
  'api',
  'worker',
  'map',
  'target',
  'mode',
  'manifest',
];

export async function evaluateBridgeReadiness(
  input: ReadinessInput,
): Promise<BridgeReadiness> {
  const dependencies: Record<ReadinessDependencyKey, ReadinessStatus> = {
    bridge: await resolveProbe(input.bridge),
    device: await resolveProbe(input.device),
    api: await resolveProbe(input.api),
    worker: await resolveProbe(input.worker),
    map: await resolveProbe(input.map),
    target: await resolveTarget(input.target),
    mode: await resolveMode(input.mode),
    manifest: await resolveManifest(input.manifest),
  };
  const reasons = DEPENDENCY_ORDER.filter(
    (key) => dependencies[key] !== 'ready',
  ).map((key) => PREREQUISITE_REASONS[key]);
  const ready = reasons.length === 0;
  return {
    state: ready ? 'ready' : 'blocked',
    canStart: ready,
    dependencies,
    reasons,
    message: ready
      ? 'Cầu nối mobile đã sẵn sàng.'
      : `Cầu nối mobile bị chặn. ${reasons.join(' ')}`,
  };
}
