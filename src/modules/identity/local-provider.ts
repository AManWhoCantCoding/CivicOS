import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

import { prisma } from '@/lib/prisma';

import { recordAudit } from './audit';
import { requireRole } from './authorization';
import type { IdentityUser, RoleName } from './contracts';

const defaultPassword = 'civicos-dev';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const digest = scryptSync(password, salt, 64).toString('hex');
  return `${salt}.${digest}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, digest] = stored.split('.');
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function isPilot01DatabaseTarget(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    throw new Error('PILOT01_DATABASE_URL_REQUIRED');
  }

  let target: URL;
  let databaseName: string;
  try {
    target = new URL(databaseUrl);
    databaseName = decodeURIComponent(target.pathname.slice(1));
  } catch {
    throw new Error('PILOT01_DATABASE_URL_REFUSED');
  }
  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !target.hostname ||
    !databaseName
  ) {
    throw new Error('PILOT01_DATABASE_URL_REFUSED');
  }
  const configuredForPilot01 =
    target.hostname === '127.0.0.1' && target.port === '5433';
  if (!configuredForPilot01) return false;
  if (databaseName !== 'civicos_demo') {
    throw new Error('PILOT01_SANDBOX_IDENTITY_UNVERIFIED');
  }

  // Only the approved endpoint can be Pilot; connected SQL identity must also
  // prove the expected database, server address and port.
  const [identity] = await prisma.$queryRaw<
    Array<{
      databaseName: string;
      serverAddress: string | null;
      serverPort: number | null;
    }>
  >`
    SELECT current_database() AS "databaseName",
      host(inet_server_addr()) AS "serverAddress",
      inet_server_port() AS "serverPort"
  `;
  if (
    !identity ||
    identity.databaseName !== 'civicos_demo' ||
    !identity.serverAddress ||
    isIP(identity.serverAddress) !== 4 ||
    identity.serverPort !== 5432
  ) {
    throw new Error('PILOT01_SANDBOX_IDENTITY_UNVERIFIED');
  }
  return true;
}

export async function ensureDevelopmentUsers(): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;
  if (await isPilot01DatabaseTarget()) return;

  const unit = await prisma.organizationUnit.upsert({
    where: { id: 'unit-nghia-tru' },
    update: { name: 'Công an xã Nghĩa Trụ', level: 'commune', active: true },
    create: {
      id: 'unit-nghia-tru',
      name: 'Công an xã Nghĩa Trụ',
      level: 'commune',
    },
  });
  const upperUnit = await prisma.organizationUnit.upsert({
    where: { id: 'unit-cap-tren' },
    update: {
      name: 'Công an cấp trên',
      level: 'district',
      parentId: null,
      active: true,
    },
    create: {
      id: 'unit-cap-tren',
      name: 'Công an cấp trên',
      level: 'district',
      parentId: null,
    },
  });
  await prisma.organizationUnit.update({
    where: { id: unit.id },
    data: { parentId: upperUnit.id },
  });

  const roleNames: RoleName[] = [
    'commander',
    'duty_officer',
    'field_officer',
    'office_officer',
    'village_officer',
    'superior_officer',
    'superior_commander',
    'system_operator',
  ];

  const roles = await Promise.all(
    roleNames.map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name, description: `Development role: ${name}` },
      }),
    ),
  );

  const users = [
    {
      email: 'truong@civicos.local',
      name: 'Trưởng Công an xã',
      role: 'commander',
    },
    {
      email: 'trucban@civicos.local',
      name: 'Cán bộ trực ban',
      role: 'duty_officer',
    },
    {
      email: 'hientruong@civicos.local',
      name: 'Cán bộ hiện trường',
      role: 'field_officer',
    },
    {
      email: 'vanphong@civicos.local',
      name: 'Cán bộ văn phòng',
      role: 'office_officer',
    },
    {
      email: 'khongduocphancong@civicos.local',
      name: 'User không được phân công',
      role: 'field_officer',
    },
    {
      email: 'captren@civicos.local',
      name: 'Cán bộ đơn vị cấp trên',
      role: 'superior_officer',
      organizationUnitId: 'unit-cap-tren',
    },
    {
      email: 'captren-chihuy@civicos.local',
      name: 'Chỉ huy đơn vị cấp trên',
      role: 'superior_commander',
      organizationUnitId: 'unit-cap-tren',
    },
    {
      email: 'system-operator@civicos.local',
      name: 'Vận hành hệ thống',
      role: 'system_operator',
    },
    {
      email: 'thon@civicos.local',
      name: 'Cán bộ thôn',
      role: 'village_officer',
    },
    {
      id: 'dev-commander',
      email: 'commander@civicos.local',
      name: 'Commander workflow fixture',
      role: 'commander',
    },
    {
      id: 'dev-field',
      email: 'field@civicos.local',
      name: 'Field workflow fixture',
      role: 'field_officer',
    },
  ] as const;

  for (const entry of users) {
    const fixtureId = 'id' in entry ? entry.id : undefined;
    const entryUnitId =
      'organizationUnitId' in entry && entry.organizationUnitId
        ? entry.organizationUnitId
        : unit.id;
    const user = await prisma.user.upsert({
      where: { email: entry.email },
      update: {
        name: entry.name,
        passwordHash: hashPassword(defaultPassword),
        organizationUnitId: entryUnitId,
        active: true,
      },
      create: {
        ...(fixtureId ? { id: fixtureId } : {}),
        email: entry.email,
        name: entry.name,
        passwordHash: hashPassword(defaultPassword),
        organizationUnitId: entryUnitId,
      },
    });
    const role = roles.find((candidate) => candidate.name === entry.role);
    if (!role) continue;
    await prisma.userRole.deleteMany({
      where: { userId: user.id, roleId: { not: role.id } },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }
}

export async function authenticateLocal(
  email: string,
  password: string,
): Promise<IdentityUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { roles: { include: { role: true } } },
  });
  if (!user?.active || !user.passwordHash) {
    return null;
  }
  if (password === defaultPassword && (await isPilot01DatabaseTarget())) {
    return null;
  }
  if (!verifyPassword(password, user.passwordHash)) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    roles: user.roles.map(({ role }) => role.name as RoleName),
    organizationUnitId: user.organizationUnitId ?? undefined,
  };
}

export async function listIdentityUsers(actor: IdentityUser) {
  requireRole(actor, 'commander');
  const users = await prisma.user.findMany({
    where: { active: true },
    include: { roles: { include: { role: true } } },
    orderBy: { name: 'asc' },
  });
  await recordAudit({
    actor,
    resourceType: 'User',
    resourceId: '*',
    operation: 'user.listed',
    metadata: { count: users.length },
  });
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles.map(({ role }) => role.name),
    organizationUnitId: user.organizationUnitId,
  }));
}

export async function listOrganizationUnits(actor: IdentityUser) {
  const organizationUnits = await prisma.organizationUnit.findMany({
    where: { active: true },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  });
  await recordAudit({
    actor,
    resourceType: 'OrganizationUnit',
    resourceId: '*',
    operation: 'organization_unit.listed',
    metadata: { count: organizationUnits.length },
  });
  return organizationUnits.map((unit) => ({
    id: unit.id,
    name: unit.name,
    level: unit.level,
    parentId: unit.parentId,
  }));
}

export async function createIdentityUser(
  input: { email: string; name: string; role: RoleName; password: string },
  actor: IdentityUser,
) {
  requireRole(actor, 'commander');
  if (
    !input.email.includes('@') ||
    !input.name.trim() ||
    input.password.length < 8
  ) {
    throw new Error('INVALID_USER');
  }
  return prisma.$transaction(async (tx) => {
    if (input.role === 'land_officer') {
      const organizationUnitId = actor.organizationUnitId;
      if (!organizationUnitId?.trim()) {
        throw new Error('INVALID_ORGANIZATION_UNIT');
      }
      const organizationUnit = await tx.organizationUnit.findFirst({
        where: { id: organizationUnitId, active: true },
        select: { id: true },
      });
      if (!organizationUnit) throw new Error('INVALID_ORGANIZATION_UNIT');
    }
    const role = await tx.role.upsert({
      where: { name: input.role },
      update: {},
      create: {
        name: input.role,
        description: `Development role: ${input.role}`,
      },
    });
    const user = await tx.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        passwordHash: hashPassword(input.password),
        organizationUnitId: actor.organizationUnitId,
        roles: { create: { roleId: role.id } },
      },
      include: { roles: { include: { role: true } } },
    });
    await recordAudit(
      {
        actor,
        resourceType: 'User',
        resourceId: user.id,
        operation: 'user.created',
        metadata: { role: input.role },
      },
      tx,
    );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map(({ role: createdRole }) => createdRole.name),
      organizationUnitId: user.organizationUnitId,
    };
  });
}
