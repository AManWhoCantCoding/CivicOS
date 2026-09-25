// Guard an toan cho database demo: chi tac dong dung target demo.
// File nay thuan tuy, khong nap Prisma/domain de co the resolve + validate
// target truoc khi bat ky connection nao duoc mo.
export const DEMO_DB_NAMES = ['civicos_demo'] as const;

export const DEMO_LABELS = {
  incident: '[DEMO-INCIDENT-01]',
  incidentKey: 'demo-incident-01',
  establishment: '[DEMO] Quan karaoke Sao Dem',
  inspectionAt: '2026-03-10T08:00:00.000Z',
  plate: '43DEMO01',
  observationKey: 'demo-observation-01',
  registryReason: '[DEMO] Phuong tien can chu y phuc vu trinh dien',
} as const;

export type DemoTarget = { url: string; dbName: string; displayUrl: string };

// Input env toi thieu cho resolver/guard: nhan partial env test an toan,
// process.env van tuong thich.
export type DemoEnv = {
  [key: string]: string | undefined;
  DATABASE_URL?: string;
  DEMO_DATABASE_URL?: string;
  DEMO_RESET_CONFIRM?: string;
};

export function dbNameFromUrl(url: string): string {
  const path = new URL(url).pathname.replace(/^\//, '');
  return decodeURIComponent(path.split('?')[0]);
}

export function sanitizeUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.password) parsed.password = '***';
  return parsed.toString();
}

export function resolveDemoTarget(
  fallbackDatabaseUrl: string | undefined,
  demoDatabaseUrl: string | undefined,
): DemoTarget {
  const raw =
    demoDatabaseUrl ??
    fallbackDatabaseUrl?.replace(/\/[^/?]+(\?|$)/, '/civicos_demo$1');
  if (!raw) throw new Error('DEMO_DATABASE_URL_REQUIRED');
  return {
    url: raw,
    dbName: dbNameFromUrl(raw),
    displayUrl: sanitizeUrl(raw),
  };
}

export function assertDemoTarget(url: string): string {
  const dbName = dbNameFromUrl(url);
  if (!(DEMO_DB_NAMES as readonly string[]).includes(dbName)) {
    throw new Error(
      `DEMO_RESET_REFUSED: target "${dbName}" khong nam trong danh sach demo [${DEMO_DB_NAMES.join(', ')}]`,
    );
  }
  return dbName;
}

// Rang buoc connection thuc te: Prisma/domain doc DATABASE_URL luc khoi tao,
// nen phai ap target da validate vao env TRUOC khi dynamic-import bat ky
// module Prisma/domain nao.
export function applyDemoTargetToEnv(target: DemoTarget): void {
  process.env.DATABASE_URL = target.url;
}
