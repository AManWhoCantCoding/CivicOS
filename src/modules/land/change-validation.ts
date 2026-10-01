// LND-07 change-type validation (DR-12–DR-15, EC-10–EC-12).
// Locked shapes: data-model.md:141-148 (payload), 150-171 (links),
// 228-235 (business constraints); domain-rules DR-12–DR-15;
// api-contract DecimalString + error table.
// This module performs sync validation only. Mortgage release active
// encumbrance prerequisite (DR-14, EC-11) needs a DB read and lives in
// application-service.ts via hasActiveEncumbrance prerequisite check.
import { isDecimalString, type ApplicationInput } from './schemas';

function fail(): never {
  throw new Error('INVALID_REQUEST');
}

function asPayloadRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload))
    fail();
  return payload as Record<string, unknown>;
}

function requireExactKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
): void {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length) fail();
  for (let i = 0; i < expected.length; i += 1) {
    if (actual[i] !== expected[i]) fail();
  }
}

// Parse a share value (string DecimalString or number) to integer cents.
// Accepts both forms so LND-06 numeric payloads (shareChanges 100) and
// DecimalString links ("100.00") canonicalize to the same total.
function shareToCents(value: unknown): number {
  if (typeof value === 'string') {
    if (!isDecimalString(value)) fail();
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100) fail();
    return Math.round(numeric * 100);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0 || value > 100) fail();
    if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-9) fail();
    return Math.round(value * 100);
  }
  fail();
}

// Normalize a share value to canonical DecimalString "xx.yy" for the
// idempotency fingerprint so 100, 100.0, "100" and "100.00" match.
export function normalizeShare(value: unknown): string {
  const cents = shareToCents(value);
  return (cents / 100).toFixed(2);
}

// Canonicalize changePayload for fingerprint comparison (DR-07, EC-04/05).
// Only transfer shares need normalization; other payloads are plain strings.
// Transfer shareChanges sort deterministically by normalized share so
// semantically identical multi-holder payloads in different order replay
// rather than conflict. All other keys (unknown top-level or entry fields)
// are preserved in the fingerprint so a retry with extra keys conflicts
// instead of replaying (DR-07/EC-05, exact payload shape). Best-effort:
// unparseable shares return the raw payload so fingerprint comparison still
// detects a difference (conflict) instead of throwing before the
// idempotency check.
export function canonicalizeChangePayload(
  changeType: string,
  payload: unknown,
): unknown {
  try {
    const record = asPayloadRecord(payload);
    if (changeType === 'transfer') {
      const changes = record['shareChanges'];
      if (!Array.isArray(changes)) return payload;
      const normalized = changes.map((entry) => {
        const item = asPayloadRecord(entry);
        return {
          ...item,
          partyRole: item['partyRole'],
          sharePercent: normalizeShare(item['sharePercent']),
        };
      });
      normalized.sort((a, b) => {
        const shareOrder = (a.sharePercent as string).localeCompare(
          b.sharePercent as string,
        );
        if (shareOrder !== 0) return shareOrder;
        return String(a.partyRole).localeCompare(String(b.partyRole));
      });
      return { ...record, shareChanges: normalized };
    }
    return payload;
  } catch {
    return payload;
  }
}

function assertNoDuplicateParties(input: ApplicationInput): void {
  const seen = new Set<string>();
  for (const party of input.parties) {
    const key = `${party.partyId}\u0000${party.partyRole}`;
    if (seen.has(key)) fail();
    seen.add(key);
  }
}

function assertNoDuplicateParcels(input: ApplicationInput): void {
  const seen = new Set<string>();
  for (const parcel of input.parcels) {
    const key = `${parcel.parcelId}\u0000${parcel.parcelRole}`;
    if (seen.has(key)) fail();
    seen.add(key);
  }
}

function validateTransfer(input: ApplicationInput): void {
  const payload = asPayloadRecord(input.changePayload);
  requireExactKeys(payload, ['shareChanges']);
  const changes = payload['shareChanges'];
  if (!Array.isArray(changes) || changes.length < 1) fail();
  const payloadCents: number[] = [];
  for (const entry of changes) {
    const item = asPayloadRecord(entry);
    requireExactKeys(item, ['partyRole', 'sharePercent']);
    if (item['partyRole'] !== 'proposed_holder') fail();
    payloadCents.push(shareToCents(item['sharePercent']));
  }
  if (payloadCents.reduce((sum, cents) => sum + cents, 0) !== 10000) fail();

  const hasCurrent = input.parties.some(
    (p) => p.partyRole === 'current_holder',
  );
  const proposed = input.parties.filter(
    (p) => p.partyRole === 'proposed_holder',
  );
  if (!hasCurrent || proposed.length < 1) fail();
  const linkCents: number[] = [];
  for (const party of input.parties) {
    if (party.partyRole === 'proposed_holder') {
      if (party.sharePercent === null) fail();
      linkCents.push(shareToCents(party.sharePercent));
    } else {
      if (party.sharePercent !== null) fail();
    }
  }
  if (linkCents.reduce((sum, cents) => sum + cents, 0) !== 10000) fail();
  // Payload shareChanges multiset must equal proposed-holder link multiset
  // after cent normalization (locked payload has no party IDs, only
  // partyRole/sharePercent). Preserves multi-holder 50/50, 60/40, etc.
  if (payloadCents.length !== linkCents.length) fail();
  const sortedPayload = [...payloadCents].sort((a, b) => a - b);
  const sortedLinks = [...linkCents].sort((a, b) => a - b);
  for (let i = 0; i < sortedPayload.length; i += 1) {
    if (sortedPayload[i] !== sortedLinks[i]) fail();
  }

  // Locked single-subject shape (data-model 3.7, 5.2): exactly one subject
  // parcel for transfer; split/merge alone uses many source/result.
  if (input.parcels.length !== 1) fail();
  if (input.parcels[0]?.parcelRole !== 'subject') fail();
}

function validateInformationUpdate(input: ApplicationInput): void {
  const payload = asPayloadRecord(input.changePayload);
  requireExactKeys(payload, ['field', 'newValue']);
  const field = payload['field'];
  if (field !== 'address' && field !== 'landUseType') fail();
  const newValue = payload['newValue'];
  if (typeof newValue !== 'string' || !newValue.trim()) fail();
  for (const party of input.parties) {
    if (party.sharePercent !== null) fail();
  }
  if (input.parcels.length !== 1) fail();
  if (input.parcels[0]?.parcelRole !== 'subject') fail();
}

function validateMortgage(input: ApplicationInput): void {
  const payload = asPayloadRecord(input.changePayload);
  requireExactKeys(payload, ['action']);
  const action = payload['action'];
  if (action !== 'register' && action !== 'release') fail();
  for (const party of input.parties) {
    if (party.sharePercent !== null) fail();
  }
  if (input.parcels.length !== 1) fail();
  if (input.parcels[0]?.parcelRole !== 'subject') fail();
  if (action === 'register') {
    const hasSecured = input.parties.some(
      (p) => p.partyRole === 'secured_party',
    );
    if (!hasSecured) fail();
  }
}

function validateSplitMerge(input: ApplicationInput): void {
  const payload = asPayloadRecord(input.changePayload);
  requireExactKeys(payload, ['operation']);
  const operation = payload['operation'];
  if (operation !== 'split' && operation !== 'merge') fail();
  for (const party of input.parties) {
    if (party.sharePercent !== null) fail();
  }
  const hasSource = input.parcels.some((p) => p.parcelRole === 'source');
  const hasResult = input.parcels.some((p) => p.parcelRole === 'result');
  if (!hasSource || !hasResult) fail();
  for (const parcel of input.parcels) {
    if (parcel.parcelRole !== 'source' && parcel.parcelRole !== 'result')
      fail();
  }
}

// Validate per-changeType payload and link rules (LND-07).
// Throws INVALID_REQUEST before any row/transition (DR-12–DR-15,
// EC-10–EC-12). Approved role catalog itself is enforced by
// parseApplicationInput (LND-06); here we enforce required roles,
// share totals, exact payload enums and parcel-role shape.
export function validateApplicationChange(input: ApplicationInput): void {
  if (input.parties.length < 1 || input.parcels.length < 1) fail();
  assertNoDuplicateParties(input);
  assertNoDuplicateParcels(input);
  switch (input.changeType) {
    case 'transfer':
      validateTransfer(input);
      break;
    case 'information_update':
      validateInformationUpdate(input);
      break;
    case 'mortgage':
      validateMortgage(input);
      break;
    case 'parcel_split_merge':
      validateSplitMerge(input);
      break;
    default:
      fail();
  }
}
