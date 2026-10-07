// Demo clock/preflight seam for demo-seed-restart (T-001).
// Reuses src/modules/platform/clock semantics. Pure module: no Prisma/domain
// import so validation always runs before any connection or mutation.
import { fixedClock, parseDemoNow, type Clock } from '@/modules/platform/clock';
import { resolveDemoTarget, type DemoEnv, type DemoTarget } from './demo-db';

export type DemoClockEnv = {
  [key: string]: string | undefined;
  DEMO_NOW?: string;
};

export function preflightDemoClock(env: DemoClockEnv = process.env): {
  now: Date;
  clock: Clock;
} {
  const now = parseDemoNow(env.DEMO_NOW);
  return { now, clock: fixedClock(now) };
}

// Single foundation boundary: target validation then clock validation,
// both before any Prisma/domain import or mutation.
export function preflightDemoFoundation(
  env: DemoEnv & DemoClockEnv = process.env,
): { target: DemoTarget; now: Date; clock: Clock } {
  const target = resolveDemoTarget(env.DATABASE_URL, env.DEMO_DATABASE_URL);
  const { now, clock } = preflightDemoClock(env);
  return { target, now, clock };
}

export { parseDemoNow };
