import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readPilot01CommanderSecret } from './pilot01-secret-store';

const ORIGIN = new URL('http://127.0.0.1:3100');
const LAND_REVIEW_EMAIL = 'pilot01-land-review@civicos.local';
const LAND_REVIEW_UNIT_ID = 'pilot01-synthetic-district';
const LAND_REVIEW_SECRET_PATH = path.join(
  process.cwd(),
  '.scratch',
  'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
  'land-review-officer.dpapi',
);

type Pilot01ReviewIdentity = {
  id: string;
  email: string;
  role: string;
  unitId: string;
};

type HandoffStage =
  | 'WINDOWS_ACCOUNT_CONFIRMATION'
  | 'BROWSER_LAUNCH'
  | 'LOGIN_NAVIGATION'
  | 'LOGIN_WAIT'
  | 'SESSION_VERIFICATION'
  | 'LAND_PAGE'
  | 'VISUAL_REVIEW'
  | 'LOGOUT';

const SAFE_HANDOFF_ERROR_CODES = new Set([
  'PILOT01_WINDOWS_IDENTITY_UNAVAILABLE',
  'PILOT01_INTERACTIVE_TERMINAL_REQUIRED',
  'PILOT01_PO_CONTEXT_NOT_CONFIRMED',
  'PILOT01_LAND_REVIEW_SECRET_DISPLAY_NOT_CONFIRMED',
  'PILOT01_LAND_REVIEW_SECRET_REQUIRED',
  'PILOT01_LAND_REVIEW_SECRET_UNAVAILABLE',
  'PILOT01_BROWSER_DISCONNECTED_BEFORE_LOGOUT',
  'PILOT01_LOGIN_FORM_UNVERIFIED',
  'PILOT01_BROWSER_SESSION_SESSION_FETCH_FAILED',
  'PILOT01_BROWSER_SESSION_PARTY_FETCH_VALIDATION_FAILED',
  'PILOT01_BROWSER_SESSION_PARCEL_LIST_FETCH_FAILED',
  'PILOT01_BROWSER_SESSION_PARCEL_DETAIL_FETCH_FAILED',
  'PILOT01_BROWSER_SESSION_UNVERIFIED',
  'PILOT01_SESSION_LOGOUT_FAILED',
  'PILOT01_WINDOWS_REQUIRED',
  'PILOT01_DEBUG_OUTPUT_REFUSED',
  'PILOT01_LOGIN_ORIGIN_UNVERIFIED',
  'PILOT01_LAND_LIST_PAGE_UNVERIFIED',
  'PILOT01_LAND_REVIEW_HANDOFF_FAILED',
]);

function handoffStageError(
  error: unknown,
  stage: HandoffStage,
  identityVerified: boolean,
): Error {
  const phase = identityVerified
    ? 'AFTER_VERIFIED_IDENTITY'
    : 'BEFORE_VERIFIED_IDENTITY';
  const code =
    error instanceof Error && SAFE_HANDOFF_ERROR_CODES.has(error.message)
      ? `${error.message}_AT_${stage}_${phase}`
      : `PILOT01_${stage}_${phase}_FAILED`;
  return new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function currentWindowsIdentity(): string {
  try {
    const identity = execFileSync('whoami.exe', [], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5_000,
    }).trim();
    if (identity) return identity;
  } catch {
    // Keep process details out of the error output.
  }
  throw new Error('PILOT01_WINDOWS_IDENTITY_UNAVAILABLE');
}

async function confirmPoContext(identity: string): Promise<void> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('PILOT01_INTERACTIVE_TERMINAL_REQUIRED');
  }
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await terminal.question(
      `Windows account: ${identity}. Confirm this is the PO-approved account; type PO to continue: `,
    );
    if (answer.trim() !== 'PO') {
      throw new Error('PILOT01_PO_CONTEXT_NOT_CONFIRMED');
    }
  } finally {
    terminal.close();
  }
}

async function confirmAndDisplayLandReviewPassword(): Promise<void> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('PILOT01_INTERACTIVE_TERMINAL_REQUIRED');
  }
  const terminal = createInterface({ input: stdin, output: stdout });
  let password: string | null = null;
  try {
    const answer = await terminal.question(
      'The land review password will be displayed once for manual browser entry; type SHOW to continue: ',
    );
    if (answer.trim() !== 'SHOW') {
      throw new Error('PILOT01_LAND_REVIEW_SECRET_DISPLAY_NOT_CONFIRMED');
    }
    if (!stdin.isTTY || !stdout.isTTY) {
      throw new Error('PILOT01_INTERACTIVE_TERMINAL_REQUIRED');
    }
    try {
      password = readPilot01CommanderSecret(LAND_REVIEW_SECRET_PATH);
    } catch {
      throw new Error('PILOT01_LAND_REVIEW_SECRET_UNAVAILABLE');
    }
    if (!password) throw new Error('PILOT01_LAND_REVIEW_SECRET_REQUIRED');
    if (!/^[a-f0-9]{64}$/.test(password)) {
      throw new Error('PILOT01_LAND_REVIEW_SECRET_UNAVAILABLE');
    }
    if (!stdin.isTTY || !stdout.isTTY) {
      throw new Error('PILOT01_INTERACTIVE_TERMINAL_REQUIRED');
    }
    stdout.write(`Land review password: ${password}\n`);
  } finally {
    password = null;
    terminal.close();
  }
}

async function waitForPoReviewCompletion(browser: Browser): Promise<void> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('PILOT01_INTERACTIVE_TERMINAL_REQUIRED');
  }
  const terminal = createInterface({ input: stdin, output: stdout });
  let onDisconnected!: () => void;
  const disconnected = new Promise<never>((_, reject) => {
    onDisconnected = () =>
      reject(new Error('PILOT01_BROWSER_DISCONNECTED_BEFORE_LOGOUT'));
  });
  browser.on('disconnected', onDisconnected);
  try {
    if (!browser.isConnected()) {
      throw new Error('PILOT01_BROWSER_DISCONNECTED_BEFORE_LOGOUT');
    }
    await Promise.race([
      terminal.question(
        'PO visual review is complete; press Enter to verify logout and close the browser: ',
      ),
      disconnected,
    ]);
    if (!browser.isConnected()) {
      throw new Error('PILOT01_BROWSER_DISCONNECTED_BEFORE_LOGOUT');
    }
  } finally {
    browser.off('disconnected', onDisconnected);
    terminal.close();
  }
}

export async function fillPilot01LandOfficerLogin(page: Page): Promise<void> {
  try {
    await page
      .getByRole('heading', {
        name: 'Vào đúng hồ sơ. Làm đúng nhiệm vụ.',
        exact: true,
      })
      .waitFor();
    await page.getByLabel('Email', { exact: true }).fill(LAND_REVIEW_EMAIL);
  } catch {
    throw new Error('PILOT01_LOGIN_FORM_UNVERIFIED');
  }
}

async function verifyBrowserSession(
  context: BrowserContext,
  onIdentityVerified: (identity: Pilot01ReviewIdentity) => void,
): Promise<{
  role: string;
  unitId: string;
  listStatus: number;
  count: number;
  parcelCode: string;
  detailStatus: number;
}> {
  type FailureStage =
    | 'SESSION_FETCH'
    | 'PARTY_FETCH_VALIDATION'
    | 'PARCEL_LIST_FETCH'
    | 'PARCEL_DETAIL_FETCH';
  const request = async (stage: FailureStage, pathname: string) => {
    try {
      const response = await context.request.get(
        new URL(pathname, ORIGIN).href,
      );
      return {
        status: response.status(),
        body: (await response.json().catch(() => null)) as unknown,
      };
    } catch {
      throw new Error(`PILOT01_BROWSER_SESSION_${stage}_FAILED`);
    }
  };

  const session = await request('SESSION_FETCH', '/api/auth/session');
  const sessionBody = isRecord(session.body) ? session.body : null;
  const user =
    sessionBody && isRecord(sessionBody.user) ? sessionBody.user : null;
  const roleList = Array.isArray(user?.roles) ? user.roles : [];
  const role =
    roleList.length === 1 && typeof roleList[0] === 'string'
      ? roleList[0]
      : null;
  const id = typeof user?.id === 'string' && user.id.trim() ? user.id : null;
  const email = typeof user?.email === 'string' ? user.email : null;
  const unitId =
    typeof user?.organizationUnitId === 'string'
      ? user.organizationUnitId
      : null;
  if (
    session.status !== 200 ||
    !user ||
    !id ||
    email !== LAND_REVIEW_EMAIL ||
    role !== 'land_officer' ||
    unitId !== LAND_REVIEW_UNIT_ID
  ) {
    throw new Error('PILOT01_BROWSER_SESSION_UNVERIFIED');
  }
  onIdentityVerified({ id, email, role, unitId });

  const parties = await request(
    'PARTY_FETCH_VALIDATION',
    '/api/land/parties?limit=100',
  );
  const partyBody = isRecord(parties.body) ? parties.body : null;
  const partyItems =
    partyBody && Array.isArray(partyBody.items) ? partyBody.items : null;
  const hasExactKeys = (value: Record<string, unknown>, keys: string[]) =>
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
  const maskedIdentityIsValid = (masked: unknown): boolean => {
    if (masked === null) return true;
    if (typeof masked !== 'string' || masked.length === 0) return false;
    const visibleSuffix = masked.slice(-4);
    const maskPrefix = masked.slice(0, -4);
    if (masked.length <= 4) {
      return [...masked].every((character) => character === '*');
    }
    return (
      [...maskPrefix].every((character) => character === '*') &&
      !visibleSuffix.includes('*')
    );
  };
  const partyKeys = [
    'id',
    'referenceCode',
    'partyType',
    'displayName',
    'identityNumberMasked',
    'status',
    'createdAt',
    'updatedAt',
  ];
  if (
    parties.status !== 200 ||
    !partyBody ||
    !hasExactKeys(partyBody, ['items', 'nextCursor']) ||
    !partyItems ||
    (partyBody.nextCursor !== null &&
      typeof partyBody.nextCursor !== 'string') ||
    !partyItems.every((party) => {
      if (!isRecord(party) || !hasExactKeys(party, partyKeys)) return false;
      return (
        typeof party.id === 'string' &&
        typeof party.referenceCode === 'string' &&
        (party.partyType === 'individual' ||
          party.partyType === 'organization') &&
        typeof party.displayName === 'string' &&
        maskedIdentityIsValid(party.identityNumberMasked) &&
        (party.status === 'active' || party.status === 'archived') &&
        typeof party.createdAt === 'string' &&
        typeof party.updatedAt === 'string'
      );
    })
  ) {
    throw new Error('PILOT01_BROWSER_SESSION_UNVERIFIED');
  }

  const isSyntheticParcelCode = (value: unknown): value is string =>
    typeof value === 'string' &&
    value.length === 20 &&
    /^P01-SYN-[a-f0-9]{12}$/.test(value);
  const syntheticTargets: Array<{ id: unknown; parcelCode: string }> = [];
  let malformedSyntheticMarker = false;
  let cursor: string | null = null;
  let listStatus: number | null = null;
  let count = 0;
  const seenCursors = new Set<string>();
  do {
    const listUrl = new URL('/api/land/parcels', ORIGIN);
    listUrl.searchParams.set('limit', '100');
    if (cursor !== null) listUrl.searchParams.set('cursor', cursor);
    const list = await request(
      'PARCEL_LIST_FETCH',
      `${listUrl.pathname}${listUrl.search}`,
    );
    if (listStatus === null) listStatus = list.status;
    const listBody = isRecord(list.body) ? list.body : null;
    const items =
      listBody && Array.isArray(listBody.items) ? listBody.items : null;
    const nextCursor = listBody?.nextCursor;
    if (
      list.status !== 200 ||
      !listBody ||
      !items ||
      !Object.prototype.hasOwnProperty.call(listBody, 'nextCursor') ||
      (nextCursor !== null && typeof nextCursor !== 'string')
    ) {
      throw new Error('PILOT01_BROWSER_SESSION_UNVERIFIED');
    }

    count += items.length;
    for (const entry of items) {
      if (!isRecord(entry)) continue;
      const code = entry.parcelCode;
      if (typeof code !== 'string' || !code.startsWith('P01-SYN-')) continue;
      if (!isSyntheticParcelCode(code)) {
        malformedSyntheticMarker = true;
        continue;
      }
      syntheticTargets.push({ id: entry.id, parcelCode: code });
    }

    if (nextCursor !== null && seenCursors.has(nextCursor)) {
      throw new Error('PILOT01_BROWSER_SESSION_UNVERIFIED');
    }
    if (nextCursor !== null) seenCursors.add(nextCursor);
    cursor = nextCursor;
  } while (cursor !== null);

  const target = syntheticTargets.length === 1 ? syntheticTargets[0] : null;
  if (
    listStatus !== 200 ||
    malformedSyntheticMarker ||
    !target ||
    typeof target.id !== 'string'
  ) {
    throw new Error('PILOT01_BROWSER_SESSION_UNVERIFIED');
  }

  const detail = await request(
    'PARCEL_DETAIL_FETCH',
    `/api/land/parcels/${encodeURIComponent(target.id)}`,
  );
  const detailBody = isRecord(detail.body) ? detail.body : null;
  const detailParcel =
    detailBody && isRecord(detailBody.parcel) ? detailBody.parcel : null;
  if (
    detail.status !== 200 ||
    detailParcel?.id !== target.id ||
    detailParcel.parcelCode !== target.parcelCode
  ) {
    throw new Error('PILOT01_BROWSER_SESSION_UNVERIFIED');
  }

  return {
    role,
    unitId,
    listStatus,
    count,
    parcelCode: target.parcelCode,
    detailStatus: detail.status,
  };
}

function assertBrowserConnected(browser: Browser): void {
  if (!browser.isConnected()) {
    throw new Error('PILOT01_BROWSER_DISCONNECTED_BEFORE_LOGOUT');
  }
}

async function verifyPilot01SessionLogout(
  browser: Browser,
  context: BrowserContext,
  verifiedIdentity: Pilot01ReviewIdentity,
): Promise<void> {
  const sessionUrl = new URL('/api/auth/session', ORIGIN).href;
  assertBrowserConnected(browser);
  let identityResponse;
  try {
    identityResponse = await context.request.get(sessionUrl);
  } catch {
    assertBrowserConnected(browser);
    throw new Error('PILOT01_SESSION_LOGOUT_FAILED');
  }
  assertBrowserConnected(browser);
  const identityBody = (await identityResponse
    .json()
    .catch(() => null)) as unknown;
  const user =
    isRecord(identityBody) && isRecord(identityBody.user)
      ? identityBody.user
      : null;
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  if (
    identityResponse.status() !== 200 ||
    !user ||
    user.id !== verifiedIdentity.id ||
    user.email !== verifiedIdentity.email ||
    roles.length !== 1 ||
    roles[0] !== verifiedIdentity.role ||
    user.organizationUnitId !== verifiedIdentity.unitId
  ) {
    throw new Error('PILOT01_SESSION_LOGOUT_FAILED');
  }
  assertBrowserConnected(browser);
  let logoutResponse;
  try {
    logoutResponse = await context.request.delete(sessionUrl);
  } catch {
    assertBrowserConnected(browser);
    throw new Error('PILOT01_SESSION_LOGOUT_FAILED');
  }
  assertBrowserConnected(browser);
  const logoutBody = (await logoutResponse.json().catch(() => null)) as unknown;
  if (
    !logoutResponse.ok() ||
    typeof logoutBody !== 'object' ||
    logoutBody === null ||
    Array.isArray(logoutBody) ||
    !('ok' in logoutBody) ||
    logoutBody.ok !== true
  ) {
    throw new Error('PILOT01_SESSION_LOGOUT_FAILED');
  }
  assertBrowserConnected(browser);
  let sessionResponse;
  try {
    sessionResponse = await context.request.get(sessionUrl);
  } catch {
    assertBrowserConnected(browser);
    throw new Error('PILOT01_SESSION_LOGOUT_FAILED');
  }
  assertBrowserConnected(browser);
  const sessionBody = (await sessionResponse
    .json()
    .catch(() => null)) as unknown;
  if (
    !sessionResponse.ok() ||
    typeof sessionBody !== 'object' ||
    sessionBody === null ||
    Array.isArray(sessionBody) ||
    !('user' in sessionBody) ||
    sessionBody.user !== null
  ) {
    throw new Error('PILOT01_SESSION_LOGOUT_FAILED');
  }
}

export async function runPilot01LandOfficerHandoff(): Promise<void> {
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let verifiedIdentity: Pilot01ReviewIdentity | undefined;
  let sessionLogoutVerified = false;
  let stage: HandoffStage = 'WINDOWS_ACCOUNT_CONFIRMATION';
  let failure: Error | undefined;
  try {
    if (process.platform !== 'win32') {
      throw new Error('PILOT01_WINDOWS_REQUIRED');
    }
    if (process.env.DEBUG || process.env.PWDEBUG) {
      throw new Error('PILOT01_DEBUG_OUTPUT_REFUSED');
    }
    await confirmPoContext(currentWindowsIdentity());

    stage = 'BROWSER_LAUNCH';
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    stage = 'LOGIN_NAVIGATION';
    await page.goto(new URL('/login', ORIGIN).href, {
      waitUntil: 'domcontentloaded',
    });
    if (new URL(page.url()).origin !== ORIGIN.origin) {
      throw new Error('PILOT01_LOGIN_ORIGIN_UNVERIFIED');
    }
    await fillPilot01LandOfficerLogin(page);

    stage = 'LOGIN_WAIT';
    console.log(
      'The login page is ready. Enter credentials manually in the browser; this helper does not submit the login request.',
    );
    await confirmAndDisplayLandReviewPassword();
    await page.waitForURL(
      (url) => url.origin === ORIGIN.origin && url.pathname === '/',
      { timeout: 0 },
    );

    stage = 'SESSION_VERIFICATION';
    const result = await verifyBrowserSession(context, (identity) => {
      verifiedIdentity = identity;
    });
    if (!verifiedIdentity) {
      throw new Error('PILOT01_BROWSER_SESSION_UNVERIFIED');
    }
    const reviewIdentity = verifiedIdentity;

    stage = 'LAND_PAGE';
    await page.goto(new URL('/land/parcels', ORIGIN).href, {
      waitUntil: 'domcontentloaded',
    });
    const listUrl = new URL(page.url());
    if (
      listUrl.origin !== ORIGIN.origin ||
      listUrl.pathname !== '/land/parcels'
    ) {
      throw new Error('PILOT01_LAND_LIST_PAGE_UNVERIFIED');
    }

    stage = 'VISUAL_REVIEW';
    await page
      .getByRole('heading', { name: 'Danh sách thửa đất', exact: true })
      .waitFor({ state: 'visible' });
    await page
      .getByRole('link', { name: result.parcelCode, exact: true })
      .waitFor({ state: 'visible' });
    console.log(
      'Land review session verified; browser page is ready for review.',
    );
    await waitForPoReviewCompletion(browser);

    stage = 'LOGOUT';
    await verifyPilot01SessionLogout(browser, context, reviewIdentity);
    sessionLogoutVerified = true;
    console.log('Land review session logout verified.');
  } catch (error) {
    failure = handoffStageError(error, stage, Boolean(verifiedIdentity));
  } finally {
    let browserUsable = false;
    try {
      browserUsable = browser?.isConnected() ?? false;
    } catch {
      // A failed connection check must not trigger a session revoke.
    }
    if (
      verifiedIdentity &&
      browser &&
      browserUsable &&
      context &&
      !sessionLogoutVerified
    ) {
      stage = 'LOGOUT';
      try {
        await verifyPilot01SessionLogout(browser, context, verifiedIdentity);
        sessionLogoutVerified = true;
      } catch {
        const cleanupFailure =
          'PILOT01_LOGOUT_CLEANUP_FAILED_AFTER_VERIFIED_IDENTITY';
        failure = new Error(
          failure ? `${failure.message}_AND_${cleanupFailure}` : cleanupFailure,
        );
      }
    }
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
  if (failure) throw failure;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void runPilot01LandOfficerHandoff().catch((error: unknown) => {
    const message =
      error instanceof Error && /^[A-Z][A-Z0-9_]*$/.test(error.message)
        ? error.message
        : 'PILOT01_LAND_REVIEW_HANDOFF_FAILED';
    console.error(message);
    process.exitCode = 1;
  });
}
