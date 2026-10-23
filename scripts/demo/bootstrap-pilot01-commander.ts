import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isIP } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  readPilot01CommanderSecret,
  storePilot01CommanderSecret,
} from './pilot01-secret-store';

export const PILOT01_SANDBOX = {
  prefix: 'civicos-pilot01-20261019-r01',
  database: 'civicos_demo',
  host: '127.0.0.1',
  hostPort: '55432',
  postgresPort: '5432',
  image: 'postgis/postgis:16-3.4',
} as const;

export type Pilot01ContainerIdentity = {
  id: string;
  name: string;
  image: string;
  imageId: string;
  running: boolean;
  portBindings: Array<{
    hostIp: string;
    hostPort: string;
    containerPort: string;
  }>;
  mounts: Array<{
    type: string;
    name: string;
    destination: string;
    readOnly: boolean;
  }>;
  networks: Array<{ name: string; ipAddress: string }>;
};

export type Pilot01DatabaseIdentity = {
  databaseName: string;
  databaseUser: string;
  serverAddress: string | null;
  serverPort: number | null;
  serverVersionNum: string;
};

export const PILOT01_COMMANDER_EMAIL = 'pilot01-commander@civicos.local';

const COMMANDER = {
  email: PILOT01_COMMANDER_EMAIL,
  name: 'Pilot 01 Commander',
  unitId: 'pilot01-synthetic-district',
  unitName: 'Pilot 01 synthetic district',
  role: 'commander',
  auditOperation: 'identity.commander.bootstrap.pilot01',
} as const;

export type Pilot01CommanderResult = {
  id: string;
  email: string;
  name: string;
  organizationUnitId: string;
  created: boolean;
};

function hasPilot01Prefix(name: string): boolean {
  return (
    name === PILOT01_SANDBOX.prefix ||
    name.startsWith(`${PILOT01_SANDBOX.prefix}-`)
  );
}

export function assertPilot01DatabaseUrl(databaseUrl: string): URL {
  let target: URL;
  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error('PILOT01_DATABASE_URL_REFUSED');
  }
  let databaseName: string;
  try {
    databaseName = decodeURIComponent(target.pathname.slice(1));
  } catch {
    throw new Error('PILOT01_DATABASE_URL_REFUSED');
  }
  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    target.hostname !== PILOT01_SANDBOX.host ||
    target.port !== PILOT01_SANDBOX.hostPort ||
    databaseName !== PILOT01_SANDBOX.database ||
    target.hash
  ) {
    throw new Error('PILOT01_DATABASE_URL_REFUSED');
  }
  return target;
}

export function verifyPilot01DockerIdentity(
  container: Pilot01ContainerIdentity,
  referenceImageId: string,
): void {
  const dataMount = container.mounts.find(
    (mount) => mount.destination === '/var/lib/postgresql/data',
  );
  const volumeNames = container.mounts.map((mount) => mount.name);
  const networkNames = container.networks.map((network) => network.name);
  const postgresBindings = container.portBindings.filter(
    (binding) => binding.hostPort === PILOT01_SANDBOX.hostPort,
  );
  if (
    !container.id ||
    !hasPilot01Prefix(container.name.replace(/^\//, '')) ||
    container.image !== PILOT01_SANDBOX.image ||
    !container.imageId ||
    container.imageId !== referenceImageId ||
    !container.running ||
    postgresBindings.length !== 1 ||
    postgresBindings[0].hostIp !== PILOT01_SANDBOX.host ||
    postgresBindings[0].containerPort !== PILOT01_SANDBOX.postgresPort ||
    container.mounts.length === 0 ||
    container.mounts.some(
      (mount) => mount.type !== 'volume' || !hasPilot01Prefix(mount.name),
    ) ||
    !dataMount ||
    dataMount.readOnly ||
    new Set(volumeNames).size !== volumeNames.length ||
    container.networks.length === 0 ||
    container.networks.some(
      (network) =>
        !hasPilot01Prefix(network.name) || isIP(network.ipAddress) !== 4,
    ) ||
    new Set(networkNames).size !== networkNames.length
  ) {
    throw new Error('PILOT01_DOCKER_IDENTITY_UNVERIFIED');
  }
}

export function verifyPilot01DatabaseIdentity(
  identity: Pilot01DatabaseIdentity,
  container: Pilot01ContainerIdentity,
  databaseUrl: string,
): void {
  let databaseUserFromUrl: string;
  try {
    databaseUserFromUrl = decodeURIComponent(new URL(databaseUrl).username);
  } catch {
    throw new Error('PILOT01_DATABASE_IDENTITY_UNVERIFIED');
  }
  if (
    identity.databaseName !== PILOT01_SANDBOX.database ||
    !identity.databaseUser.trim() ||
    !databaseUserFromUrl.trim() ||
    identity.databaseUser !== databaseUserFromUrl ||
    !identity.serverAddress ||
    isIP(identity.serverAddress) !== 4 ||
    identity.serverPort !== Number(PILOT01_SANDBOX.postgresPort) ||
    Math.trunc(Number(identity.serverVersionNum) / 10_000) !== 16 ||
    !container.networks.some(
      (network) => network.ipAddress === identity.serverAddress,
    )
  ) {
    throw new Error('PILOT01_DATABASE_IDENTITY_UNVERIFIED');
  }
}

export function generatePilot01CommanderPassword(): string {
  return randomBytes(32).toString('hex');
}

function assertSyntheticUnit(unit: {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
  active: boolean;
}): void {
  if (
    unit.id !== COMMANDER.unitId ||
    unit.name !== COMMANDER.unitName ||
    unit.level !== 'district' ||
    unit.parentId !== null ||
    !unit.active
  ) {
    throw new Error('PILOT01_SYNTHETIC_UNIT_REFUSED');
  }
}

async function provisionPilot01Commander(
  password: string,
): Promise<Pilot01CommanderResult> {
  if (!/^[a-f0-9]{64}$/.test(password)) {
    throw new Error('PILOT01_CREDENTIAL_INVALID');
  }
  const [
    { prisma },
    { Prisma },
    { hashPassword, verifyPassword },
    { recordAudit },
  ] = await Promise.all([
    import('@/lib/prisma'),
    import('@prisma/client'),
    import('@/modules/identity/local-provider'),
    import('@/modules/identity/audit'),
  ]);

  return prisma.$transaction(
    async (tx) => {
      const [unit, existingUser] = await Promise.all([
        tx.organizationUnit.findUnique({ where: { id: COMMANDER.unitId } }),
        tx.user.findUnique({
          where: { email: COMMANDER.email },
          include: { roles: { include: { role: true } } },
        }),
      ]);
      if (unit) assertSyntheticUnit(unit);

      if (existingUser) {
        const [audit, otherCommander] = await Promise.all([
          tx.auditEvent.findFirst({
            where: {
              resourceType: 'User',
              resourceId: existingUser.id,
              operation: COMMANDER.auditOperation,
            },
            select: { id: true },
          }),
          tx.user.findFirst({
            where: {
              id: { not: existingUser.id },
              organizationUnitId: COMMANDER.unitId,
              active: true,
              roles: { some: { role: { name: COMMANDER.role } } },
            },
            select: { id: true },
          }),
        ]);
        const roles = existingUser.roles.map(({ role }) => role.name);
        if (
          !unit ||
          existingUser.name !== COMMANDER.name ||
          !existingUser.active ||
          existingUser.organizationUnitId !== COMMANDER.unitId ||
          roles.length !== 1 ||
          roles[0] !== COMMANDER.role ||
          !audit ||
          otherCommander ||
          !existingUser.passwordHash ||
          !verifyPassword(password, existingUser.passwordHash)
        ) {
          throw new Error('PILOT01_COMMANDER_DUPLICATE');
        }
        return {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          organizationUnitId: COMMANDER.unitId,
          created: false,
        };
      }

      const duplicateCommander = await tx.user.findFirst({
        where: {
          organizationUnitId: COMMANDER.unitId,
          active: true,
          roles: { some: { role: { name: COMMANDER.role } } },
        },
        select: { id: true },
      });
      if (duplicateCommander) {
        throw new Error('PILOT01_COMMANDER_DUPLICATE');
      }

      if (!unit) {
        await tx.organizationUnit.create({
          data: {
            id: COMMANDER.unitId,
            name: COMMANDER.unitName,
            level: 'district',
            parentId: null,
            active: true,
          },
        });
      }
      const role = await tx.role.upsert({
        where: { name: COMMANDER.role },
        update: {},
        create: {
          name: COMMANDER.role,
          description: 'Pilot 01 demo-only Commander',
        },
      });
      const user = await tx.user.create({
        data: {
          email: COMMANDER.email,
          name: COMMANDER.name,
          passwordHash: hashPassword(password),
          organizationUnitId: COMMANDER.unitId,
          active: true,
        },
      });
      await tx.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      await recordAudit(
        {
          actor: null,
          resourceType: 'User',
          resourceId: user.id,
          operation: COMMANDER.auditOperation,
          metadata: {
            ticketId: 'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
            source: 'demo-only-bootstrap',
            sandboxPrefix: PILOT01_SANDBOX.prefix,
            organizationUnitId: COMMANDER.unitId,
            role: COMMANDER.role,
          },
        },
        tx,
      );
      return {
        id: user.id,
        email: user.email,
        name: user.name ?? COMMANDER.name,
        organizationUnitId: COMMANDER.unitId,
        created: true,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function dockerRead(args: string[]): string {
  try {
    return execFileSync('docker', args, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 1_000_000,
    }).trim();
  } catch {
    throw new Error('PILOT01_DOCKER_INSPECTION_FAILED');
  }
}

function inspectPilot01Container(): Pilot01ContainerIdentity {
  const ids = dockerRead([
    'container',
    'ls',
    '--all',
    '--filter',
    `name=${PILOT01_SANDBOX.prefix}`,
    '--format',
    '{{.ID}}',
  ])
    .split(/\r?\n/)
    .filter(Boolean);
  if (ids.length !== 1) {
    throw new Error('PILOT01_DOCKER_IDENTITY_UNVERIFIED');
  }
  const competingIds = dockerRead([
    'container',
    'ls',
    '--all',
    '--filter',
    `publish=${PILOT01_SANDBOX.hostPort}`,
    '--format',
    '{{.ID}}',
  ])
    .split(/\r?\n/)
    .filter(Boolean);
  if (competingIds.length !== 1 || competingIds[0] !== ids[0]) {
    throw new Error('PILOT01_DOCKER_IDENTITY_UNVERIFIED');
  }

  const format =
    '{"id":{{json .Id}},"name":{{json .Name}},"image":{{json .Config.Image}},"imageId":{{json .Image}},"running":{{json .State.Running}},"ports":{{json .HostConfig.PortBindings}},"mounts":{{json .Mounts}},"networks":{{json .NetworkSettings.Networks}}}';
  const raw = JSON.parse(
    dockerRead(['container', 'inspect', '--format', format, ids[0]]),
  ) as {
    id: string;
    name: string;
    image: string;
    imageId: string;
    running: boolean;
    ports: Record<string, Array<{ HostIp: string; HostPort: string }> | null>;
    mounts: Array<{
      Type: string;
      Name: string;
      Destination: string;
      RW: boolean;
    }>;
    networks: Record<string, { IPAddress: string }>;
  };
  const referenceImageId = dockerRead([
    'image',
    'inspect',
    '--format',
    '{{.Id}}',
    PILOT01_SANDBOX.image,
  ]);
  const identity: Pilot01ContainerIdentity = {
    id: raw.id,
    name: raw.name,
    image: raw.image,
    imageId: raw.imageId,
    running: raw.running,
    portBindings: Object.entries(raw.ports ?? {}).flatMap(
      ([containerPort, bindings]) =>
        (bindings ?? []).map((binding) => ({
          hostIp: binding.HostIp,
          hostPort: binding.HostPort,
          containerPort: containerPort.split('/')[0],
        })),
    ),
    mounts: (raw.mounts ?? []).map((mount) => ({
      type: mount.Type,
      name: mount.Name,
      destination: mount.Destination,
      readOnly: !mount.RW,
    })),
    networks: Object.entries(raw.networks ?? {}).map(([name, network]) => ({
      name,
      ipAddress: network.IPAddress,
    })),
  };
  verifyPilot01DockerIdentity(identity, referenceImageId);
  return identity;
}

export async function runPilot01CommanderBootstrap(
  options: {
    credentialPath?: string;
  } = {},
): Promise<Pilot01CommanderResult> {
  if (process.platform !== 'win32') {
    throw new Error('PILOT01_WINDOWS_SECRET_STORE_REQUIRED');
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('PILOT01_DATABASE_URL_REQUIRED');
  assertPilot01DatabaseUrl(databaseUrl);

  const container = inspectPilot01Container();
  const { prisma } = await import('@/lib/prisma');
  try {
    const [identity] = await prisma.$queryRaw<Pilot01DatabaseIdentity[]>`
      SELECT current_database() AS "databaseName",
        current_user AS "databaseUser",
        host(inet_server_addr()) AS "serverAddress",
        inet_server_port() AS "serverPort",
        current_setting('server_version_num') AS "serverVersionNum"
    `;
    if (!identity) throw new Error('PILOT01_DATABASE_IDENTITY_UNVERIFIED');
    verifyPilot01DatabaseIdentity(identity, container, databaseUrl);

    let password = readPilot01CommanderSecret(options.credentialPath);
    if (!password) {
      const [emailCollision, existingCommander] = await Promise.all([
        prisma.user.findUnique({
          where: { email: COMMANDER.email },
          select: { id: true },
        }),
        prisma.user.findFirst({
          where: {
            organizationUnitId: COMMANDER.unitId,
            active: true,
            roles: { some: { role: { name: COMMANDER.role } } },
          },
          select: { id: true },
        }),
      ]);
      if (emailCollision || existingCommander) {
        throw new Error('PILOT01_COMMANDER_DUPLICATE');
      }
      const generated = generatePilot01CommanderPassword();
      try {
        storePilot01CommanderSecret(generated, options.credentialPath);
        password = generated;
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.message !== 'PILOT01_SECRET_STORE_REFUSED'
        ) {
          throw error;
        }
        password = readPilot01CommanderSecret(options.credentialPath);
        if (!password) throw new Error('PILOT01_SECRET_STORE_FAILED');
      }
    }
    return await provisionPilot01Commander(password);
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void runPilot01CommanderBootstrap()
    .then((result) => {
      console.log(
        result.created
          ? 'Pilot 01 Commander created; credential stored for the current Windows user.'
          : 'Pilot 01 Commander already bootstrapped; no credential or database reset performed.',
      );
    })
    .catch(() => {
      console.error('PILOT01_COMMANDER_BOOTSTRAP_FAILED');
      process.exitCode = 1;
    });
}
