import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import path from 'node:path';

const mocks = vi.hoisted(() => ({
  runPilot01CommanderBootstrap: vi.fn(),
  readPilot01CommanderSecret: vi.fn(),
  storePilot01CommanderSecret: vi.fn(),
  findUniqueLandParcel: vi.fn(),
  disconnectPrisma: vi.fn(),
  fetch: vi.fn(),
  launch: vi.fn(),
  execFileSync: vi.fn(),
  createInterface: vi.fn(),
}));

const commanderPassword = 'a'.repeat(64);
const officerPassword = 'b'.repeat(64);
const unitId = 'pilot01-synthetic-district';
const parcelId = 'synthetic-parcel-id';
const parcelCode = 'P01-SYN-012345abcdef';
const partyList = {
  items: [
    {
      id: 'synthetic-party-1',
      referenceCode: 'P01-PARTY-001',
      partyType: 'individual',
      displayName: 'Synthetic Party',
      identityNumberMasked: '*******0001',
      status: 'active',
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-20T00:00:00.000Z',
    },
    {
      id: 'synthetic-party-2',
      referenceCode: 'P01-PARTY-002',
      partyType: 'organization',
      displayName: 'Synthetic Organization',
      identityNumberMasked: null,
      status: 'active',
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-20T00:00:00.000Z',
    },
    {
      id: 'synthetic-party-3',
      referenceCode: 'P01-PARTY-003',
      partyType: 'individual',
      displayName: 'Short Synthetic Party',
      identityNumberMasked: '****',
      status: 'active',
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-20T00:00:00.000Z',
    },
  ],
  nextCursor: null,
};

function jsonResponse(body: unknown, status = 200, cookie?: string): Response {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (cookie) headers.set('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

function browserApiResponse(body: unknown, status = 200) {
  return {
    ok: () => status >= 200 && status < 300,
    status: () => status,
    json: vi.fn().mockResolvedValue(body),
  };
}

function mockSuccessfulApi(
  options: {
    users?: unknown[];
    assignments?: unknown[];
    parties?: unknown;
    listParcel?: unknown;
    listItems?: unknown[];
    detailParcel?: unknown;
    sessionUser?: unknown;
    sessionRemainsActiveAfterDelete?: boolean;
    logoutResponse?: unknown;
  } = {},
) {
  const requests: Array<{
    url: URL;
    method: string;
    headers: Headers;
    body: unknown;
    callOrder: number;
    redirect: RequestRedirect | undefined;
    credentials: RequestCredentials | undefined;
  }> = [];
  const invalidatedCookies = new Set<string>();
  mocks.fetch.mockImplementation(
    async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://127.0.0.1:3100');
      const method = init?.method ?? 'GET';
      const headers = new Headers(init?.headers);
      const body =
        typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
      requests.push({
        url,
        method,
        headers,
        body,
        callOrder: mocks.fetch.mock.invocationCallOrder.at(-1) ?? 0,
        redirect: init?.redirect,
        credentials: init?.credentials,
      });

      if (url.pathname === '/api/auth/session' && method === 'GET') {
        const cookie = headers.get('cookie');
        const sessionInvalidated =
          cookie !== null &&
          invalidatedCookies.has(cookie) &&
          !options.sessionRemainsActiveAfterDelete;
        return jsonResponse({
          user: sessionInvalidated
            ? null
            : (options.sessionUser ?? {
                id: 'land-review-user',
                email: 'pilot01-land-review@civicos.local',
                name: 'Pilot 01 Land Review',
                roles: ['land_officer'],
                organizationUnitId: unitId,
              }),
        });
      }
      if (url.pathname === '/api/land/parties' && method === 'GET') {
        return jsonResponse(options.parties ?? partyList);
      }
      if (url.pathname === '/api/auth/session' && method === 'POST') {
        const officer = body.email === 'pilot01-land-review@civicos.local';
        return jsonResponse(
          {
            user: officer
              ? {
                  id: 'land-review-user',
                  email: 'pilot01-land-review@civicos.local',
                  name: 'Pilot 01 Land Review',
                  roles: ['land_officer'],
                  organizationUnitId: unitId,
                }
              : {
                  id: 'commander-user',
                  email: 'pilot01-commander@civicos.local',
                  name: 'Pilot 01 Commander',
                  roles: ['commander'],
                  organizationUnitId: unitId,
                },
          },
          200,
          `civicos_session=${officer ? 'officer-cookie' : 'commander-cookie'}; Path=/; HttpOnly`,
        );
      }
      if (url.pathname === '/api/identity/users' && method === 'GET') {
        return jsonResponse({ users: options.users ?? [] });
      }
      if (url.pathname === '/api/identity/users' && method === 'POST') {
        return jsonResponse(
          {
            user: {
              id: 'land-review-user',
              email: 'pilot01-land-review@civicos.local',
              name: 'Pilot 01 Land Review',
              roles: ['land_officer'],
              organizationUnitId: unitId,
            },
          },
          201,
        );
      }
      if (url.pathname === '/api/identity/assignments' && method === 'GET') {
        return jsonResponse({
          assignments: options.assignments ?? [
            {
              id: 'old-review-assignment',
              resourceType: 'LandParcel',
              resourceId: parcelId,
              task: 'land_review',
              assigneeUserId: 'preserved-old-officer',
              organizationId: unitId,
              status: 'active',
            },
          ],
        });
      }
      if (url.pathname === '/api/identity/assignments' && method === 'POST') {
        return jsonResponse(
          {
            assignments: [
              {
                id: 'new-review-assignment',
                resourceType: 'LandParcel',
                resourceId: parcelId,
                task: 'land_review',
                assigneeUserId: 'land-review-user',
                organizationId: unitId,
                status: 'active',
                grantedAt: '2026-10-20T00:00:00.000Z',
              },
            ],
          },
          201,
        );
      }
      if (url.pathname === '/api/land/parcels' && method === 'GET') {
        return jsonResponse({
          items: options.listItems ?? [
            options.listParcel ?? { id: parcelId, parcelCode },
          ],
          nextCursor: null,
        });
      }
      if (
        url.pathname === `/api/land/parcels/${parcelId}` &&
        method === 'GET'
      ) {
        return jsonResponse({
          parcel: options.detailParcel ?? { id: parcelId, parcelCode },
          rights: [],
          encumbrances: [],
        });
      }
      if (url.pathname === '/api/auth/session' && method === 'DELETE') {
        const cookie = headers.get('cookie');
        if (cookie && !options.sessionRemainsActiveAfterDelete) {
          invalidatedCookies.add(cookie);
        }
        return jsonResponse(
          options.logoutResponse === undefined
            ? { ok: true }
            : options.logoutResponse,
        );
      }
      return jsonResponse({ error: 'NOT_FOUND' }, 404);
    },
  );
  return requests;
}

vi.mock('../../scripts/demo/bootstrap-pilot01-commander', () => ({
  PILOT01_COMMANDER_EMAIL: 'pilot01-commander@civicos.local',
  runPilot01CommanderBootstrap: mocks.runPilot01CommanderBootstrap,
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    landParcel: { findUnique: mocks.findUniqueLandParcel },
    $disconnect: mocks.disconnectPrisma,
  },
}));

vi.mock('../../scripts/demo/pilot01-secret-store', () => ({
  readPilot01CommanderSecret: mocks.readPilot01CommanderSecret,
  storePilot01CommanderSecret: mocks.storePilot01CommanderSecret,
}));

vi.mock('@playwright/test', () => ({
  chromium: { launch: mocks.launch },
}));

vi.mock('node:child_process', () => ({
  execFileSync: mocks.execFileSync,
}));

vi.mock('node:readline/promises', () => ({
  createInterface: mocks.createInterface,
}));

import {
  preparePilot01LandReviewAccount,
  runPilot01LandReviewCli,
} from '../../scripts/demo/prepare-pilot01-land-review';
import {
  fillPilot01LandOfficerLogin,
  runPilot01LandOfficerHandoff,
} from '../../scripts/demo/use-pilot01-land-officer';

type HandoffFailurePoint =
  | 'WINDOWS_ACCOUNT_CONFIRMATION'
  | 'BROWSER_LAUNCH'
  | 'LOGIN_NAVIGATION'
  | 'LOGIN_WAIT'
  | 'SESSION_VERIFICATION_BEFORE_IDENTITY'
  | 'SESSION_VERIFICATION_AFTER_IDENTITY'
  | 'LAND_PAGE'
  | 'VISUAL_REVIEW'
  | 'LOGOUT';

type HandoffTestOptions = {
  displayConfirmation?: string;
  loseTtyBeforeDisplayConfirmation?: boolean;
};

function startPilot01Handoff(
  parties?: unknown,
  sessionUser?: unknown,
  parcelResponses: {
    listParcel?: unknown;
    listItems?: unknown[];
    listPages?: Array<{ items: unknown[]; nextCursor: string | null }>;
    detailParcel?: unknown;
  } = {},
  invalidateSessionOnDelete = true,
  failurePoint?: HandoffFailurePoint,
  testOptions: HandoffTestOptions = {},
) {
  const requests: Array<{ url: URL; method: string }> = [];
  let currentUrl = 'about:blank';
  let completePoReview!: () => void;
  let ttyAvailable = true;
  const poReviewCompletion = new Promise<string>((resolve) => {
    completePoReview = () => resolve('');
  });
  let browserConnected = true;
  const browserEvents = new EventEmitter();
  let sessionActive = true;
  let currentSessionUser: unknown = sessionUser ?? {
    id: 'land-review-user',
    email: 'pilot01-land-review@civicos.local',
    roles: ['land_officer'],
    organizationUnitId: unitId,
  };
  let listPageIndex = 0;
  const sessionUsers: unknown[] = [];
  const terminalOutput: string[] = [];
  let passwordDisplayOrder: number | undefined;
  let passwordDisplayTty = false;
  const stdoutWrite = vi.spyOn(process.stdout, 'write');
  stdoutWrite.mockImplementation((chunk) => {
    const text = String(chunk);
    terminalOutput.push(text);
    if (text.startsWith('Land review password: ')) {
      passwordDisplayOrder = stdoutWrite.mock.invocationCallOrder.at(-1);
      passwordDisplayTty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    }
    return true;
  });
  const apiGet = vi.fn().mockImplementation(async (input: string) => {
    if (!browserConnected) throw new Error('synthetic browser disconnected');
    const url = new URL(input);
    requests.push({ url, method: 'GET' });
    if (
      (failurePoint === 'SESSION_VERIFICATION_BEFORE_IDENTITY' &&
        url.pathname === '/api/auth/session') ||
      (failurePoint === 'SESSION_VERIFICATION_AFTER_IDENTITY' &&
        url.pathname === '/api/land/parties')
    ) {
      throw new Error('private browser failure detail');
    }
    if (url.pathname === '/api/auth/session') {
      const user = sessionActive ? currentSessionUser : null;
      sessionUsers.push(user);
      return browserApiResponse({ user });
    }
    if (url.pathname === '/api/land/parties') {
      return browserApiResponse(parties ?? partyList);
    }
    if (url.pathname === '/api/land/parcels') {
      const page = parcelResponses.listPages?.[listPageIndex++];
      if (page) return browserApiResponse(page);
      return browserApiResponse({
        items: parcelResponses.listItems ?? [
          parcelResponses.listParcel ?? { id: parcelId, parcelCode },
        ],
        nextCursor: null,
      });
    }
    if (url.pathname === `/api/land/parcels/${parcelId}`) {
      return browserApiResponse({
        parcel: parcelResponses.detailParcel ?? { id: parcelId, parcelCode },
        rights: [],
        encumbrances: [],
      });
    }
    return browserApiResponse({ error: 'NOT_FOUND' }, 404);
  });
  const apiDelete = vi.fn().mockImplementation(async (input: string) => {
    if (!browserConnected) throw new Error('synthetic browser disconnected');
    const url = new URL(input);
    requests.push({ url, method: 'DELETE' });
    if (failurePoint === 'LOGOUT') {
      failurePoint = undefined;
      return browserApiResponse({ ok: false }, 500);
    }
    if (invalidateSessionOnDelete) sessionActive = false;
    return browserApiResponse({ ok: true });
  });
  const loginHeadingWait = vi.fn();
  const listHeadingWait = vi.fn();
  const parcelLinkWait = vi.fn();
  const emailFill = vi.fn();
  const passwordFill = vi.fn();
  const passwordInput = {
    getAttribute: vi.fn().mockResolvedValue('password'),
    fill: passwordFill,
  };
  const page = {
    url: () => currentUrl,
    goto: vi.fn(async (url: string) => {
      const pathname = new URL(url).pathname;
      if (
        (failurePoint === 'LOGIN_NAVIGATION' && pathname === '/login') ||
        (failurePoint === 'LAND_PAGE' && pathname === '/land/parcels')
      ) {
        throw new Error('private browser failure detail');
      }
      currentUrl = url;
    }),
    getByRole: vi.fn((role: string, options: { name: string }) => {
      if (
        role === 'heading' &&
        options.name === 'Vào đúng hồ sơ. Làm đúng nhiệm vụ.'
      ) {
        return { waitFor: loginHeadingWait };
      }
      if (role === 'heading' && options.name === 'Danh sách thửa đất') {
        return { waitFor: listHeadingWait };
      }
      if (role === 'link' && options.name === parcelCode) {
        return { waitFor: parcelLinkWait };
      }
      throw new Error('Unexpected browser locator');
    }),
    getByLabel: vi.fn((label: string) =>
      label === 'Email' ? { fill: emailFill } : passwordInput,
    ),
    waitForURL: vi.fn(async (matches: (url: URL) => boolean) => {
      if (failurePoint === 'LOGIN_WAIT') {
        throw new Error('private browser failure detail');
      }
      currentUrl = new URL('/', 'http://127.0.0.1:3100').href;
      if (!matches(new URL(currentUrl))) {
        throw new Error('Manual login did not reach home');
      }
    }),
    evaluate: vi.fn(),
  };
  const context = {
    newPage: vi.fn().mockResolvedValue(page),
    request: {
      delete: apiDelete,
      get: apiGet,
    },
    close: vi.fn().mockResolvedValue(undefined),
  };
  const browser = Object.assign(browserEvents, {
    isConnected: vi.fn(() => browserConnected),
    newContext: vi.fn().mockResolvedValue(context),
    close: vi.fn(async () => {
      browserConnected = false;
      browserEvents.emit('disconnected');
    }),
  });
  let terminalCount = 0;
  const reviewQuestion = vi.fn((prompt: string) => {
    if (prompt.includes('type PO')) return Promise.resolve('PO');
    if (prompt.includes('SHOW')) {
      return Promise.resolve(testOptions.displayConfirmation ?? 'SHOW');
    }
    return poReviewCompletion;
  });
  mocks.createInterface.mockImplementation(() => {
    terminalCount += 1;
    return {
      question: reviewQuestion,
      close: vi.fn(() => {
        if (
          terminalCount === 1 &&
          testOptions.loseTtyBeforeDisplayConfirmation
        ) {
          ttyAvailable = false;
        }
      }),
    };
  });
  mocks.launch.mockResolvedValue(browser);
  if (failurePoint === 'WINDOWS_ACCOUNT_CONFIRMATION') {
    mocks.execFileSync.mockImplementationOnce(() => {
      throw new Error('private browser failure detail');
    });
  }
  if (failurePoint === 'BROWSER_LAUNCH') {
    mocks.launch.mockRejectedValueOnce(
      new Error('private browser failure detail'),
    );
  }
  if (failurePoint === 'VISUAL_REVIEW') {
    listHeadingWait.mockImplementationOnce(() => {
      throw new Error('private browser failure detail');
    });
  }
  const streams = [process.stdin, process.stdout];
  const originalTTYDescriptors = streams.map((stream) =>
    Object.getOwnPropertyDescriptor(stream, 'isTTY'),
  );
  streams.forEach((stream) =>
    Object.defineProperty(stream, 'isTTY', {
      configurable: true,
      get: () => ttyAvailable,
    }),
  );

  const handoff = runPilot01LandOfficerHandoff();
  return {
    requests,
    sessionUsers,
    terminalOutput,
    getPasswordDisplayOrder: () => passwordDisplayOrder,
    getPasswordDisplayTty: () => passwordDisplayTty,
    page,
    passwordFill,
    browser,
    context,
    handoff,
    reviewQuestion,
    completePoReview,
    setSessionUser(user: unknown) {
      currentSessionUser = user;
    },
    disconnectBrowser() {
      browserConnected = false;
      browserEvents.emit('disconnected');
      completePoReview();
    },
    restoreTTY() {
      stdoutWrite.mockRestore();
      streams.forEach((stream, index) => {
        const descriptor = originalTTYDescriptors[index];
        if (descriptor) {
          Object.defineProperty(stream, 'isTTY', descriptor);
        } else {
          Reflect.deleteProperty(stream, 'isTTY');
        }
      });
    },
  };
}

describe('NGOÀI BASELINE — CIVICOS PILOT 01 — REVIEW SESSION LOGOUT FAILURE (PO-approved chat request; existing D-52/D-53 provisioning coverage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.findUniqueLandParcel.mockResolvedValue({
      parcelCode,
      organizationId: unitId,
    });
    mocks.disconnectPrisma.mockResolvedValue(undefined);
    mocks.readPilot01CommanderSecret.mockImplementation((filePath?: string) =>
      filePath ? officerPassword : commanderPassword,
    );
    mocks.runPilot01CommanderBootstrap.mockResolvedValue({
      id: 'commander-user',
      email: 'pilot01-commander@civicos.local',
      name: 'Pilot 01 Commander',
      organizationUnitId: unitId,
      created: false,
    });
    mocks.execFileSync.mockReturnValue('po-user');
    mocks.createInterface.mockReturnValue({
      question: vi.fn().mockResolvedValue('PO'),
      close: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the approved runtime env only in the CLI runner before the guard', async () => {
    const loadEnvFile = vi
      .spyOn(process, 'loadEnvFile')
      .mockImplementation(() => {});
    try {
      mockSuccessfulApi();
      await preparePilot01LandReviewAccount();
      expect(loadEnvFile).not.toHaveBeenCalled();

      mocks.fetch.mockClear();
      mocks.runPilot01CommanderBootstrap.mockClear();
      mockSuccessfulApi();

      const result = await runPilot01LandReviewCli();

      expect(result.parcelCode).toBe(parcelCode);
      expect(loadEnvFile).toHaveBeenCalledOnce();
      expect(loadEnvFile).toHaveBeenCalledWith(
        path.join(
          process.cwd(),
          '.scratch',
          'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
          'runtime.env',
        ),
      );
      expect(loadEnvFile.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.runPilot01CommanderBootstrap.mock.invocationCallOrder[0],
      );

      mocks.fetch.mockClear();
      mocks.runPilot01CommanderBootstrap.mockClear();
      loadEnvFile.mockImplementationOnce(() => {
        throw new Error('runtime.env unavailable');
      });
      await expect(runPilot01LandReviewCli()).rejects.toThrow(
        'runtime.env unavailable',
      );
      expect(mocks.runPilot01CommanderBootstrap).not.toHaveBeenCalled();
      expect(mocks.fetch).not.toHaveBeenCalled();
    } finally {
      loadEnvFile.mockRestore();
    }
  });

  it('requires the existing Commander DPAPI secret before guard or API activity', async () => {
    mocks.readPilot01CommanderSecret.mockReturnValue(null);

    await expect(preparePilot01LandReviewAccount()).rejects.toThrow(
      'PILOT01_COMMANDER_SECRET_REQUIRED',
    );

    expect(mocks.runPilot01CommanderBootstrap).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('provisions and verifies the new review account through the real API contracts', async () => {
    const requests = mockSuccessfulApi();

    const result = await preparePilot01LandReviewAccount();

    expect(mocks.runPilot01CommanderBootstrap).toHaveBeenCalledTimes(1);
    expect(
      mocks.runPilot01CommanderBootstrap.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.fetch.mock.invocationCallOrder[0]);
    expect(requests.every(({ redirect }) => redirect === 'error')).toBe(true);
    expect(
      requests.find(
        ({ url, method }) =>
          url.pathname === '/api/identity/users' && method === 'POST',
      )?.body,
    ).toEqual({
      email: 'pilot01-land-review@civicos.local',
      name: 'Pilot 01 Land Review',
      role: 'land_officer',
      password: officerPassword,
    });
    expect(
      requests.find(
        ({ url, method }) =>
          url.pathname === '/api/identity/assignments' && method === 'POST',
      )?.body,
    ).toEqual({
      resourceType: 'LandParcel',
      resourceId: parcelId,
      task: 'land_review',
      assigneeUserIds: ['land-review-user'],
      organizationId: unitId,
    });
    expect(result).toEqual({
      role: 'land_officer',
      organizationUnitId: unitId,
      assignment: 'created',
      listStatus: 200,
      parcelCount: 1,
      parcelCode,
      detailStatus: 200,
    });
    expect(mocks.storePilot01CommanderSecret).not.toHaveBeenCalled();
    expect(
      requests
        .filter(
          ({ url, method }) =>
            url.pathname === '/api/auth/session' && method === 'DELETE',
        )
        .map(({ headers }) => headers.get('cookie')),
    ).toEqual([
      'civicos_session=officer-cookie',
      'civicos_session=commander-cookie',
    ]);
  });

  it('verifies session invalidation using the same cookie as each DELETE', async () => {
    const requests = mockSuccessfulApi();

    await preparePilot01LandReviewAccount();

    const sessionRequests = requests.filter(
      ({ url, method }) =>
        url.pathname === '/api/auth/session' &&
        (method === 'DELETE' || method === 'GET'),
    );
    const deletedCookies = sessionRequests
      .filter(({ method }) => method === 'DELETE')
      .map(({ headers }) => headers.get('cookie'));
    const checkedCookies = sessionRequests
      .filter(({ method }) => method === 'GET')
      .map(({ headers }) => headers.get('cookie'));

    expect(deletedCookies).toEqual([
      'civicos_session=officer-cookie',
      'civicos_session=commander-cookie',
    ]);
    expect(checkedCookies).toEqual(deletedCookies);
  });

  it('fails closed when DELETE succeeds but GET still shows an active session', async () => {
    const requests = mockSuccessfulApi({
      sessionRemainsActiveAfterDelete: true,
    });

    await expect(preparePilot01LandReviewAccount()).rejects.toThrow(
      'PILOT01_SESSION_LOGOUT_FAILED',
    );
    expect(
      requests
        .filter(
          ({ url, method }) =>
            url.pathname === '/api/auth/session' && method === 'GET',
        )
        .map(({ headers }) => headers.get('cookie')),
    ).toEqual(
      requests
        .filter(
          ({ url, method }) =>
            url.pathname === '/api/auth/session' && method === 'DELETE',
        )
        .map(({ headers }) => headers.get('cookie')),
    );
  });

  it('fails closed when a successful DELETE does not return ok true', async () => {
    mockSuccessfulApi({ logoutResponse: { ok: false } });

    await expect(preparePilot01LandReviewAccount()).rejects.toThrow(
      'PILOT01_SESSION_LOGOUT_FAILED',
    );
  });

  it('rejects list and detail parcel codes that differ from the verified Prisma parcel', async () => {
    const otherSyntheticCode = 'P01-SYN-fedcba654321';
    mockSuccessfulApi({
      listParcel: { id: parcelId, parcelCode: otherSyntheticCode },
      detailParcel: { id: parcelId, parcelCode: otherSyntheticCode },
    });

    await expect(preparePilot01LandReviewAccount()).rejects.toThrow(
      'PILOT01_SYNTHETIC_PARCEL_UNVERIFIED',
    );
  });

  it('rejects a detail parcel code that differs from the verified Prisma parcel', async () => {
    mockSuccessfulApi({
      detailParcel: { id: parcelId, parcelCode: 'P01-SYN-fedcba654321' },
    });

    await expect(preparePilot01LandReviewAccount()).rejects.toThrow(
      'PILOT01_LAND_DETAIL_RESPONSE_INVALID',
    );
  });

  it('rejects a trailing newline in the authenticated API parcel code', async () => {
    const newlineParcel = { id: parcelId, parcelCode: `${parcelCode}\n` };
    mockSuccessfulApi({
      listParcel: newlineParcel,
      detailParcel: newlineParcel,
    });

    await expect(preparePilot01LandReviewAccount()).rejects.toThrow(
      'PILOT01_SYNTHETIC_PARCEL_UNVERIFIED',
    );
  });

  it.each([
    [
      'list parcel ID',
      { id: 'different-parcel-id', parcelCode },
      undefined,
      'PILOT01_SYNTHETIC_PARCEL_UNVERIFIED',
    ],
    [
      'detail parcel ID',
      undefined,
      { id: 'different-parcel-id', parcelCode },
      'PILOT01_LAND_DETAIL_RESPONSE_INVALID',
    ],
  ])(
    'rejects an authenticated API %s mismatch',
    async (_label, listParcel, detailParcel, error) => {
      mockSuccessfulApi({ listParcel, detailParcel });

      await expect(preparePilot01LandReviewAccount()).rejects.toThrow(error);
    },
  );

  it('refuses an ambiguous synthetic parcel before provisioning a review account', async () => {
    const requests = mockSuccessfulApi({
      assignments: [
        {
          resourceType: 'LandParcel',
          resourceId: parcelId,
          task: 'land_review',
          assigneeUserId: 'preserved-old-officer',
          organizationId: unitId,
          status: 'active',
        },
        {
          resourceType: 'LandParcel',
          resourceId: 'second-parcel-id',
          task: 'land_review',
          assigneeUserId: 'another-officer',
          organizationId: unitId,
          status: 'active',
        },
      ],
    });

    await expect(preparePilot01LandReviewAccount()).rejects.toThrow(
      'PILOT01_SYNTHETIC_PARCEL_UNVERIFIED',
    );

    expect(
      requests.some(
        ({ url, method }) =>
          url.pathname === '/api/identity/users' && method === 'POST',
      ),
    ).toBe(false);
    expect(
      requests.some(
        ({ url, method }) =>
          url.pathname === '/api/identity/assignments' && method === 'POST',
      ),
    ).toBe(false);
    expect(
      requests.filter(
        ({ url, method }) =>
          url.pathname === '/api/auth/session' && method === 'DELETE',
      ),
    ).toHaveLength(1);
  });

  it.each([
    ['a non-synthetic parcel marker', 'PILOT01-PARCEL-001', unitId],
    ['a malformed synthetic marker', 'P01-SYN-1234', unitId],
    ['a synthetic marker with a trailing newline', `${parcelCode}\n`, unitId],
    ['a different organization', parcelCode, 'other-synthetic-district'],
    ['a missing parcel', null, null],
  ])(
    'refuses %s before D-52 user or Assignment POST',
    async (_reason, unsafeParcelCode, organizationId) => {
      mocks.findUniqueLandParcel.mockResolvedValue(
        unsafeParcelCode === null
          ? null
          : { parcelCode: unsafeParcelCode, organizationId },
      );
      const requests = mockSuccessfulApi();

      await expect(preparePilot01LandReviewAccount()).rejects.toThrow(
        'PILOT01_SYNTHETIC_PARCEL_UNVERIFIED',
      );

      expect(mocks.findUniqueLandParcel).toHaveBeenCalledWith({
        where: { id: parcelId },
        select: { parcelCode: true, organizationId: true },
      });
      expect(
        requests.filter(
          ({ method, url }) =>
            method === 'POST' &&
            ['/api/identity/users', '/api/identity/assignments'].includes(
              url.pathname,
            ),
        ),
      ).toEqual([]);
    },
  );

  it('stores a CSPRNG officer credential under the work-item scratch path before D-52 provisioning', async () => {
    const requests = mockSuccessfulApi();
    mocks.readPilot01CommanderSecret.mockImplementation((filePath?: string) =>
      filePath ? null : commanderPassword,
    );

    await preparePilot01LandReviewAccount();

    const [storedSecret, storedPath] =
      mocks.storePilot01CommanderSecret.mock.calls[0];
    expect(/^[a-f0-9]{64}$/.test(storedSecret)).toBe(true);
    expect(storedPath).toContain(
      path.join(
        '.scratch',
        'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
        'land-review-officer.dpapi',
      ),
    );
    expect(
      mocks.storePilot01CommanderSecret.mock.invocationCallOrder[0],
    ).toBeLessThan(
      requests.find(
        ({ url, method }) =>
          url.pathname === '/api/identity/users' && method === 'POST',
      )?.callOrder ?? 0,
    );
    const createUserBody = requests.find(
      ({ url, method }) =>
        url.pathname === '/api/identity/users' && method === 'POST',
    )?.body;
    expect(
      typeof createUserBody === 'object' &&
        createUserBody !== null &&
        (createUserBody as Record<string, unknown>).password === storedSecret,
    ).toBe(true);
  });

  it('reuses the exact existing account and Assignment without duplicate POSTs', async () => {
    const requests = mockSuccessfulApi({
      users: [
        {
          id: 'land-review-user',
          email: 'pilot01-land-review@civicos.local',
          name: 'Pilot 01 Land Review',
          roles: ['land_officer'],
          organizationUnitId: unitId,
        },
      ],
      assignments: [
        {
          id: 'preserved-old-assignment',
          resourceType: 'LandParcel',
          resourceId: parcelId,
          task: 'land_review',
          assigneeUserId: 'preserved-old-officer',
          organizationId: unitId,
          status: 'active',
        },
        {
          id: 'existing-review-assignment',
          resourceType: 'LandParcel',
          resourceId: parcelId,
          task: 'land_review',
          assigneeUserId: 'land-review-user',
          organizationId: unitId,
          status: 'active',
        },
      ],
    });

    const result = await preparePilot01LandReviewAccount();

    expect(result.assignment).toBe('reused');
    expect(
      requests.some(
        ({ url, method }) =>
          url.pathname === '/api/identity/users' && method === 'POST',
      ),
    ).toBe(false);
    expect(
      requests.some(
        ({ url, method }) =>
          url.pathname === '/api/identity/assignments' && method === 'POST',
      ),
    ).toBe(false);
    expect(
      requests.some(
        ({ url, method }) =>
          url.pathname === '/api/identity/assignments' && method === 'DELETE',
      ),
    ).toBe(false);
    expect(mocks.storePilot01CommanderSecret).not.toHaveBeenCalled();
  });

  it('fails closed when the account exists but its officer DPAPI secret is missing', async () => {
    const requests = mockSuccessfulApi({
      users: [
        {
          id: 'land-review-user',
          email: 'pilot01-land-review@civicos.local',
          name: 'Pilot 01 Land Review',
          roles: ['land_officer'],
          organizationUnitId: unitId,
        },
      ],
    });
    mocks.readPilot01CommanderSecret.mockImplementation((filePath?: string) =>
      filePath ? null : commanderPassword,
    );

    await expect(preparePilot01LandReviewAccount()).rejects.toThrow(
      'PILOT01_LAND_REVIEW_SECRET_REQUIRED',
    );

    expect(
      requests.some(
        ({ url, method }) =>
          url.pathname === '/api/identity/users' && method === 'POST',
      ),
    ).toBe(false);
    expect(
      requests.some(
        ({ url, method }) =>
          url.pathname === '/api/identity/assignments' && method === 'POST',
      ),
    ).toBe(false);
    expect(
      requests.filter(
        ({ url, method }) =>
          url.pathname === '/api/auth/session' && method === 'DELETE',
      ),
    ).toHaveLength(1);
  });

  it('prefills only the review email and leaves password entry to the PO', async () => {
    const emailFill = vi.fn();
    const passwordFill = vi.fn();
    const waitForHeading = vi.fn();
    const passwordInput = {
      fill: passwordFill,
    };
    const page = {
      getByRole: vi.fn(() => ({ waitFor: waitForHeading })),
      getByLabel: vi.fn((label: string) =>
        label === 'Email' ? { fill: emailFill } : passwordInput,
      ),
    };

    await fillPilot01LandOfficerLogin(page as never);

    expect(waitForHeading).toHaveBeenCalledOnce();
    expect(emailFill).toHaveBeenCalledWith('pilot01-land-review@civicos.local');
    expect(page.getByLabel).toHaveBeenCalledOnce();
    expect(page.getByLabel).not.toHaveBeenCalledWith('Mật khẩu', {
      exact: true,
    });
    expect(passwordFill).not.toHaveBeenCalled();
    expect(page.getByRole).toHaveBeenCalledOnce();
  });

  it.each([
    [
      'explicit confirmation',
      { displayConfirmation: 'NO' },
      'PILOT01_LAND_REVIEW_SECRET_DISPLAY_NOT_CONFIRMED_AT_LOGIN_WAIT_BEFORE_VERIFIED_IDENTITY',
    ],
    [
      'TTY availability',
      { loseTtyBeforeDisplayConfirmation: true },
      'PILOT01_INTERACTIVE_TERMINAL_REQUIRED_AT_LOGIN_WAIT_BEFORE_VERIFIED_IDENTITY',
    ],
  ] as const)(
    'does not read the DPAPI secret without %s',
    async (_label, options, expectedCode) => {
      const harness = startPilot01Handoff(
        undefined,
        undefined,
        {},
        true,
        undefined,
        options,
      );
      try {
        harness.completePoReview();
        const failure = await harness.handoff.then(
          () => new Error('Expected the handoff to fail'),
          (error: unknown) => error as Error,
        );

        expect(failure.message).toBe(expectedCode);
        expect(mocks.readPilot01CommanderSecret).not.toHaveBeenCalled();
        expect(failure.message.includes(officerPassword)).toBe(false);
        expect(
          harness.terminalOutput.some((chunk) =>
            chunk.includes(officerPassword),
          ),
        ).toBe(false);
      } finally {
        harness.completePoReview();
        await harness.handoff.catch(() => undefined);
        harness.restoreTTY();
      }
    },
  );

  it('displays the confirmed password once through TTY without filling or adding API calls', async () => {
    let ttyAtRead = false;
    mocks.readPilot01CommanderSecret.mockImplementationOnce(
      (filePath?: string) => {
        ttyAtRead = Boolean(process.stdin.isTTY && process.stdout.isTTY);
        return filePath ? officerPassword : commanderPassword;
      },
    );
    const log = vi.spyOn(console, 'log');
    const harness = startPilot01Handoff();
    try {
      await vi.waitFor(() =>
        expect(harness.reviewQuestion).toHaveBeenCalledTimes(3),
      );
      expect(harness.browser.newContext).toHaveBeenCalledWith({
        viewport: null,
      });

      const displayCount = harness.terminalOutput.reduce(
        (count, chunk) => count + chunk.split(officerPassword).length - 1,
        0,
      );
      expect(displayCount === 1).toBe(true);
      expect(
        log.mock.calls
          .flat()
          .some((value) => String(value).includes(officerPassword)),
      ).toBe(false);
      expect(mocks.readPilot01CommanderSecret).toHaveBeenCalledOnce();
      expect(mocks.readPilot01CommanderSecret).toHaveBeenCalledWith(
        path.join(
          process.cwd(),
          '.scratch',
          'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
          'land-review-officer.dpapi',
        ),
      );
      expect(ttyAtRead).toBe(true);
      expect(harness.getPasswordDisplayTty()).toBe(true);
      expect(harness.reviewQuestion).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SHOW'),
      );
      expect(harness.page.goto.mock.invocationCallOrder[0]).toBeLessThan(
        harness.reviewQuestion.mock.invocationCallOrder[1],
      );
      expect(harness.page.getByLabel.mock.invocationCallOrder[0]).toBeLessThan(
        harness.reviewQuestion.mock.invocationCallOrder[1],
      );
      expect(harness.reviewQuestion.mock.invocationCallOrder[1]).toBeLessThan(
        mocks.readPilot01CommanderSecret.mock.invocationCallOrder[0],
      );
      expect(harness.passwordFill).not.toHaveBeenCalled();
      expect(harness.page.getByLabel).not.toHaveBeenCalledWith('Mật khẩu', {
        exact: true,
      });
      const displayOrder = harness.getPasswordDisplayOrder();
      expect(displayOrder).toBeDefined();
      expect(displayOrder ?? 0).toBeLessThan(
        harness.page.waitForURL.mock.invocationCallOrder[0],
      );
      expect(
        harness.requests.map(
          ({ method, url }) => `${method} ${url.pathname}${url.search}`,
        ),
      ).toEqual([
        'GET /api/auth/session',
        'GET /api/land/parties?limit=100',
        'GET /api/land/parcels?limit=100',
        `GET /api/land/parcels/${parcelId}`,
      ]);
      expect(harness.context.request.delete).not.toHaveBeenCalled();

      harness.completePoReview();
      await harness.handoff;
    } finally {
      harness.completePoReview();
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
      log.mockRestore();
    }
  });

  it.each([
    [
      'missing',
      'PILOT01_LAND_REVIEW_SECRET_REQUIRED_AT_LOGIN_WAIT_BEFORE_VERIFIED_IDENTITY',
    ],
    [
      'unreadable',
      'PILOT01_LAND_REVIEW_SECRET_UNAVAILABLE_AT_LOGIN_WAIT_BEFORE_VERIFIED_IDENTITY',
    ],
  ] as const)(
    'returns a safe stage error for a %s officer secret',
    async (failureKind, expectedCode) => {
      if (failureKind === 'missing') {
        mocks.readPilot01CommanderSecret.mockReturnValueOnce(null);
      } else {
        mocks.readPilot01CommanderSecret.mockImplementationOnce(() => {
          throw new Error(`private DPAPI failure ${officerPassword}`);
        });
      }
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
      const harness = startPilot01Handoff();
      try {
        harness.completePoReview();
        const failure = await harness.handoff.then(
          () => new Error('Expected the handoff to fail'),
          (error: unknown) => error as Error,
        );

        expect(failure.message).toBe(expectedCode);
        expect(failure.message.includes(officerPassword)).toBe(false);
        expect(failure.message.includes('private DPAPI failure')).toBe(false);
        expect(
          [...log.mock.calls.flat(), ...errorLog.mock.calls.flat()].some(
            (value) => String(value).includes(officerPassword),
          ),
        ).toBe(false);
        expect(
          harness.terminalOutput.some((chunk) =>
            chunk.includes(officerPassword),
          ),
        ).toBe(false);
        expect(harness.context.request.get).not.toHaveBeenCalled();
        expect(harness.context.request.delete).not.toHaveBeenCalled();
        expect(mocks.runPilot01CommanderBootstrap).not.toHaveBeenCalled();
        expect(mocks.storePilot01CommanderSecret).not.toHaveBeenCalled();
      } finally {
        harness.completePoReview();
        await harness.handoff.catch(() => undefined);
        harness.restoreTTY();
        log.mockRestore();
        errorLog.mockRestore();
      }
    },
  );

  it.each([
    [
      'empty user ID',
      {
        id: ' ',
        email: 'pilot01-land-review@civicos.local',
        name: 'Pilot 01 Land Review',
        roles: ['land_officer'],
        organizationUnitId: unitId,
      },
    ],
    [
      'email',
      {
        id: 'land-review-user',
        email: 'someone-else@civicos.local',
        name: 'Pilot 01 Land Review',
        roles: ['land_officer'],
        organizationUnitId: unitId,
      },
    ],
    [
      'email case',
      {
        id: 'land-review-user',
        email: 'Pilot01-Land-Review@civicos.local',
        name: 'Pilot 01 Land Review',
        roles: ['land_officer'],
        organizationUnitId: unitId,
      },
    ],
    [
      'role',
      {
        id: 'land-review-user',
        email: 'pilot01-land-review@civicos.local',
        name: 'Pilot 01 Land Review',
        roles: ['commander'],
        organizationUnitId: unitId,
      },
    ],
    [
      'unit',
      {
        id: 'land-review-user',
        email: 'pilot01-land-review@civicos.local',
        name: 'Pilot 01 Land Review',
        roles: ['land_officer'],
        organizationUnitId: 'other-synthetic-district',
      },
    ],
  ])(
    'rejects a wrong session %s before any land API reads',
    async (_label, sessionUser) => {
      const harness = startPilot01Handoff(undefined, sessionUser);
      try {
        harness.completePoReview();
        await expect(harness.handoff).rejects.toThrow(
          'PILOT01_BROWSER_SESSION_UNVERIFIED',
        );
        expect(
          harness.requests.map(
            ({ method, url }) => `${method} ${url.pathname}${url.search}`,
          ),
        ).toEqual(['GET /api/auth/session']);
        expect(harness.context.request.delete).not.toHaveBeenCalled();
        expect(
          harness.requests.filter(({ url }) =>
            url.pathname.startsWith('/api/land/'),
          ),
        ).toEqual([]);
      } finally {
        await harness.handoff.catch(() => undefined);
        harness.restoreTTY();
      }
    },
  );

  it.each([
    ['user ID', { id: 'different-review-user' }],
    ['email', { email: 'different-review@civicos.local' }],
    ['role', { roles: ['commander'] }],
    ['unit', { organizationUnitId: 'different-review-unit' }],
  ])(
    'does not DELETE if the review %s changes before cleanup',
    async (_label, changedIdentity) => {
      const harness = startPilot01Handoff();
      try {
        await vi.waitFor(() =>
          expect(harness.reviewQuestion).toHaveBeenCalledTimes(3),
        );
        harness.setSessionUser({
          id: 'land-review-user',
          email: 'pilot01-land-review@civicos.local',
          roles: ['land_officer'],
          organizationUnitId: unitId,
          ...changedIdentity,
        });
        harness.completePoReview();

        await expect(harness.handoff).rejects.toThrow(
          'PILOT01_SESSION_LOGOUT_FAILED',
        );
        expect(harness.context.request.delete).not.toHaveBeenCalled();
        expect(
          harness.requests.filter(
            ({ url, method }) =>
              url.pathname === '/api/auth/session' && method === 'DELETE',
          ),
        ).toEqual([]);
      } finally {
        harness.completePoReview();
        await harness.handoff.catch(() => undefined);
        harness.restoreTTY();
      }
    },
  );

  it('pilot01-review-session-logout-failure-20261020 permits DELETE only after identity recheck and verifies null session', async () => {
    const harness = startPilot01Handoff();
    try {
      await vi.waitFor(() =>
        expect(harness.reviewQuestion).toHaveBeenCalledTimes(3),
      );

      expect(harness.browser.newContext).toHaveBeenCalledOnce();
      expect(harness.context.newPage).toHaveBeenCalledOnce();
      expect(
        harness.page.goto.mock.calls.map(([url]) => new URL(url).pathname),
      ).toEqual(['/login', '/land/parcels']);
      expect(harness.page.getByRole).toHaveBeenCalledWith('link', {
        name: parcelCode,
        exact: true,
      });
      expect(harness.page.url()).toBe('http://127.0.0.1:3100/land/parcels');
      expect(harness.page.evaluate).not.toHaveBeenCalled();
      expect(harness.browser.isConnected()).toBe(true);
      expect(harness.reviewQuestion).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('press Enter'),
      );
      expect(harness.context.request.delete).not.toHaveBeenCalled();
      expect(harness.context.close).not.toHaveBeenCalled();
      expect(harness.browser.close).not.toHaveBeenCalled();

      expect(
        harness.requests.map(
          ({ method, url }) => `${method} ${url.pathname}${url.search}`,
        ),
      ).toEqual([
        'GET /api/auth/session',
        'GET /api/land/parties?limit=100',
        'GET /api/land/parcels?limit=100',
        `GET /api/land/parcels/${parcelId}`,
      ]);

      const sessionIndex = harness.requests.findIndex(
        ({ url, method }) =>
          url.pathname === '/api/auth/session' && method === 'GET',
      );
      const partyIndex = harness.requests.findIndex(
        ({ url }) => url.pathname === '/api/land/parties',
      );
      const partyRequest = harness.requests[partyIndex];
      expect(partyIndex).toBeGreaterThan(sessionIndex);
      expect(partyRequest?.method).toBe('GET');
      expect(partyRequest?.url.search).toBe('?limit=100');

      harness.completePoReview();
      await harness.handoff;
      expect(harness.context.request.delete).toHaveBeenCalledOnce();
      expect(harness.context.request.delete).toHaveBeenCalledWith(
        'http://127.0.0.1:3100/api/auth/session',
      );
      expect(harness.context.request.get).toHaveBeenCalledWith(
        'http://127.0.0.1:3100/api/auth/session',
      );
      expect(
        harness.context.request.delete.mock.invocationCallOrder[0],
      ).toBeLessThan(
        harness.context.request.get.mock.invocationCallOrder.at(-1) ?? 0,
      );
      expect(
        harness.context.request.get.mock.invocationCallOrder.at(-1) ?? 0,
      ).toBeLessThan(harness.context.close.mock.invocationCallOrder[0]);
      expect(
        harness.context.request.get.mock.invocationCallOrder.at(-1) ?? 0,
      ).toBeLessThan(harness.browser.close.mock.invocationCallOrder[0]);
      expect(
        harness.requests
          .slice(-2)
          .map(({ method, url }) => `${method} ${url.pathname}${url.search}`),
      ).toEqual(['DELETE /api/auth/session', 'GET /api/auth/session']);
      expect(
        harness.requests
          .filter(({ url }) => url.pathname === '/api/auth/session')
          .map(({ method, url }) => `${method} ${url.pathname}${url.search}`),
      ).toEqual([
        'GET /api/auth/session',
        'GET /api/auth/session',
        'DELETE /api/auth/session',
        'GET /api/auth/session',
      ]);
      expect(harness.sessionUsers.at(-1)).toBeNull();
      expect(harness.context.close).toHaveBeenCalledOnce();
      expect(harness.browser.close).toHaveBeenCalledOnce();
    } finally {
      harness.completePoReview();
      try {
        await harness.handoff;
      } finally {
        harness.restoreTTY();
      }
    }
  });

  it('pilot01-review-session-logout-failure-20261020 fails closed on browser disconnect before PO completion', async () => {
    const harness = startPilot01Handoff();
    try {
      await vi.waitFor(() =>
        expect(harness.reviewQuestion).toHaveBeenCalledTimes(3),
      );
      const deleteCalls = harness.context.request.delete.mock.calls.length;
      const getCalls = harness.context.request.get.mock.calls.length;
      const requestCount = harness.requests.length;

      harness.disconnectBrowser();
      await expect(harness.handoff).rejects.toThrow(
        'PILOT01_BROWSER_DISCONNECTED_BEFORE_LOGOUT',
      );

      expect(harness.context.request.delete).toHaveBeenCalledTimes(deleteCalls);
      expect(harness.context.request.get).toHaveBeenCalledTimes(getCalls);
      expect(harness.requests).toHaveLength(requestCount);
      expect(harness.context.close).toHaveBeenCalledOnce();
      expect(harness.browser.close).toHaveBeenCalledOnce();
    } finally {
      harness.completePoReview();
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
    }
  });

  it.each([
    [
      'WINDOWS_ACCOUNT_CONFIRMATION',
      'PILOT01_WINDOWS_IDENTITY_UNAVAILABLE_AT_WINDOWS_ACCOUNT_CONFIRMATION_BEFORE_VERIFIED_IDENTITY',
    ],
    [
      'BROWSER_LAUNCH',
      'PILOT01_BROWSER_LAUNCH_BEFORE_VERIFIED_IDENTITY_FAILED',
    ],
    [
      'LOGIN_NAVIGATION',
      'PILOT01_LOGIN_NAVIGATION_BEFORE_VERIFIED_IDENTITY_FAILED',
    ],
    ['LOGIN_WAIT', 'PILOT01_LOGIN_WAIT_BEFORE_VERIFIED_IDENTITY_FAILED'],
    [
      'SESSION_VERIFICATION_BEFORE_IDENTITY',
      'PILOT01_BROWSER_SESSION_SESSION_FETCH_FAILED_AT_SESSION_VERIFICATION_BEFORE_VERIFIED_IDENTITY',
    ],
    [
      'SESSION_VERIFICATION_AFTER_IDENTITY',
      'PILOT01_BROWSER_SESSION_PARTY_FETCH_VALIDATION_FAILED_AT_SESSION_VERIFICATION_AFTER_VERIFIED_IDENTITY',
    ],
    ['LAND_PAGE', 'PILOT01_LAND_PAGE_AFTER_VERIFIED_IDENTITY_FAILED'],
    ['VISUAL_REVIEW', 'PILOT01_VISUAL_REVIEW_AFTER_VERIFIED_IDENTITY_FAILED'],
    [
      'LOGOUT',
      'PILOT01_SESSION_LOGOUT_FAILED_AT_LOGOUT_AFTER_VERIFIED_IDENTITY',
    ],
  ] as const)(
    'reports %s stage and verification phase without raw exception text',
    async (failurePoint, expectedCode) => {
      const harness = startPilot01Handoff(
        undefined,
        undefined,
        {},
        true,
        failurePoint,
      );
      try {
        harness.completePoReview();
        const failure = await harness.handoff.then(
          () => new Error('Expected the handoff to fail'),
          (error: unknown) => error as Error,
        );

        expect(failure.message).toBe(expectedCode);
        expect(failure.message).not.toContain('private browser failure detail');
      } finally {
        harness.completePoReview();
        await harness.handoff.catch(() => undefined);
        harness.restoreTTY();
      }
    },
  );

  it.each([
    ['session', '/api/auth/session', 'SESSION_FETCH'],
    ['parties', '/api/land/parties', 'PARTY_FETCH_VALIDATION'],
    ['parcel list', '/api/land/parcels', 'PARCEL_LIST_FETCH'],
    ['parcel detail', `/api/land/parcels/${parcelId}`, 'PARCEL_DETAIL_FETCH'],
  ])(
    'reports only the failed %s stage when its fetch rejects and cleans up',
    async (_label, failedPath, stage) => {
      const harness = startPilot01Handoff();
      const originalGet = harness.context.request.get.getMockImplementation()!;
      let failureThrown = false;
      harness.context.request.get.mockImplementation(async (input) => {
        const response = await originalGet(input);
        if (!failureThrown && new URL(input).pathname === failedPath) {
          failureThrown = true;
          throw new Error('private fetch failure detail');
        }
        return response;
      });
      try {
        const error = await harness.handoff.then(
          () => new Error('Expected the handoff to fail'),
          (failure: unknown) => failure as Error,
        );

        const phase = failedPath === '/api/auth/session' ? 'BEFORE' : 'AFTER';
        expect(error.message).toBe(
          `PILOT01_BROWSER_SESSION_${stage}_FAILED_AT_SESSION_VERIFICATION_${phase}_VERIFIED_IDENTITY`,
        );
        expect(error.message).not.toContain('private fetch failure detail');
        if (failedPath === '/api/auth/session') {
          expect(harness.context.request.delete).not.toHaveBeenCalled();
          expect(harness.context.request.get).toHaveBeenCalledOnce();
        } else {
          expect(harness.context.request.delete).toHaveBeenCalledWith(
            'http://127.0.0.1:3100/api/auth/session',
          );
          expect(harness.context.request.get).toHaveBeenCalledWith(
            'http://127.0.0.1:3100/api/auth/session',
          );
          expect(
            harness.context.request.delete.mock.invocationCallOrder[0],
          ).toBeLessThan(
            harness.context.request.get.mock.invocationCallOrder.at(-1) ?? 0,
          );
          expect(
            harness.context.request.get.mock.invocationCallOrder.at(-1) ?? 0,
          ).toBeLessThan(harness.context.close.mock.invocationCallOrder[0]);
        }
        expect(harness.context.close).toHaveBeenCalledOnce();
        expect(harness.browser.close).toHaveBeenCalledOnce();
      } finally {
        harness.completePoReview();
        await harness.handoff.catch(() => undefined);
        harness.restoreTTY();
      }
    },
  );

  it('pilot01-review-session-logout-failure-20261020 does not clean up when initial identity verification fails', async () => {
    const harness = startPilot01Handoff();
    const originalGet = harness.context.request.get.getMockImplementation()!;
    harness.context.request.get.mockImplementationOnce(async (input) => {
      await originalGet(input);
      throw new Error('private session verification detail');
    });
    try {
      await expect(harness.handoff).rejects.toThrow(
        'PILOT01_BROWSER_SESSION_SESSION_FETCH_FAILED',
      );

      expect(harness.page.waitForURL).toHaveBeenCalledOnce();
      expect(harness.page.evaluate).not.toHaveBeenCalled();
      expect(harness.context.request.delete).not.toHaveBeenCalled();
      expect(harness.context.request.get).toHaveBeenCalledOnce();
      expect(harness.context.close).toHaveBeenCalledOnce();
      expect(harness.browser.close).toHaveBeenCalledOnce();
    } finally {
      harness.completePoReview();
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
    }
  });

  it('fails closed when post-review logout is not confirmed', async () => {
    const harness = startPilot01Handoff();
    harness.context.request.delete.mockResolvedValueOnce({
      ok: () => false,
      json: vi.fn().mockResolvedValue({ ok: false }),
    });
    try {
      await vi.waitFor(() =>
        expect(harness.reviewQuestion).toHaveBeenCalledTimes(3),
      );
      expect(harness.context.request.delete).not.toHaveBeenCalled();
      harness.completePoReview();
      await expect(harness.handoff).rejects.toThrow(
        'PILOT01_SESSION_LOGOUT_FAILED',
      );
      expect(harness.context.request.delete).toHaveBeenCalledTimes(2);
      expect(harness.context.request.get).toHaveBeenCalledTimes(7);
      expect(
        harness.context.request.get.mock.invocationCallOrder[4],
      ).toBeLessThan(
        harness.context.request.delete.mock.invocationCallOrder[0],
      );
      expect(
        harness.context.request.delete.mock.invocationCallOrder[0],
      ).toBeLessThan(harness.context.request.get.mock.invocationCallOrder[5]);
      expect(
        harness.context.request.get.mock.invocationCallOrder[5],
      ).toBeLessThan(
        harness.context.request.delete.mock.invocationCallOrder[1],
      );
      expect(
        harness.context.request.delete.mock.invocationCallOrder[1],
      ).toBeLessThan(
        harness.context.request.get.mock.invocationCallOrder.at(-1) ?? 0,
      );
      expect(
        harness.context.request.get.mock.invocationCallOrder.at(-1) ?? 0,
      ).toBeLessThan(harness.context.close.mock.invocationCallOrder[0]);
      expect(harness.context.close).toHaveBeenCalledOnce();
      expect(harness.browser.close).toHaveBeenCalledOnce();
    } finally {
      harness.completePoReview();
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
    }
  });

  it('fails closed when DELETE succeeds but the session remains active', async () => {
    const harness = startPilot01Handoff(undefined, undefined, {}, false);
    try {
      await vi.waitFor(() =>
        expect(harness.reviewQuestion).toHaveBeenCalledTimes(3),
      );
      harness.completePoReview();
      await expect(harness.handoff).rejects.toThrow(
        'PILOT01_SESSION_LOGOUT_FAILED',
      );
      expect(harness.context.request.delete).toHaveBeenCalledTimes(2);
      expect(harness.context.request.get).toHaveBeenCalledTimes(8);
      expect(
        harness.requests
          .filter(({ url }) => url.pathname === '/api/auth/session')
          .map(({ method }) => method),
      ).toEqual(['GET', 'GET', 'DELETE', 'GET', 'GET', 'DELETE', 'GET']);
      expect(harness.sessionUsers.at(-1)).not.toBeNull();
      expect(
        harness.context.request.delete.mock.invocationCallOrder[0],
      ).toBeLessThan(
        harness.context.request.get.mock.invocationCallOrder.at(-2) ?? 0,
      );
      expect(
        harness.context.request.delete.mock.invocationCallOrder[1],
      ).toBeLessThan(
        harness.context.request.get.mock.invocationCallOrder.at(-1) ?? 0,
      );
      expect(
        harness.context.request.get.mock.invocationCallOrder.at(-1) ?? 0,
      ).toBeLessThan(harness.context.close.mock.invocationCallOrder[0]);
      expect(harness.context.close).toHaveBeenCalledOnce();
      expect(harness.browser.close).toHaveBeenCalledOnce();
    } finally {
      harness.completePoReview();
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
    }
  });

  it('reports a failed best-effort logout cleanup and never prints logout success', async () => {
    const harness = startPilot01Handoff(undefined, undefined, {}, false);
    const log = vi.spyOn(console, 'log');
    try {
      await vi.waitFor(() =>
        expect(harness.reviewQuestion).toHaveBeenCalledTimes(3),
      );
      harness.completePoReview();

      const failure = await harness.handoff.then(
        () => new Error('Expected the handoff to fail'),
        (error: unknown) => error as Error,
      );

      expect(failure.message).toBe(
        'PILOT01_SESSION_LOGOUT_FAILED_AT_LOGOUT_AFTER_VERIFIED_IDENTITY_AND_PILOT01_LOGOUT_CLEANUP_FAILED_AFTER_VERIFIED_IDENTITY',
      );
      expect(harness.context.request.delete).toHaveBeenCalledTimes(2);
      expect(harness.context.request.get).toHaveBeenCalledTimes(8);
      expect(harness.sessionUsers.at(-1)).not.toBeNull();
      expect(log.mock.calls.flat().join('\n')).not.toContain(
        'Land review session logout verified.',
      );
    } finally {
      harness.completePoReview();
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
      log.mockRestore();
    }
  });

  it('allows unrelated parcels and verifies detail for the single synthetic target', async () => {
    const unrelatedParcelId = 'unrelated-parcel-id';
    const harness = startPilot01Handoff(undefined, undefined, {
      listItems: [
        { id: unrelatedParcelId, parcelCode: 'ORD-009' },
        { id: parcelId, parcelCode },
      ],
    });
    void harness.handoff.catch(() => undefined);
    try {
      await vi.waitFor(() =>
        expect(harness.reviewQuestion).toHaveBeenCalledTimes(3),
      );
      expect(
        harness.requests.some(
          ({ url }) => url.pathname === `/api/land/parcels/${parcelId}`,
        ),
      ).toBe(true);
      expect(
        harness.requests.some(
          ({ url }) =>
            url.pathname === `/api/land/parcels/${unrelatedParcelId}`,
        ),
      ).toBe(false);

      harness.completePoReview();
      await harness.handoff;
    } finally {
      harness.completePoReview();
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
    }
  });

  it('uses nextCursor to accept a sole synthetic target on a later parcel page', async () => {
    const cursor = 'later-page';
    const harness = startPilot01Handoff(undefined, undefined, {
      listPages: [
        {
          items: [{ id: 'unrelated-parcel-id', parcelCode: 'ORD-009' }],
          nextCursor: cursor,
        },
        { items: [{ id: parcelId, parcelCode }], nextCursor: null },
      ],
    });
    void harness.handoff.catch(() => undefined);
    try {
      await vi.waitFor(() =>
        expect(
          harness.requests
            .filter(({ url }) => url.pathname === '/api/land/parcels')
            .map(({ url }) => url.searchParams.get('cursor')),
        ).toEqual([null, cursor]),
      );
      await vi.waitFor(() =>
        expect(harness.reviewQuestion).toHaveBeenCalledTimes(3),
      );
      expect(
        harness.requests.some(
          ({ url }) => url.pathname === `/api/land/parcels/${parcelId}`,
        ),
      ).toBe(true);

      harness.completePoReview();
      await harness.handoff;
    } finally {
      harness.completePoReview();
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
    }
  });

  it('rejects duplicate synthetic targets across parcel pages before detail', async () => {
    const cursor = 'duplicate-page';
    const harness = startPilot01Handoff(undefined, undefined, {
      listPages: [
        { items: [{ id: parcelId, parcelCode }], nextCursor: cursor },
        {
          items: [
            {
              id: 'second-synthetic-parcel-id',
              parcelCode: 'P01-SYN-fedcba654321',
            },
          ],
          nextCursor: null,
        },
      ],
    });
    try {
      harness.completePoReview();
      await expect(harness.handoff).rejects.toThrow(
        'PILOT01_BROWSER_SESSION_UNVERIFIED',
      );
      expect(
        harness.requests
          .filter(({ url }) => url.pathname === '/api/land/parcels')
          .map(({ url }) => url.searchParams.get('cursor')),
      ).toEqual([null, cursor]);
      expect(
        harness.requests.some(({ url }) =>
          url.pathname.startsWith('/api/land/parcels/'),
        ),
      ).toBe(false);
    } finally {
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
    }
  });

  it('rejects a malformed synthetic marker on a later parcel page', async () => {
    const cursor = 'malformed-page';
    const harness = startPilot01Handoff(undefined, undefined, {
      listPages: [
        { items: [{ id: parcelId, parcelCode }], nextCursor: cursor },
        {
          items: [{ id: 'malformed-parcel-id', parcelCode: 'P01-SYN-invalid' }],
          nextCursor: null,
        },
      ],
    });
    try {
      harness.completePoReview();
      await expect(harness.handoff).rejects.toThrow(
        'PILOT01_BROWSER_SESSION_UNVERIFIED',
      );
      expect(
        harness.requests
          .filter(({ url }) => url.pathname === '/api/land/parcels')
          .map(({ url }) => url.searchParams.get('cursor')),
      ).toEqual([null, cursor]);
      expect(
        harness.requests.some(({ url }) =>
          url.pathname.startsWith('/api/land/parcels/'),
        ),
      ).toBe(false);
    } finally {
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
    }
  });

  it('allows unrelated parcels across pages and details only the synthetic target', async () => {
    const cursor = 'unrelated-page';
    const harness = startPilot01Handoff(undefined, undefined, {
      listPages: [
        { items: [{ id: parcelId, parcelCode }], nextCursor: cursor },
        {
          items: [{ id: 'unrelated-parcel-id', parcelCode: 'ORD-009' }],
          nextCursor: null,
        },
      ],
    });
    void harness.handoff.catch(() => undefined);
    try {
      await vi.waitFor(() =>
        expect(
          harness.requests
            .filter(({ url }) => url.pathname === '/api/land/parcels')
            .map(({ url }) => url.searchParams.get('cursor')),
        ).toEqual([null, cursor]),
      );
      await vi.waitFor(() =>
        expect(harness.reviewQuestion).toHaveBeenCalledTimes(3),
      );
      expect(
        harness.requests
          .filter(({ url }) => url.pathname.startsWith('/api/land/parcels/'))
          .map(({ url }) => url.pathname),
      ).toEqual([`/api/land/parcels/${parcelId}`]);

      harness.completePoReview();
      await harness.handoff;
    } finally {
      harness.completePoReview();
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
    }
  });

  it('rejects multiple synthetic parcel targets', async () => {
    const harness = startPilot01Handoff(undefined, undefined, {
      listItems: [
        { id: parcelId, parcelCode },
        {
          id: 'second-synthetic-parcel-id',
          parcelCode: 'P01-SYN-fedcba654321',
        },
      ],
    });
    try {
      harness.completePoReview();
      await expect(harness.handoff).rejects.toThrow(
        'PILOT01_BROWSER_SESSION_UNVERIFIED',
      );
      expect(
        harness.requests.some(({ url }) =>
          url.pathname.startsWith('/api/land/parcels/'),
        ),
      ).toBe(false);
    } finally {
      harness.completePoReview();
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
    }
  });

  it('rejects a parcel list without a synthetic target', async () => {
    const harness = startPilot01Handoff(undefined, undefined, {
      listItems: [{ id: 'unrelated-parcel-id', parcelCode: 'ORD-009' }],
    });
    try {
      harness.completePoReview();
      await expect(harness.handoff).rejects.toThrow(
        'PILOT01_BROWSER_SESSION_UNVERIFIED',
      );
      expect(
        harness.requests.some(({ url }) =>
          url.pathname.startsWith('/api/land/parcels/'),
        ),
      ).toBe(false);
    } finally {
      harness.completePoReview();
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
    }
  });

  it.each([
    [
      'malformed synthetic marker',
      { id: parcelId, parcelCode: 'P01-SYN-1234' },
      { id: parcelId, parcelCode: 'P01-SYN-1234' },
    ],
    [
      'trailing newline marker',
      { id: parcelId, parcelCode: `${parcelCode}\n` },
      { id: parcelId, parcelCode: `${parcelCode}\n` },
    ],
    [
      'detail code mismatch',
      { id: parcelId, parcelCode },
      { id: parcelId, parcelCode: 'P01-SYN-fedcba654321' },
    ],
    [
      'detail ID mismatch',
      { id: parcelId, parcelCode },
      { id: 'different-parcel-id', parcelCode },
    ],
  ])(
    'rejects %s before displaying a parcel code',
    async (_label, listParcel, detailParcel) => {
      const harness = startPilot01Handoff(undefined, undefined, {
        listParcel,
        detailParcel,
      });
      const log = vi.spyOn(console, 'log');
      try {
        harness.completePoReview();
        await expect(harness.handoff).rejects.toThrow(
          'PILOT01_BROWSER_SESSION_UNVERIFIED',
        );
        expect(log.mock.calls.flat().join('\n')).not.toContain('parcel=');
      } finally {
        await harness.handoff.catch(() => undefined);
        harness.restoreTTY();
        log.mockRestore();
      }
    },
  );

  it.each([
    ['malformed party shape', { items: [null], nextCursor: null }],
    [
      'unmasked identity number',
      {
        items: [
          {
            ...partyList.items[0],
            identityNumberMasked: '123456789012',
          },
        ],
        nextCursor: null,
      },
    ],
    [
      'malformed mask prefix',
      {
        items: [
          {
            ...partyList.items[0],
            identityNumberMasked: '12***1234',
          },
        ],
        nextCursor: null,
      },
    ],
    [
      'fully masked long identity',
      {
        items: [{ ...partyList.items[0], identityNumberMasked: '**********' }],
        nextCursor: null,
      },
    ],
    [
      'snake-case identity alias',
      {
        items: [{ ...partyList.items[0], identity_number: '123456789012' }],
        nextCursor: null,
      },
    ],
    [
      'encrypted identity alias',
      {
        items: [
          {
            ...partyList.items[0],
            identityNumberEncrypted: 'synthetic-ciphertext',
          },
        ],
        nextCursor: null,
      },
    ],
    [
      'raw identity number',
      {
        items: [{ ...partyList.items[0], identityNumber: '123456789012' }],
        nextCursor: null,
      },
    ],
    [
      'ciphertext field',
      {
        items: [
          { ...partyList.items[0], identityNumberCiphertext: 'ciphertext' },
        ],
        nextCursor: null,
      },
    ],
    [
      'blind index field',
      {
        items: [{ ...partyList.items[0], identityNumberIndex: 'blind-index' }],
        nextCursor: null,
      },
    ],
  ])('rejects %s in the authenticated party list', async (_label, body) => {
    const harness = startPilot01Handoff(body);
    try {
      harness.completePoReview();
      await expect(harness.handoff).rejects.toThrow(
        'PILOT01_BROWSER_SESSION_UNVERIFIED',
      );
      expect(
        harness.requests.some(
          ({ url, method }) =>
            url.pathname === '/api/land/parties' && method === 'GET',
        ),
      ).toBe(true);
    } finally {
      await harness.handoff.catch(() => undefined);
      harness.restoreTTY();
    }
  });
});
