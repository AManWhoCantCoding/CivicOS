import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import { prisma } from '@/lib/prisma';

import { recordAudit } from './audit';
import { requireRole } from './authorization';
import type { IdentityUser, RoleName } from './contracts';

const defaultPassword = 'civicos-dev';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const digest = scryptSync(password, salt, 64).toString('hex');
  return `${salt}.${digest}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, digest] = stored.split('.');
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function ensureDevelopmentUsers(): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;

  const unit = await prisma.organizationUnit.upsert({
    where: { id: 'unit-nghia-tru' },
    update: { name: 'Công an xã Nghĩa Trụ', level: 'commune', active: true },
    create: {
      id: 'unit-nghia-tru',
      name: 'Công an xã Nghĩa Trụ',
      level: 'commune',
    },
  });

  const roleNames: RoleName[] = [
    'commander',
    'duty_officer',
    'field_officer',
    'office_officer',
    'village_officer',
    'supervisor',
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
  ] as const;

  for (const entry of users) {
    const user = await prisma.user.upsert({
      where: { email: entry.email },
      update: {
        name: entry.name,
        passwordHash: hashPassword(defaultPassword),
        organizationUnitId: unit.id,
        active: true,
      },
      create: {
        email: entry.email,
        name: entry.name,
        passwordHash: hashPassword(defaultPassword),
        organizationUnitId: unit.id,
      },
    });
    const role = roles.find((candidate) => candidate.name === entry.role);
    if (!role) continue;
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
  if (
    !user?.active ||
    !user.passwordHash ||
    !verifyPassword(password, user.passwordHash)
  ) {
    return null;
  }

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
    };
  });
}
