import { randomBytes, randomUUID } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  rmdirSync,
  symlinkSync,
} from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testPrisma = vi.hoisted(() => {
  const organizationUnit = {
    upsert: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  };
  const role = { upsert: vi.fn() };
  const user = {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  };
  const userRole = { deleteMany: vi.fn(), upsert: vi.fn(), create: vi.fn() };
  const auditEvent = { findFirst: vi.fn(), create: vi.fn() };
  const eventRecord = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  };
  const outboxMessage = { create: vi.fn() };
  return {
    execFileSync: vi.fn(),
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
    organizationUnit,
    role,
    user,
    userRole,
    auditEvent,
    eventRecord,
    outboxMessage,
    transaction: {
      organizationUnit,
      role,
      user,
      userRole,
      auditEvent,
      eventRecord,
      outboxMessage,
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: testPrisma }));
vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  execFileSync: testPrisma.execFileSync,
}));

import {
  authenticateLocal,
  ensureDevelopmentUsers,
  hashPassword,
  verifyPassword,
} from '@/modules/identity/local-provider';
import {
  readPilot01CommanderSecret,
  storePilot01CommanderSecret,
} from '../../scripts/demo/pilot01-secret-store';
import { fillPilot01CommanderLogin } from '../../scripts/demo/use-pilot01-commander';
import {
  assertPilot01DatabaseUrl,
  generatePilot01CommanderPassword,
  runPilot01CommanderBootstrap,
  verifyPilot01DatabaseIdentity,
  verifyPilot01DockerIdentity,
  type Pilot01ContainerIdentity,
  type Pilot01DatabaseIdentity,
} from '../../scripts/demo/bootstrap-pilot01-commander';

const verifiedContainer: Pilot01ContainerIdentity = {
  id: 'container-id',
  name: 'civicos-pilot01-20261019-r01-postgres-unique',
  image: 'postgis/postgis:16-3.4',
  imageId: 'sha256:image-id',
  running: true,
  portBindings: [
    { hostIp: '127.0.0.1', hostPort: '5433', containerPort: '5432' },
  ],
  mounts: [
    {
      type: 'volume',
      name: 'civicos-pilot01-20261019-r01-data-unique',
      destination: '/var/lib/postgresql/data',
      readOnly: false,
    },
  ],
  networks: [
    {
      name: 'civicos-pilot01-20261019-r01-net-unique',
      ipAddress: '172.18.0.2',
    },
  ],
};

describe('NGOÀI BASELINE — D-53 Pilot 01 fixture guard', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://runtime-selected-user@127.0.0.1:5433/civicos_demo',
    );
    testPrisma.organizationUnit.upsert.mockImplementation(
      async (input: { where: { id: string } }) => ({ id: input.where.id }),
    );
    testPrisma.role.upsert.mockImplementation(
      async (input: { where: { name: string } }) => ({
        id: `role-${input.where.name}`,
        name: input.where.name,
      }),
    );
    testPrisma.user.upsert.mockImplementation(
      async (input: { where: { email: string } }) => ({
        id: `user-${input.where.email}`,
      }),
    );
    testPrisma.$queryRaw.mockResolvedValue([
      {
        databaseName: 'civicos_demo',
        databaseUser: 'runtime-selected-user',
        serverAddress: '172.18.0.2',
        serverPort: 5432,
        serverVersionNum: '160004',
      },
    ]);
    testPrisma.$transaction.mockImplementation(
      async (action: (tx: never) => Promise<unknown>) =>
        action(testPrisma.transaction as never),
    );
    testPrisma.organizationUnit.findUnique.mockResolvedValue(null);
    testPrisma.organizationUnit.create.mockImplementation(
      async (input: {
        data: {
          id: string;
          name: string;
          level: string;
          parentId?: string | null;
          active?: boolean;
        };
      }) => ({
        ...input.data,
        active: input.data.active ?? true,
        parentId: input.data.parentId ?? null,
      }),
    );
    testPrisma.user.findUnique.mockResolvedValue(null);
    testPrisma.user.findFirst.mockResolvedValue(null);
    testPrisma.role.upsert.mockImplementation(
      async (input: { where: { name: string } }) => ({
        id: `role-${input.where.name}`,
        name: input.where.name,
      }),
    );
    testPrisma.user.create.mockImplementation(
      async (input: { data: Record<string, unknown> }) => ({
        ...input.data,
        id: 'pilot01-commander-id',
      }),
    );
    testPrisma.auditEvent.findFirst.mockResolvedValue(null);
    testPrisma.auditEvent.create.mockResolvedValue({
      id: 'audit-1',
      occurredAt: new Date('2026-10-20T00:00:00.000Z'),
    });
    testPrisma.eventRecord.findUnique.mockResolvedValue(null);
    testPrisma.eventRecord.findFirst.mockResolvedValue(null);
    testPrisma.eventRecord.create.mockResolvedValue({});
    testPrisma.outboxMessage.create.mockResolvedValue({
      id: 'outbox-1',
      attempts: 0,
      status: 'pending',
    });
    testPrisma.$disconnect.mockResolvedValue(undefined);
    testPrisma.execFileSync.mockImplementation(
      (_command: string, args: string[]) => {
        if (args[0] === 'container' && args[1] === 'ls') {
          return 'container-id';
        }
        if (args[0] === 'container' && args[1] === 'inspect') {
          return JSON.stringify({
            id: 'container-id',
            name: `/${verifiedContainer.name}`,
            image: verifiedContainer.image,
            imageId: verifiedContainer.imageId,
            running: true,
            ports: {
              '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '5433' }],
            },
            mounts: [
              {
                Type: 'volume',
                Name: 'civicos-pilot01-20261019-r01-data-unique',
                Destination: '/var/lib/postgresql/data',
                RW: true,
              },
            ],
            networks: {
              'civicos-pilot01-20261019-r01-net-unique': {
                IPAddress: '172.18.0.2',
              },
            },
          });
        }
        if (args[0] === 'image' && args[1] === 'inspect') {
          return 'sha256:image-id';
        }
        throw new Error('unexpected Docker inspection');
      },
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('skips weak fixture writes and projects the normalized Pilot SQL address', async () => {
    await ensureDevelopmentUsers();

    expect(testPrisma.$queryRaw).toHaveBeenCalledOnce();
    const sql = testPrisma.$queryRaw.mock.calls[0][0] as TemplateStringsArray;
    expect(sql.join('')).toContain(
      'host(inet_server_addr()) AS "serverAddress"',
    );
    expect(testPrisma.organizationUnit.upsert).not.toHaveBeenCalled();
    expect(testPrisma.organizationUnit.update).not.toHaveBeenCalled();
    expect(testPrisma.role.upsert).not.toHaveBeenCalled();
    expect(testPrisma.user.upsert).not.toHaveBeenCalled();
    expect(testPrisma.userRole.deleteMany).not.toHaveBeenCalled();
    expect(testPrisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it('fails closed before fixture writes when DATABASE_URL is absent', async () => {
    vi.stubEnv('DATABASE_URL', undefined);
    testPrisma.$queryRaw.mockResolvedValue([
      {
        databaseName: 'other_demo',
        serverAddress: '172.18.0.2',
        serverPort: 5432,
      },
    ]);

    await expect(ensureDevelopmentUsers()).rejects.toThrow(
      'PILOT01_DATABASE_URL_REQUIRED',
    );
    expect(testPrisma.$queryRaw).not.toHaveBeenCalled();
    expect(testPrisma.organizationUnit.upsert).not.toHaveBeenCalled();
    expect(testPrisma.organizationUnit.update).not.toHaveBeenCalled();
    expect(testPrisma.role.upsert).not.toHaveBeenCalled();
    expect(testPrisma.user.upsert).not.toHaveBeenCalled();
    expect(testPrisma.userRole.deleteMany).not.toHaveBeenCalled();
    expect(testPrisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it('fails closed before fixture writes when DATABASE_URL is malformed', async () => {
    vi.stubEnv('DATABASE_URL', 'not a valid database URL');
    testPrisma.$queryRaw.mockResolvedValue([
      {
        databaseName: 'other_demo',
        serverAddress: '172.18.0.2',
        serverPort: 5432,
      },
    ]);

    await expect(ensureDevelopmentUsers()).rejects.toThrow(
      'PILOT01_DATABASE_URL_REFUSED',
    );
    expect(testPrisma.$queryRaw).not.toHaveBeenCalled();
    expect(testPrisma.organizationUnit.upsert).not.toHaveBeenCalled();
    expect(testPrisma.organizationUnit.update).not.toHaveBeenCalled();
    expect(testPrisma.role.upsert).not.toHaveBeenCalled();
    expect(testPrisma.user.upsert).not.toHaveBeenCalled();
    expect(testPrisma.userRole.deleteMany).not.toHaveBeenCalled();
    expect(testPrisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it('fails closed when the Pilot 01 URL points at a different database identity', async () => {
    testPrisma.$queryRaw.mockResolvedValue([
      {
        databaseName: 'not_civicos_demo',
        serverAddress: '172.18.0.2',
        serverPort: 5432,
      },
    ]);

    await expect(ensureDevelopmentUsers()).rejects.toThrow(
      'PILOT01_SANDBOX_IDENTITY_UNVERIFIED',
    );
    expect(testPrisma.organizationUnit.upsert).not.toHaveBeenCalled();
    expect(testPrisma.organizationUnit.update).not.toHaveBeenCalled();
    expect(testPrisma.role.upsert).not.toHaveBeenCalled();
    expect(testPrisma.user.upsert).not.toHaveBeenCalled();
    expect(testPrisma.userRole.deleteMany).not.toHaveBeenCalled();
    expect(testPrisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it('fails closed when the connected database identity cannot be read', async () => {
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://runtime-selected-user@127.0.0.1:5433/civicos_demo',
    );
    testPrisma.$queryRaw.mockResolvedValue([]);

    await expect(ensureDevelopmentUsers()).rejects.toThrow(
      'PILOT01_SANDBOX_IDENTITY_UNVERIFIED',
    );
    expect(testPrisma.organizationUnit.upsert).not.toHaveBeenCalled();
    expect(testPrisma.user.upsert).not.toHaveBeenCalled();
  });

  it('preserves fixture seeding for a non-Pilot endpoint even when SQL database name matches', async () => {
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://runtime-user@db.example:5432/civicos_demo',
    );

    await ensureDevelopmentUsers();

    expect(testPrisma.$queryRaw).not.toHaveBeenCalled();
    expect(testPrisma.organizationUnit.upsert).toHaveBeenCalled();
    expect(testPrisma.user.upsert).toHaveBeenCalledTimes(11);
  });

  it('rejects civicos-dev for a legacy Commander fixture only on the verified Pilot database', async () => {
    const fixture = {
      id: 'dev-commander',
      email: 'truong@civicos.local',
      name: 'Trưởng Công an xã',
      active: true,
      passwordHash: hashPassword('civicos-dev'),
      organizationUnitId: 'unit-nghia-tru',
      roles: [{ role: { name: 'commander' } }],
    };
    const commanderPassword = randomBytes(32).toString('hex');
    testPrisma.user.findUnique.mockResolvedValue(fixture);

    await expect(
      authenticateLocal(fixture.email, 'civicos-dev'),
    ).resolves.toBeNull();
    testPrisma.user.findUnique.mockResolvedValue({
      ...fixture,
      passwordHash: hashPassword(commanderPassword),
    });
    await expect(
      authenticateLocal(fixture.email, commanderPassword),
    ).resolves.toMatchObject({ id: fixture.id, roles: ['commander'] });
    expect(testPrisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it('rejects a legacy fixture password in production on the verified Pilot database', async () => {
    const fixture = {
      id: 'dev-commander',
      email: 'truong@civicos.local',
      name: 'Trưởng Công an xã',
      active: true,
      passwordHash: hashPassword('civicos-dev'),
      organizationUnitId: 'unit-nghia-tru',
      roles: [{ role: { name: 'commander' } }],
    };
    vi.stubEnv('NODE_ENV', 'production');
    testPrisma.user.findUnique.mockResolvedValue(fixture);

    await expect(
      authenticateLocal(fixture.email, 'civicos-dev'),
    ).resolves.toBeNull();
    expect(testPrisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it('preserves production fixture authentication outside Pilot even when SQL database name matches', async () => {
    const fixture = {
      id: 'dev-commander',
      email: 'truong@civicos.local',
      name: 'Trưởng Công an xã',
      active: true,
      passwordHash: hashPassword('civicos-dev'),
      organizationUnitId: 'unit-nghia-tru',
      roles: [{ role: { name: 'commander' } }],
    };
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://runtime-user@db.example:5432/civicos_demo',
    );
    testPrisma.$queryRaw.mockResolvedValue([
      {
        databaseName: 'civicos_demo',
        serverAddress: '10.20.30.40',
        serverPort: 5432,
      },
    ]);
    testPrisma.user.findUnique.mockResolvedValue(fixture);

    await expect(
      authenticateLocal(fixture.email, 'civicos-dev'),
    ).resolves.toMatchObject({ id: fixture.id, roles: ['commander'] });
  });

  it('preserves default fixture authentication outside Pilot and in production', async () => {
    const fixture = {
      id: 'dev-commander',
      email: 'truong@civicos.local',
      name: 'Trưởng Công an xã',
      active: true,
      passwordHash: hashPassword('civicos-dev'),
      organizationUnitId: 'unit-nghia-tru',
      roles: [{ role: { name: 'commander' } }],
    };
    vi.stubEnv('DATABASE_URL', 'postgresql://pilot@127.0.0.1:5432/other_demo');
    testPrisma.$queryRaw.mockResolvedValue([
      {
        databaseName: 'other_demo',
        serverAddress: '172.18.0.2',
        serverPort: 5432,
      },
    ]);
    testPrisma.user.findUnique.mockResolvedValue(fixture);

    await expect(
      authenticateLocal(fixture.email, 'civicos-dev'),
    ).resolves.toMatchObject({ id: fixture.id, roles: ['commander'] });
    vi.stubEnv('NODE_ENV', 'production');
    await expect(
      authenticateLocal(fixture.email, 'civicos-dev'),
    ).resolves.toMatchObject({ id: fixture.id, roles: ['commander'] });
    expect(testPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('preserves development fixture behavior for a non-Pilot target', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://pilot@127.0.0.1:5432/other_demo');
    testPrisma.$queryRaw.mockResolvedValue([
      {
        databaseName: 'other_demo',
        serverAddress: '172.18.0.2',
        serverPort: 5432,
      },
    ]);

    await ensureDevelopmentUsers();

    expect(testPrisma.$queryRaw).not.toHaveBeenCalled();
    expect(testPrisma.organizationUnit.upsert).toHaveBeenCalled();
    expect(testPrisma.user.upsert).toHaveBeenCalledTimes(11);
  });

  it('accepts only the approved Pilot 01 PostgreSQL URL', () => {
    expect(
      assertPilot01DatabaseUrl(
        'postgresql://variable-user@127.0.0.1:5433/civicos_demo',
      ).pathname,
    ).toBe('/civicos_demo');
    for (const url of [
      'postgresql://user@localhost:5433/civicos_demo',
      'postgresql://user@127.0.0.1:5432/civicos_demo',
      'postgresql://user@127.0.0.1:5433/other',
      'postgresql://user@127.0.0.1:55432/civicos_demo',
    ]) {
      expect(() => assertPilot01DatabaseUrl(url)).toThrow(
        'PILOT01_DATABASE_URL_REFUSED',
      );
    }
  });

  it('verifies the unique prefixed container, image, bind, volumes and network', () => {
    expect(() =>
      verifyPilot01DockerIdentity(verifiedContainer, 'sha256:image-id'),
    ).not.toThrow();
    expect(() =>
      verifyPilot01DockerIdentity(
        { ...verifiedContainer, image: 'postgis/postgis:latest' },
        'sha256:image-id',
      ),
    ).toThrow('PILOT01_DOCKER_IDENTITY_UNVERIFIED');
    expect(() =>
      verifyPilot01DockerIdentity(
        {
          ...verifiedContainer,
          portBindings: [
            { hostIp: '0.0.0.0', hostPort: '5433', containerPort: '5432' },
          ],
        },
        'sha256:image-id',
      ),
    ).toThrow('PILOT01_DOCKER_IDENTITY_UNVERIFIED');
  });

  it('matches SQL database identity and URL username to the inspected container', () => {
    const identity: Pilot01DatabaseIdentity = {
      databaseName: 'civicos_demo',
      databaseUser: 'runtime-selected-user',
      serverAddress: '172.18.0.2',
      serverPort: 5432,
      serverVersionNum: '160004',
    };
    const databaseUrl =
      'postgresql://runtime-selected-user@127.0.0.1:5433/civicos_demo';
    expect(() =>
      verifyPilot01DatabaseIdentity(identity, verifiedContainer, databaseUrl),
    ).not.toThrow();
    expect(() =>
      verifyPilot01DatabaseIdentity(
        { ...identity, serverAddress: '172.18.0.99' },
        verifiedContainer,
        databaseUrl,
      ),
    ).toThrow('PILOT01_DATABASE_IDENTITY_UNVERIFIED');
  });

  it('matches SQL current_user to a safely decoded URL username', () => {
    const identity: Pilot01DatabaseIdentity = {
      databaseName: 'civicos_demo',
      databaseUser: 'runtime+selected',
      serverAddress: '172.18.0.2',
      serverPort: 5432,
      serverVersionNum: '160004',
    };
    const databaseUrl =
      'postgresql://runtime%2Bselected@127.0.0.1:5433/civicos_demo';

    expect(() =>
      verifyPilot01DatabaseIdentity(identity, verifiedContainer, databaseUrl),
    ).not.toThrow();
    expect(() =>
      verifyPilot01DatabaseIdentity(
        { ...identity, databaseUser: 'unexpected-user' },
        verifiedContainer,
        databaseUrl,
      ),
    ).toThrow('PILOT01_DATABASE_IDENTITY_UNVERIFIED');
    expect(() =>
      verifyPilot01DatabaseIdentity(
        identity,
        verifiedContainer,
        'postgresql://runtime%ZZ@127.0.0.1:5433/civicos_demo',
      ),
    ).toThrow('PILOT01_DATABASE_IDENTITY_UNVERIFIED');
  });

  it.skipIf(process.platform !== 'win32')(
    'stores and retrieves the secret through CurrentUser DPAPI without plaintext files',
    () => {
      const directory = path.join(
        process.cwd(),
        '.scratch',
        'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
      );
      const filePath = path.join(
        directory,
        `secret-test-${randomUUID()}.dpapi`,
      );
      const secret = randomBytes(32).toString('hex');
      mkdirSync(directory, { recursive: true });
      try {
        storePilot01CommanderSecret(secret, filePath);
        const encrypted = readFileSync(filePath, 'utf8');
        expect(encrypted.includes(secret)).toBe(false);
        expect(readPilot01CommanderSecret(filePath) === secret).toBe(true);
        expect(() => storePilot01CommanderSecret(secret, filePath)).toThrow(
          'PILOT01_SECRET_STORE_REFUSED',
        );
      } finally {
        rmSync(filePath, { force: true });
      }
    },
  );

  it.skipIf(process.platform !== 'win32')(
    'refuses secret reads through a workspace junction without touching its target',
    () => {
      const scratchRoot = path.join(process.cwd(), '.scratch');
      const workItemDirectory = path.join(
        scratchRoot,
        'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
      );
      for (const directory of [scratchRoot, workItemDirectory]) {
        if (!existsSync(directory)) mkdirSync(directory);
        const stat = lstatSync(directory);
        expect(stat.isDirectory()).toBe(true);
        expect(stat.isSymbolicLink()).toBe(false);
      }

      const targetDirectory = path.join(process.cwd(), 'scripts');
      expect(lstatSync(targetDirectory).isDirectory()).toBe(true);
      const junctionPath = path.join(
        workItemDirectory,
        `secret-path-junction-${randomUUID()}`,
      );
      const missingTargetPath = path.join(
        junctionPath,
        `missing-${randomUUID()}.dpapi`,
      );
      expect(
        existsSync(
          path.join(targetDirectory, path.basename(missingTargetPath)),
        ),
      ).toBe(false);
      symlinkSync(targetDirectory, junctionPath, 'junction');
      try {
        expect(() => readPilot01CommanderSecret(missingTargetPath)).toThrow(
          'PILOT01_SECRET_STORE_PATH_REFUSED',
        );
        expect(
          existsSync(
            path.join(targetDirectory, path.basename(missingTargetPath)),
          ),
        ).toBe(false);
      } finally {
        rmdirSync(junctionPath);
      }
    },
  );

  it.skipIf(process.platform !== 'win32')(
    'fills the masked login field from CurrentUser DPAPI without logging the secret',
    async () => {
      const directory = path.join(
        process.cwd(),
        '.scratch',
        'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
      );
      const credentialPath = path.join(
        directory,
        `handoff-test-${randomUUID()}.dpapi`,
      );
      const password = randomBytes(32).toString('hex');
      mkdirSync(directory, { recursive: true });
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
      try {
        storePilot01CommanderSecret(password, credentialPath);
        const retrieved = readPilot01CommanderSecret(credentialPath);
        expect(retrieved !== null).toBe(true);

        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(
          '<h1>Vào đúng hồ sơ. Làm đúng nhiệm vụ.</h1><label>Email<input type="email"></label><label>Mật khẩu<input type="password"></label>',
        );
        await fillPilot01CommanderLogin(page, retrieved ?? '');

        const passwordInput = page.getByLabel('Mật khẩu', { exact: true });
        expect(await passwordInput.getAttribute('type')).toBe('password');
        expect((await passwordInput.inputValue()) === password).toBe(true);
        expect(
          consoleLog.mock.calls
            .flat()
            .map((value) => String(value))
            .join('\n')
            .includes(password),
        ).toBe(false);
      } finally {
        consoleLog.mockRestore();
        await browser?.close();
        rmSync(credentialPath, { force: true });
      }
    },
  );

  it('generates a fresh high-entropy password without using the weak fixture value', () => {
    const first = generatePilot01CommanderPassword();

    expect(/^[a-f0-9]{64}$/.test(first)).toBe(true);
    expect(first === 'civicos-dev').toBe(false);
  });

  it.skipIf(process.platform !== 'win32')(
    'creates one commander with the current password hash and provenance audit, then is idempotent',
    async () => {
      const credentialPath = path.join(
        process.cwd(),
        '.scratch',
        'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
        `commander-test-${randomUUID()}.dpapi`,
      );
      const directory = path.dirname(credentialPath);
      mkdirSync(directory, { recursive: true });
      try {
        const created = await runPilot01CommanderBootstrap({ credentialPath });
        const createInput = testPrisma.user.create.mock.calls[0][0] as {
          data: {
            passwordHash: string;
            email: string;
            name: string;
            organizationUnitId: string;
            active: boolean;
          };
        };
        const secret = readPilot01CommanderSecret(credentialPath) ?? '';
        const storedUser = {
          ...createInput.data,
          id: 'pilot01-commander-id',
          active: true,
          organizationUnitId: 'pilot01-synthetic-district',
          roles: [{ role: { name: 'commander' } }],
        };
        testPrisma.organizationUnit.findUnique.mockResolvedValue({
          id: 'pilot01-synthetic-district',
          name: 'Pilot 01 synthetic district',
          level: 'district',
          parentId: null,
          active: true,
        });
        testPrisma.user.findUnique.mockResolvedValue(storedUser);
        testPrisma.auditEvent.findFirst.mockResolvedValue({ id: 'audit-1' });

        const repeated = await runPilot01CommanderBootstrap({ credentialPath });

        expect(created.created).toBe(true);
        expect(repeated.created).toBe(false);
        expect(createInput.data.email).toBe('pilot01-commander@civicos.local');
        expect(createInput.data.name).toBe('Pilot 01 Commander');
        expect(createInput.data.organizationUnitId).toBe(
          'pilot01-synthetic-district',
        );
        expect(createInput.data.active).toBe(true);
        expect(testPrisma.organizationUnit.create).toHaveBeenCalledOnce();
        expect(
          testPrisma.organizationUnit.create.mock.calls[0][0].data,
        ).toEqual({
          id: 'pilot01-synthetic-district',
          name: 'Pilot 01 synthetic district',
          level: 'district',
          parentId: null,
          active: true,
        });
        expect(testPrisma.role.upsert.mock.calls[0][0].where.name).toBe(
          'commander',
        );
        expect(
          /^[a-f0-9]{32}\.[a-f0-9]{128}$/.test(createInput.data.passwordHash),
        ).toBe(true);
        expect(verifyPassword(secret, createInput.data.passwordHash)).toBe(
          true,
        );
        expect(secret === createInput.data.passwordHash).toBe(false);
        expect(testPrisma.user.create).toHaveBeenCalledOnce();
        expect(testPrisma.auditEvent.create).toHaveBeenCalledOnce();
        expect(testPrisma.eventRecord.create).toHaveBeenCalledOnce();
        expect(
          testPrisma.auditEvent.create.mock.calls[0][0].data.operation,
        ).toBe('identity.commander.bootstrap.pilot01');
        expect(
          testPrisma.auditEvent.create.mock.calls[0][0].data.metadata,
        ).toMatchObject({
          ticketId: 'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
          source: 'demo-only-bootstrap',
        });
        expect(
          JSON.stringify(testPrisma.auditEvent.create.mock.calls).includes(
            secret,
          ),
        ).toBe(false);
        expect(
          JSON.stringify(testPrisma.eventRecord.create.mock.calls).includes(
            secret,
          ),
        ).toBe(false);
      } finally {
        rmSync(credentialPath, { force: true });
      }
    },
  );

  it.skipIf(process.platform !== 'win32')(
    'refuses an existing commander identity instead of creating a duplicate',
    async () => {
      const credentialPath = path.join(
        process.cwd(),
        '.scratch',
        'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
        `commander-test-${randomUUID()}.dpapi`,
      );
      testPrisma.user.findFirst.mockResolvedValue({
        id: 'pre-existing-commander',
      });

      await expect(
        runPilot01CommanderBootstrap({ credentialPath }),
      ).rejects.toThrow('PILOT01_COMMANDER_DUPLICATE');
      expect(testPrisma.organizationUnit.create).not.toHaveBeenCalled();
      expect(testPrisma.user.create).not.toHaveBeenCalled();
      expect(testPrisma.auditEvent.create).not.toHaveBeenCalled();
      expect(readPilot01CommanderSecret(credentialPath)).toBeNull();
    },
  );

  it.skipIf(process.platform !== 'win32')(
    'does not persist credentials or write when SQL identity differs from inspected Docker identity',
    async () => {
      const credentialPath = path.join(
        process.cwd(),
        '.scratch',
        'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
        `commander-test-${randomUUID()}.dpapi`,
      );
      testPrisma.$queryRaw.mockResolvedValue([
        {
          databaseName: 'civicos_demo',
          databaseUser: 'runtime-selected-user',
          serverAddress: '172.18.0.99',
          serverPort: 5432,
          serverVersionNum: '160004',
        },
      ]);

      await expect(
        runPilot01CommanderBootstrap({ credentialPath }),
      ).rejects.toThrow('PILOT01_DATABASE_IDENTITY_UNVERIFIED');
      expect(testPrisma.$transaction).not.toHaveBeenCalled();
      expect(testPrisma.user.create).not.toHaveBeenCalled();
      expect(existsSync(credentialPath)).toBe(false);
    },
  );

  it.skipIf(process.platform !== 'win32')(
    'projects the normalized SQL address before Pilot bootstrap writes',
    async () => {
      testPrisma.$queryRaw.mockResolvedValue([]);

      await expect(runPilot01CommanderBootstrap()).rejects.toThrow(
        'PILOT01_DATABASE_IDENTITY_UNVERIFIED',
      );
      expect(testPrisma.$queryRaw).toHaveBeenCalledOnce();
      const sql = testPrisma.$queryRaw.mock.calls[0][0] as TemplateStringsArray;
      expect(sql.join('')).toContain(
        'host(inet_server_addr()) AS "serverAddress"',
      );
      expect(testPrisma.$transaction).not.toHaveBeenCalled();
      expect(testPrisma.user.create).not.toHaveBeenCalled();
    },
  );
});
