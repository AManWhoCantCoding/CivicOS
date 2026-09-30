export interface Clock {
  now(): Date;
}

export const systemClock: Clock = Object.freeze({
  now: () => new Date(),
});

export function fixedClock(value: Date | string): Clock {
  const instant = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(instant)) throw new Error('DEMO_NOW_INVALID');
  return Object.freeze({
    now: () => new Date(instant),
  });
}

export function parseDemoNow(raw: string | undefined): Date {
  const value = raw?.trim();
  if (!value || !/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    throw new Error('DEMO_NOW_INVALID');
  }
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) throw new Error('DEMO_NOW_INVALID');
  return instant;
}

export function resolveDemoClock(env: { DEMO_NOW?: string }): Clock {
  return fixedClock(parseDemoNow(env.DEMO_NOW));
}
