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
  return {
    channel,
    receivedAt: value.receivedAt,
    content: value.content,
    sourceName:
      typeof value.sourceName === 'string' ? value.sourceName : undefined,
    sourceContact:
      typeof value.sourceContact === 'string' ? value.sourceContact : undefined,
    latitude: typeof value.latitude === 'number' ? value.latitude : undefined,
    longitude:
      typeof value.longitude === 'number' ? value.longitude : undefined,
    sensitiveRef:
      typeof value.sensitiveRef === 'string' ? value.sensitiveRef : undefined,
  };
}
