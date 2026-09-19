import type { IntakeReportInput } from './contracts';

export function parseIntakeReport(input: unknown): IntakeReportInput {
  if (!input || typeof input !== 'object') throw new Error('INVALID_INTAKE');
  const value = input as Record<string, unknown>;
  if (typeof value.content !== 'string' || typeof value.receivedAt !== 'string')
    throw new Error('INVALID_INTAKE');
  const channel = value.channel;
  if (
    channel !== 'in_person' &&
    channel !== 'telephone' &&
    channel !== 'manual_other'
  )
    throw new Error('INVALID_CHANNEL');
  const latitude = parseCoordinate(value.latitude);
  const longitude = parseCoordinate(value.longitude);
  if ((latitude === undefined) !== (longitude === undefined)) {
    throw new Error('GEOPOINT_INCOMPLETE');
  }
  return {
    channel,
    receivedAt: value.receivedAt,
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
