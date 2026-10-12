export const VERIFICATION_OUTCOMES = [
  'pass',
  'blocked',
  'deferred',
  'failed',
] as const;

export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number];
export type VerificationExpectedOutcome = 'pass' | 'blocked';

export type VerificationCatalogItem = {
  scenarioId: `B7-${string}`;
  stepId: string;
  surface: 'web' | 'native' | 'bridge' | 'lifecycle';
  expectedOutcome: VerificationExpectedOutcome;
  contractRef: 'UAD-09' | 'UAD-10' | 'UAD-11' | 'UAD-12' | 'UAD-13';
};

export const B7_VERIFICATION_CATALOG: readonly VerificationCatalogItem[] = [
  {
    scenarioId: 'B7-01',
    stepId: 'start',
    surface: 'lifecycle',
    expectedOutcome: 'pass',
    contractRef: 'UAD-09',
  },
  {
    scenarioId: 'B7-02',
    stepId: 'target',
    surface: 'lifecycle',
    expectedOutcome: 'blocked',
    contractRef: 'UAD-10',
  },
  {
    scenarioId: 'B7-03',
    stepId: 'pause',
    surface: 'lifecycle',
    expectedOutcome: 'pass',
    contractRef: 'UAD-09',
  },
  {
    scenarioId: 'B7-04',
    stepId: 'cleanup',
    surface: 'web',
    expectedOutcome: 'pass',
    contractRef: 'UAD-09',
  },
  {
    scenarioId: 'B7-05',
    stepId: 'select',
    surface: 'web',
    expectedOutcome: 'blocked',
    contractRef: 'UAD-09',
  },
  {
    scenarioId: 'B7-06',
    stepId: 'write',
    surface: 'native',
    expectedOutcome: 'blocked',
    contractRef: 'UAD-12',
  },
  {
    scenarioId: 'B7-07',
    stepId: 'readiness',
    surface: 'bridge',
    expectedOutcome: 'blocked',
    contractRef: 'UAD-13',
  },
  {
    scenarioId: 'B7-08',
    stepId: 'persona',
    surface: 'web',
    expectedOutcome: 'pass',
    contractRef: 'UAD-11',
  },
  {
    scenarioId: 'B7-09',
    stepId: 'safe-state',
    surface: 'web',
    expectedOutcome: 'pass',
    contractRef: 'UAD-09',
  },
  {
    scenarioId: 'B7-10',
    stepId: 'replay',
    surface: 'web',
    expectedOutcome: 'blocked',
    contractRef: 'UAD-10',
  },
] as const;

const OWNER = 'T-012';
const MAX_DURATION_MS = 86_400_000;
const SAFE_REASONS = new Set([
  'OBSERVED',
  'MISSING_OPERATOR_EVIDENCE',
  'UNSAFE_OBSERVATION',
  'UNKNOWN_STATUS',
  'DUPLICATE_OBSERVATION',
]);
export type VerificationObservation = {
  scenarioId: unknown;
  stepId: unknown;
  status: unknown;
  reason?: unknown;
  [key: string]: unknown;
};

export type VerificationRow = {
  scenarioId: string;
  stepId: string;
  surface: VerificationCatalogItem['surface'];
  expectedOutcome: VerificationExpectedOutcome;
  status: VerificationOutcome;
  durationMs: number;
  reason: string;
  owner: typeof OWNER;
  contractRef: VerificationCatalogItem['contractRef'];
};

export type VerificationMatrix = { rows: readonly VerificationRow[] };

export type VerificationGate = {
  counts: Record<VerificationOutcome, number>;
  decision: 'pass' | 'blocked' | 'deferred';
  handoff: boolean;
};

function hasUnsafeInput(value: unknown): boolean {
  if (value === undefined) return false;
  try {
    return /password|passwd|secret|token|credential|pii|raw response|geometry|lat\s*[:=]|lng\s*[:=]|error text|@/i.test(
      JSON.stringify(value),
    );
  } catch {
    return true;
  }
}

function safeDuration(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(MAX_DURATION_MS, Math.max(0, Math.trunc(value)));
}

function row(
  item: VerificationCatalogItem,
  status: VerificationOutcome,
  reason: string,
  durationMs = 0,
): VerificationRow {
  return {
    scenarioId: item.scenarioId,
    stepId: item.stepId,
    surface: item.surface,
    expectedOutcome: item.expectedOutcome,
    status,
    durationMs,
    reason,
    owner: OWNER,
    contractRef: item.contractRef,
  };
}

export function createVerificationMatrix(input: {
  observations: readonly VerificationObservation[];
}): VerificationMatrix {
  const observations = new Map<string, VerificationObservation>();
  const duplicates = new Set<string>();
  for (const observation of input.observations) {
    if (
      typeof observation.scenarioId !== 'string' ||
      typeof observation.stepId !== 'string'
    )
      continue;
    const key = `${observation.scenarioId}\u0000${observation.stepId}`;
    if (observations.has(key)) duplicates.add(key);
    observations.set(key, observation);
  }

  return {
    rows: B7_VERIFICATION_CATALOG.map((item) => {
      const key = `${item.scenarioId}\u0000${item.stepId}`;
      const observation = observations.get(key);
      if (!observation)
        return row(item, 'deferred', 'MISSING_OPERATOR_EVIDENCE');
      if (duplicates.has(key))
        return row(
          item,
          'failed',
          'DUPLICATE_OBSERVATION',
          safeDuration(observation.durationMs),
        );
      if (hasUnsafeInput(observation))
        return row(
          item,
          'failed',
          'UNSAFE_OBSERVATION',
          safeDuration(observation.durationMs),
        );
      if (
        !VERIFICATION_OUTCOMES.includes(
          observation.status as VerificationOutcome,
        )
      ) {
        return row(
          item,
          'failed',
          'UNKNOWN_STATUS',
          safeDuration(observation.durationMs),
        );
      }
      return row(
        item,
        observation.status as VerificationOutcome,
        'OBSERVED',
        safeDuration(observation.durationMs),
      );
    }),
  };
}

export function evaluateVerificationGate(
  rows: readonly VerificationRow[],
): VerificationGate {
  const counts: Record<VerificationOutcome, number> = {
    pass: 0,
    blocked: 0,
    deferred: 0,
    failed: 0,
  };
  let unexpectedViolation = false;
  let forgedRow = rows.length > B7_VERIFICATION_CATALOG.length;
  for (const [index, item] of rows.entries()) {
    const candidate =
      item && typeof item === 'object'
        ? item
        : (null as VerificationRow | null);
    const expected = B7_VERIFICATION_CATALOG[index];
    const validStatus = VERIFICATION_OUTCOMES.includes(
      candidate?.status as VerificationOutcome,
    );
    if (validStatus) counts[candidate!.status] += 1;
    else {
      counts.failed += 1;
      forgedRow = true;
    }
    const keys = candidate && Object.keys(candidate).sort().join('|');
    const canonicalKeys =
      'contractRef|durationMs|expectedOutcome|owner|reason|scenarioId|status|stepId|surface';
    if (
      !expected ||
      keys !== canonicalKeys ||
      candidate?.scenarioId !== expected.scenarioId ||
      candidate?.stepId !== expected.stepId ||
      candidate?.surface !== expected.surface ||
      candidate?.expectedOutcome !== expected.expectedOutcome ||
      candidate?.contractRef !== expected.contractRef ||
      candidate?.owner !== OWNER ||
      !Number.isInteger(candidate?.durationMs) ||
      (candidate?.durationMs ?? -1) < 0 ||
      (candidate?.durationMs ?? MAX_DURATION_MS + 1) > MAX_DURATION_MS ||
      typeof candidate?.reason !== 'string' ||
      !SAFE_REASONS.has(candidate?.reason ?? '')
    ) {
      forgedRow = true;
    }
    if (
      candidate?.status === 'failed' ||
      (candidate?.status !== 'deferred' &&
        candidate?.status !== candidate?.expectedOutcome)
    ) {
      unexpectedViolation = true;
    }
  }
  const incomplete = rows.length < B7_VERIFICATION_CATALOG.length;
  const decision =
    forgedRow || unexpectedViolation
      ? 'blocked'
      : incomplete || counts.deferred > 0
        ? 'deferred'
        : 'pass';
  return {
    counts,
    decision,
    handoff: decision === 'pass' && !incomplete,
  };
}
