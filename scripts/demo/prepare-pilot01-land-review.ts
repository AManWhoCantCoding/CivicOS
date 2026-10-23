import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PILOT01_COMMANDER_EMAIL,
  runPilot01CommanderBootstrap,
} from './bootstrap-pilot01-commander';
import {
  readPilot01CommanderSecret,
  storePilot01CommanderSecret,
} from './pilot01-secret-store';

const ORIGIN = new URL('http://127.0.0.1:3100');
const PILOT01_SYNTHETIC_ORGANIZATION_ID = 'pilot01-synthetic-district';
const PILOT01_SYNTHETIC_PARCEL_CODE = /^P01-SYN-[a-f0-9]{12}$/;
const LAND_REVIEW_EMAIL = 'pilot01-land-review@civicos.local';
const LAND_REVIEW_NAME = 'Pilot 01 Land Review';
const LAND_REVIEW_SECRET_PATH = path.join(
  process.cwd(),
  '.scratch',
  'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
  'land-review-officer.dpapi',
);
const PILOT01_RUNTIME_ENV_PATH = path.join(
  process.cwd(),
  '.scratch',
  'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
  'runtime.env',
);

type RecordValue = Record<string, unknown>;
type IdentityUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  organizationUnitId: string | null;
};
type Assignment = {
  resourceType: string;
  resourceId: string;
  task: string;
  assigneeUserId: string;
  organizationId: string | null;
  status: string;
};
export type Pilot01LandReviewResult = {
  role: 'land_officer';
  organizationUnitId: string;
  assignment: 'created' | 'reused';
  listStatus: number;
  parcelCount: number;
  parcelCode: string;
  detailStatus: number;
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSyntheticParcelCode(value: string): boolean {
  return value.length === 20 && PILOT01_SYNTHETIC_PARCEL_CODE.test(value);
}

function parseIdentityUser(value: unknown): IdentityUser {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.email !== 'string' ||
    typeof value.name !== 'string' ||
    !Array.isArray(value.roles) ||
    !value.roles.every((role) => typeof role === 'string') ||
    (value.organizationUnitId !== null &&
      typeof value.organizationUnitId !== 'string')
  ) {
    throw new Error('PILOT01_IDENTITY_RESPONSE_INVALID');
  }
  return {
    id: value.id,
    email: value.email,
    name: value.name,
    roles: value.roles,
    organizationUnitId: value.organizationUnitId,
  };
}

function parseAssignment(value: unknown): Assignment {
  if (
    !isRecord(value) ||
    typeof value.resourceType !== 'string' ||
    typeof value.resourceId !== 'string' ||
    typeof value.task !== 'string' ||
    typeof value.assigneeUserId !== 'string' ||
    (value.organizationId !== null &&
      typeof value.organizationId !== 'string') ||
    typeof value.status !== 'string'
  ) {
    throw new Error('PILOT01_ASSIGNMENT_RESPONSE_INVALID');
  }
  return {
    resourceType: value.resourceType,
    resourceId: value.resourceId,
    task: value.task,
    assigneeUserId: value.assigneeUserId,
    organizationId: value.organizationId,
    status: value.status,
  };
}

async function request(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE';
    cookie?: string;
    body?: Record<string, unknown>;
  } = {},
): Promise<Response> {
  const headers = new Headers();
  if (options.cookie) headers.set('cookie', options.cookie);
  if (options.body) headers.set('content-type', 'application/json');
  let response: Response;
  try {
    response = await fetch(new URL(endpoint, ORIGIN), {
      method: options.method ?? 'GET',
      headers,
      redirect: 'error',
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    throw new Error('PILOT01_API_UNAVAILABLE');
  }
  if (!response.ok) throw new Error('PILOT01_API_REQUEST_FAILED');
  return response;
}

async function readResponse(response: Response): Promise<RecordValue> {
  const value = (await response.json().catch(() => null)) as unknown;
  if (!isRecord(value)) throw new Error('PILOT01_API_RESPONSE_INVALID');
  return value;
}

function sessionCookie(response: Response): string {
  const pair = response.headers.get('set-cookie')?.split(';', 1)[0]?.trim();
  if (!pair || !pair.includes('=')) {
    throw new Error('PILOT01_SESSION_COOKIE_MISSING');
  }
  return pair;
}

function assertSessionUser(
  value: unknown,
  expected: {
    id: string;
    email: string;
    role: string;
    organizationUnitId: string;
  },
): void {
  const user = parseIdentityUser(value);
  if (
    user.id !== expected.id ||
    user.email.toLowerCase() !== expected.email ||
    user.roles.length !== 1 ||
    user.roles[0] !== expected.role ||
    user.organizationUnitId !== expected.organizationUnitId
  ) {
    throw new Error('PILOT01_SESSION_IDENTITY_UNVERIFIED');
  }
}

function assertReviewUser(user: IdentityUser, unitId: string): void {
  if (
    user.email.toLowerCase() !== LAND_REVIEW_EMAIL ||
    user.name !== LAND_REVIEW_NAME ||
    user.roles.length !== 1 ||
    user.roles[0] !== 'land_officer' ||
    user.organizationUnitId !== unitId
  ) {
    throw new Error('PILOT01_LAND_REVIEW_ACCOUNT_MISMATCH');
  }
}

async function logout(cookie: string): Promise<boolean> {
  try {
    const deleteResponse = await request('/api/auth/session', {
      method: 'DELETE',
      cookie,
    });
    const deleteBody = await readResponse(deleteResponse);
    if (deleteBody.ok !== true) return false;

    const sessionResponse = await request('/api/auth/session', { cookie });
    const sessionBody = await readResponse(sessionResponse);
    return sessionBody.user === null;
  } catch {
    return false;
  }
}

export async function preparePilot01LandReviewAccount(): Promise<Pilot01LandReviewResult> {
  let commanderPassword = readPilot01CommanderSecret() ?? '';
  if (!commanderPassword) {
    throw new Error('PILOT01_COMMANDER_SECRET_REQUIRED');
  }
  if (!/^[a-f0-9]{64}$/.test(commanderPassword)) {
    throw new Error('PILOT01_COMMANDER_SECRET_INVALID');
  }

  let officerPassword = '';
  let commanderCookie = '';
  let officerCookie = '';
  try {
    // Require the existing secret above before this guard can bootstrap anything.
    const commander = await runPilot01CommanderBootstrap();
    if (
      commander.email !== PILOT01_COMMANDER_EMAIL ||
      !commander.organizationUnitId
    ) {
      throw new Error('PILOT01_COMMANDER_IDENTITY_UNVERIFIED');
    }

    const commanderSessionResponse = await request('/api/auth/session', {
      method: 'POST',
      body: {
        email: PILOT01_COMMANDER_EMAIL,
        password: commanderPassword,
      },
    });
    commanderCookie = sessionCookie(commanderSessionResponse);
    const commanderSession = await readResponse(commanderSessionResponse);
    assertSessionUser(commanderSession.user, {
      id: commander.id,
      email: PILOT01_COMMANDER_EMAIL,
      role: 'commander',
      organizationUnitId: commander.organizationUnitId,
    });

    const assignmentsResponse = await request(
      '/api/identity/assignments?resourceType=LandParcel',
      { cookie: commanderCookie },
    );
    const assignmentsBody = await readResponse(assignmentsResponse);
    if (!Array.isArray(assignmentsBody.assignments)) {
      throw new Error('PILOT01_ASSIGNMENT_RESPONSE_INVALID');
    }
    const assignments = assignmentsBody.assignments.map(parseAssignment);
    const targetAssignments = assignments.filter(
      (assignment) =>
        assignment.resourceType === 'LandParcel' &&
        assignment.task === 'land_review' &&
        assignment.organizationId === commander.organizationUnitId &&
        assignment.status === 'active',
    );
    const parcelIds = [
      ...new Set(targetAssignments.map(({ resourceId }) => resourceId)),
    ];
    if (parcelIds.length !== 1) {
      throw new Error('PILOT01_SYNTHETIC_PARCEL_UNVERIFIED');
    }
    const parcelId = parcelIds[0];
    let parcel: { parcelCode: string; organizationId: string } | null = null;
    try {
      const { prisma } = await import('../../src/lib/prisma');
      try {
        parcel = await prisma.landParcel.findUnique({
          where: { id: parcelId },
          select: { parcelCode: true, organizationId: true },
        });
      } finally {
        await prisma.$disconnect().catch(() => undefined);
      }
    } catch {
      throw new Error('PILOT01_SYNTHETIC_PARCEL_UNVERIFIED');
    }
    if (
      !parcel ||
      !isSyntheticParcelCode(parcel.parcelCode) ||
      parcel.organizationId !== PILOT01_SYNTHETIC_ORGANIZATION_ID ||
      parcel.organizationId !== commander.organizationUnitId
    ) {
      throw new Error('PILOT01_SYNTHETIC_PARCEL_UNVERIFIED');
    }

    const secret = readPilot01CommanderSecret(LAND_REVIEW_SECRET_PATH);
    if (secret && !/^[a-f0-9]{64}$/.test(secret)) {
      throw new Error('PILOT01_LAND_REVIEW_SECRET_INVALID');
    }
    officerPassword = secret ?? '';

    const usersResponse = await request('/api/identity/users', {
      cookie: commanderCookie,
    });
    const usersBody = await readResponse(usersResponse);
    if (!Array.isArray(usersBody.users)) {
      throw new Error('PILOT01_IDENTITY_RESPONSE_INVALID');
    }
    const users = usersBody.users.map(parseIdentityUser);
    const matchingUsers = users.filter(
      (user) => user.email.toLowerCase() === LAND_REVIEW_EMAIL,
    );
    if (matchingUsers.length > 1) {
      throw new Error('PILOT01_LAND_REVIEW_ACCOUNT_AMBIGUOUS');
    }

    let officer = matchingUsers[0];
    if (officer) {
      if (!officerPassword) {
        throw new Error('PILOT01_LAND_REVIEW_SECRET_REQUIRED');
      }
      assertReviewUser(officer, commander.organizationUnitId);
    } else {
      if (!officerPassword) {
        officerPassword = randomBytes(32).toString('hex');
        storePilot01CommanderSecret(officerPassword, LAND_REVIEW_SECRET_PATH);
      }
      const createResponse = await request('/api/identity/users', {
        method: 'POST',
        cookie: commanderCookie,
        body: {
          email: LAND_REVIEW_EMAIL,
          name: LAND_REVIEW_NAME,
          role: 'land_officer',
          password: officerPassword,
        },
      });
      if (createResponse.status !== 201) {
        throw new Error('PILOT01_LAND_REVIEW_CREATE_FAILED');
      }
      const createBody = await readResponse(createResponse);
      officer = parseIdentityUser(createBody.user);
      assertReviewUser(officer, commander.organizationUnitId);
    }

    const existingOfficerAssignments = targetAssignments.filter(
      (assignment) => assignment.assigneeUserId === officer.id,
    );
    if (existingOfficerAssignments.length > 1) {
      throw new Error('PILOT01_LAND_REVIEW_ASSIGNMENT_AMBIGUOUS');
    }

    let assignmentOutcome: 'created' | 'reused' = 'reused';
    if (existingOfficerAssignments.length === 0) {
      const createAssignmentResponse = await request(
        '/api/identity/assignments',
        {
          method: 'POST',
          cookie: commanderCookie,
          body: {
            resourceType: 'LandParcel',
            resourceId: parcelId,
            task: 'land_review',
            assigneeUserIds: [officer.id],
            organizationId: commander.organizationUnitId,
          },
        },
      );
      if (createAssignmentResponse.status !== 201) {
        throw new Error('PILOT01_LAND_REVIEW_ASSIGNMENT_FAILED');
      }
      const createdAssignmentsBody = await readResponse(
        createAssignmentResponse,
      );
      if (!Array.isArray(createdAssignmentsBody.assignments)) {
        throw new Error('PILOT01_ASSIGNMENT_RESPONSE_INVALID');
      }
      const createdAssignments =
        createdAssignmentsBody.assignments.map(parseAssignment);
      if (
        !createdAssignments.some(
          (assignment) =>
            assignment.resourceType === 'LandParcel' &&
            assignment.resourceId === parcelId &&
            assignment.task === 'land_review' &&
            assignment.assigneeUserId === officer.id &&
            assignment.organizationId === commander.organizationUnitId &&
            assignment.status === 'active',
        )
      ) {
        throw new Error('PILOT01_LAND_REVIEW_ASSIGNMENT_UNVERIFIED');
      }
      assignmentOutcome = 'created';
    }

    const officerSessionResponse = await request('/api/auth/session', {
      method: 'POST',
      body: { email: LAND_REVIEW_EMAIL, password: officerPassword },
    });
    officerCookie = sessionCookie(officerSessionResponse);
    const officerSession = await readResponse(officerSessionResponse);
    assertSessionUser(officerSession.user, {
      id: officer.id,
      email: LAND_REVIEW_EMAIL,
      role: 'land_officer',
      organizationUnitId: commander.organizationUnitId,
    });

    const listResponse = await request('/api/land/parcels?limit=100', {
      cookie: officerCookie,
    });
    const listBody = await readResponse(listResponse);
    if (!Array.isArray(listBody.items)) {
      throw new Error('PILOT01_LAND_LIST_RESPONSE_INVALID');
    }
    const targetParcels = listBody.items.filter(
      (item) => isRecord(item) && item.id === parcelId,
    );
    if (
      targetParcels.length !== 1 ||
      !isRecord(targetParcels[0]) ||
      typeof targetParcels[0].parcelCode !== 'string' ||
      !isSyntheticParcelCode(targetParcels[0].parcelCode) ||
      targetParcels[0].parcelCode !== parcel.parcelCode
    ) {
      throw new Error('PILOT01_SYNTHETIC_PARCEL_UNVERIFIED');
    }
    const parcelCode = targetParcels[0].parcelCode;

    const detailResponse = await request(
      `/api/land/parcels/${encodeURIComponent(parcelId)}`,
      { cookie: officerCookie },
    );
    const detailBody = await readResponse(detailResponse);
    if (
      !isRecord(detailBody.parcel) ||
      detailBody.parcel.id !== parcelId ||
      typeof detailBody.parcel.parcelCode !== 'string' ||
      !isSyntheticParcelCode(detailBody.parcel.parcelCode) ||
      detailBody.parcel.parcelCode !== parcel.parcelCode ||
      detailBody.parcel.parcelCode !== parcelCode
    ) {
      throw new Error('PILOT01_LAND_DETAIL_RESPONSE_INVALID');
    }

    return {
      role: 'land_officer',
      organizationUnitId: commander.organizationUnitId,
      assignment: assignmentOutcome,
      listStatus: listResponse.status,
      parcelCount: listBody.items.length,
      parcelCode,
      detailStatus: detailResponse.status,
    };
  } finally {
    commanderPassword = '';
    officerPassword = '';
    const logoutResults = await Promise.all(
      [officerCookie, commanderCookie]
        .filter(Boolean)
        .map((cookie) => logout(cookie)),
    );
    if (logoutResults.some((result) => !result)) {
      throw new Error('PILOT01_SESSION_LOGOUT_FAILED');
    }
  }
}

export async function runPilot01LandReviewCli(): Promise<Pilot01LandReviewResult> {
  process.loadEnvFile(PILOT01_RUNTIME_ENV_PATH);
  return preparePilot01LandReviewAccount();
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void runPilot01LandReviewCli()
    .then((result) => {
      console.log(
        `Pilot 01 land review: role=${result.role} unit=${result.organizationUnitId} list=${result.listStatus} count=${result.parcelCount} parcel=${result.parcelCode} detail=${result.detailStatus}`,
      );
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error && /^[A-Z][A-Z0-9_]*$/.test(error.message)
          ? error.message
          : 'PILOT01_LAND_REVIEW_PREPARATION_FAILED';
      console.error(message);
      process.exitCode = 1;
    });
}
