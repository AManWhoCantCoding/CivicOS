// Guard an toan cho database demo: chi tac dong dung target demo.
// File nay thuan tuy, khong nap Prisma/domain de co the resolve + validate
// target truoc khi bat ky connection nao duoc mo.
export const DEMO_DB_NAMES = ['civicos'] as const;

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
  const parsed = new URL(url);
  // Fail closed: chi nhan URL database PostgreSQL that. Mot URL http(s)
  // thuần (vd http://localhost:3000/civicos) voi path trung "civicos" khong
  // duoc coi la database target.
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error(
      `DEMO_TARGET_CONFLICT: scheme "${parsed.protocol}" khong phai URL database PostgreSQL`,
    );
  }
  const path = parsed.pathname.replace(/^\//, '');
  return decodeURIComponent(path.split('?')[0]);
}

function assertLocalComposeEndpoint(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error(
      `DEMO_TARGET_CONFLICT: scheme "${parsed.protocol}" khong phai URL database PostgreSQL`,
    );
  }
  if (!['localhost', '127.0.0.1'].includes(parsed.hostname.toLowerCase())) {
    throw new Error(
      'DEMO_TARGET_LOCAL_ONLY: demo chi cho phep PostgreSQL tren loopback',
    );
  }
  if (parsed.port && parsed.port !== '5432') {
    throw new Error(
      'DEMO_TARGET_LOCAL_ONLY: demo chi cho phep PostgreSQL port 5432',
    );
  }
}

export function sanitizeUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.password) parsed.password = '***';
  return parsed.toString();
}

// Canonical target la DATABASE_URL (Prisma runtime doc chinh no). Alias
// DEMO_DATABASE_URL chi duoc chap nhan neu gang khop chinh xac database name
// da chon; khong duoc dung de chi dinh mot target khac cach tinh.
export function resolveDemoTarget(
  databaseUrl: string | undefined,
  demoDatabaseUrl: string | undefined,
): DemoTarget {
  if (!databaseUrl) throw new Error('DEMO_DATABASE_URL_REQUIRED');
  const dbName = assertDemoTarget(databaseUrl);
  const alias = demoDatabaseUrl?.trim();
  if (alias) {
    let aliasName: string;
    try {
      aliasName = assertDemoTarget(alias);
    } catch {
      throw new Error(
        'DEMO_TARGET_CONFLICT: DEMO_DATABASE_URL khong khop target local hop le',
      );
    }
    if (aliasName !== dbName) {
      throw new Error(
        `DEMO_TARGET_CONFLICT: DEMO_DATABASE_URL trỏ "${aliasName}" khác DATABASE_URL "${dbName}"`,
      );
    }
  }
  return {
    url: databaseUrl,
    dbName,
    displayUrl: sanitizeUrl(databaseUrl),
  };
}

export function assertDemoTarget(url: string): string {
  const dbName = dbNameFromUrl(url);
  assertLocalComposeEndpoint(url);
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
