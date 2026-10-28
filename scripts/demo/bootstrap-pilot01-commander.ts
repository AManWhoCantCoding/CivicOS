import { randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PILOT01_SANDBOX = {
  prefix: 'civicos-pilot01-20261019-r01',
  database: 'civicos_demo',
  host: '127.0.0.1',
  hostPort: '5433',
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

// DB-CONSOLIDATION SLICE (D-78 Task 4): the Pilot 01 sandbox provisioning
// runtime is retired. Only the pure identity validators above remain; the
// runtime entrypoint fails closed before any Docker, Prisma, secret-store or
// database activity.
export async function runPilot01CommanderBootstrap(
  _options: {
    credentialPath?: string;
  } = {},
): Promise<Pilot01CommanderResult> {
  throw new Error('PILOT01_SANDBOX_RUNTIME_RETIRED');
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void runPilot01CommanderBootstrap().catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : 'PILOT01_COMMANDER_BOOTSTRAP_FAILED',
    );
    process.exitCode = 1;
  });
}
