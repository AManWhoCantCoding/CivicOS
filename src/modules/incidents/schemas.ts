import type {
  IncidentInput,
  IntakeClassification,
  IntakeReportInput,
  IntakeSourceChannel,
} from './contracts';
import { normalizeSourceChannel } from './domain';

function readChannel(value: Record<string, unknown>): {
  channel: IntakeReportInput['channel'];
  sourceChannel: IntakeSourceChannel;
} {
  if (typeof value.sourceChannel === 'string' && value.sourceChannel.trim()) {
    const sourceChannel = normalizeSourceChannel(value.sourceChannel.trim());
    return { channel: sourceChannel, sourceChannel };
  }
  if (typeof value.channel !== 'string' || !value.channel.trim()) {
    throw new Error('INVALID_CHANNEL');
  }
  const raw = value.channel.trim();
  const sourceChannel = normalizeSourceChannel(raw);
  if (
    raw === 'direct' ||
    raw === 'phone' ||
    raw === 'app' ||
    raw === 'district_transfer'
  ) {
    return { channel: raw, sourceChannel };
  }
  return {
    channel: raw as IntakeReportInput['channel'],
    sourceChannel,
  };
}

function readClassification(value: unknown): IntakeClassification | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === 'sufficient' || value === 'needs_verification') {
    return value;
  }
  throw new Error('INVALID_CLASSIFICATION');
}

function readOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** Parse intake boundary input into the canonical write model. */
export function parseIntakeReport(
  input: unknown,
): Omit<IntakeReportInput, 'receivedAt'> {
  if (!input || typeof input !== 'object') throw new Error('INVALID_INTAKE');
  const value = input as Record<string, unknown>;
  if (typeof value.content !== 'string') throw new Error('INVALID_INTAKE');
  const { channel, sourceChannel } = readChannel(value);
  const latitude = parseCoordinate(value.latitude);
  const longitude = parseCoordinate(value.longitude);
  if ((latitude === undefined) !== (longitude === undefined)) {
    throw new Error('GEOPOINT_INCOMPLETE');
  }
  return {
    channel,
    sourceChannel,
    content: value.content,
    sourceName:
      typeof value.sourceName === 'string' ? value.sourceName : undefined,
    sourceContact:
      typeof value.sourceContact === 'string' ? value.sourceContact : undefined,
    latitude,
    longitude,
    sensitiveRef:
      typeof value.sensitiveRef === 'string' ? value.sensitiveRef : undefined,
  };
}

/** Parse the source-compatible direct incident payload. */
export function parseIncident(input: unknown): IncidentInput {
  if (!input || typeof input !== 'object') throw new Error('INVALID_INCIDENT');
  const value = input as Record<string, unknown>;
  const description =
    typeof value.description === 'string' ? value.description.trim() : '';
  if (!description) throw new Error('DESCRIPTION_REQUIRED');
  const latitude = parseCoordinate(value.latitude);
  const longitude = parseCoordinate(value.longitude);
  if ((latitude === undefined) !== (longitude === undefined)) {
    throw new Error('GEOPOINT_INCOMPLETE');
  }
  return {
    description,
    category: readOptionalText(value.category),
    severity: readOptionalText(value.severity),
    latitude,
    longitude,
  };
}

export function parseIntakeClassification(input: unknown): {
  classification: IntakeClassification;
  verificationNote?: string;
  verificationResult?: string;
} {
  if (!input || typeof input !== 'object') throw new Error('INVALID_INTAKE');
  const value = input as Record<string, unknown>;
  const classification = readClassification(value.classification);
  if (!classification) throw new Error('CLASSIFICATION_REQUIRED');
  return {
    classification,
    verificationNote:
      typeof value.verificationNote === 'string'
        ? value.verificationNote
        : undefined,
    verificationResult:
      typeof value.verificationResult === 'string'
        ? value.verificationResult
        : undefined,
  };
}

function parseCoordinate(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const coordinate =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(coordinate)) throw new Error('INVALID_LOCATION');
  return coordinate;
}
