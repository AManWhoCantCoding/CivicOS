import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const PASSWORD = 'civicos-dev';
const COMMANDER = 'truong@civicos.local';
const FIELD = 'hientruong@civicos.local';
const UNASSIGNED = 'khongduocphancong@civicos.local';

type Observation = {
  id: string;
  plate: string;
  observedAt: string;
  latitude: number | string;
  longitude: number | string;
  status: string;
  version: number;
  evidenceIds?: string[];
};

async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');
}

async function logout(page: Page): Promise<void> {
  const response = await page.request.delete('/api/auth/session');
  expect(response.ok()).toBe(true);
}

function marker(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function isoLocal(date: Date): string {
  return date.toISOString().slice(0, 16);
}

async function createRegistryViaApi(
  page: Page,
  plate: string,
  validFrom: Date,
  validUntil: Date,
) {
  const response = await page.request.post('/api/vehicles/registry', {
    data: {
      plate,
      source: 'PS009 fixture source',
      reason: 'PS009 fixture reason',
      validFrom: validFrom.toISOString(),
      validUntil: validUntil.toISOString(),
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as { entry: { id: string; status: string } };
}

async function recordObservationViaApi(
  page: Page,
  plate: string,
  clientCommandId = randomUUID(),
) {
  const response = await page.request.post('/api/vehicles/observations', {
    data: {
      plate,
      observedAt: new Date().toISOString(),
      latitude: 20.96,
      longitude: 105.93,
      description: `PS009 API observation ${clientCommandId}`,
      clientCommandId,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as {
    result: { observation: Observation; match: Observation | null };
  };
}

async function getObservation(page: Page, id: string): Promise<Observation> {
  const response = await page.request.get(`/api/vehicles/observations/${id}`);
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { observation: Observation }).observation;
}

test('vehicle field form exposes fast labeled inputs', async ({ page }) => {
  await page.goto('/field/vehicles');
  await expect(
    page.getByRole('heading', { name: 'Phương tiện tại hiện trường' }),
  ).toBeVisible();
  await expect(page.getByLabel('Biển số')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Ghi nhận phương tiện' }),
  ).toBeVisible();
});

test('PS-009 registry, observation, confirmation, verification and escalation flow', async ({
  page,
}) => {
  test.setTimeout(180000);
  const suffix = marker('PS009');
  const plate = `89A${Math.floor(Math.random() * 90000 + 10000)}`;
  const expiredPlate = `29B${Math.floor(Math.random() * 90000 + 10000)}`;
  const now = new Date();

  await loginAs(page, COMMANDER);
  await page.goto('/vehicles/registry');
  const registryForm = page.locator('form').filter({
    has: page.getByRole('heading', { name: 'Thêm vào registry' }),
  });
  await registryForm.getByLabel('Biển số').fill(plate);
  await registryForm.getByLabel('Nguồn').fill(`Nguồn ${suffix}`);
  await registryForm.getByLabel('Lý do').fill(`Lý do ${suffix}`);
  await registryForm
    .getByLabel('Có hiệu lực từ')
    .fill(isoLocal(new Date(now.getTime() - 3600000)));
  await page
    .getByRole('heading', { name: 'Thêm vào registry' })
    .locator('../..')
    .getByLabel('Hết hạn')
    .fill(isoLocal(new Date(now.getTime() + 86400000)));
  const registryResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/vehicles/registry') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Thêm registry' }).click();
  const registryResponse = await registryResponsePromise;
  expect(registryResponse.status()).toBe(201);
  await expect(page.getByText('Đã thêm biển số vào registry.')).toBeVisible();
  const createdRegistry = (await registryResponse.json()) as {
    entry: { plate: string; source: string; reason: string; status: string };
  };
  expect(createdRegistry.entry).toMatchObject({
    plate,
    source: `Nguồn ${suffix}`,
    reason: `Lý do ${suffix}`,
    status: 'active',
  });

  const expired = await createRegistryViaApi(
    page,
    expiredPlate,
    new Date(now.getTime() - 172800000),
    new Date(now.getTime() - 86400000),
  );
  expect(expired.entry.status).toBe('active');
  await logout(page);
  await loginAs(page, FIELD);
  const expiredObservation = await recordObservationViaApi(page, expiredPlate);
  expect(expiredObservation.result.match).toBeNull();
  expect(expiredObservation.result.observation.status).toBe('recorded');
  const expiredHistory = await getObservation(
    page,
    expiredObservation.result.observation.id,
  );
  expect(expiredHistory).toMatchObject({
    plate: expiredPlate,
    status: 'recorded',
  });

  await logout(page);
  await loginAs(page, FIELD);
  await page.goto('/field/vehicles');
  await page.getByLabel('Biển số').fill(plate);
  await page.getByLabel('Vĩ độ').fill('20.961');
  await page.getByLabel('Kinh độ').fill('105.931');
  await page.getByLabel('Mô tả').fill(`Quan sát thủ công ${suffix}`);
  const observationResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/sync') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Ghi nhận phương tiện' }).click();
  const observationResponse = await observationResponsePromise;
  expect(observationResponse.status()).toBe(200);
  const observationCommand = (await observationResponse.json()) as {
    command: {
      status: string;
      response: {
        result: {
          observationId: string;
          evidenceIds: string[];
          auditId: string;
        };
      };
    };
  };
  expect(observationCommand.command.status).toBe('synced');
  const observationId =
    observationCommand.command.response.result.observationId;
  expect(observationId).toBeTruthy();
  expect(observationCommand.command.response.result.evidenceIds).toEqual([]);
  expect(observationCommand.command.response.result.auditId).toEqual(
    expect.any(String),
  );
  await expect(
    page.getByRole('link', { name: 'Mở chi tiết quan sát →' }),
  ).toBeVisible();
  const observationEvidenceResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/evidence') &&
      response.request().method() === 'POST',
  );
  await page.getByLabel('Chọn ảnh bằng chứng').setInputFiles({
    name: `${suffix}-observation.jpg`,
    mimeType: 'image/jpeg',
    buffer: Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x50, 0x53, 0x30, 0x39, 0xff, 0xd9,
    ]),
  });
  const observationEvidenceResponse = await observationEvidenceResponsePromise;
  expect(observationEvidenceResponse.status()).toBe(201);
  const observationEvidenceBody =
    (await observationEvidenceResponse.json()) as {
      evidence: { id: string };
    };
  expect(observationEvidenceBody.evidence.id).toBeTruthy();
  const boundObservation = await getObservation(page, observationId);
  expect(boundObservation.evidenceIds).toEqual([
    observationEvidenceBody.evidence.id,
  ]);
  await page.getByRole('link', { name: 'Mở chi tiết quan sát →' }).click();
  await page.waitForURL(`/field/vehicles/${observationId}`);
  await expect(
    page.getByText('Chờ xác nhận match', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/kết luận pháp lý|kết luận nghiệp vụ/i),
  ).toHaveCount(0);

  const beforeVerification = await getObservation(page, observationId);
  const prematureVerify = await page.request.post(
    `/api/vehicles/observations/${observationId}`,
    {
      data: { command: 'verify', result: 'premature', notes: 'not confirmed' },
    },
  );
  expect(prematureVerify.status()).toBe(400);
  expect((await prematureVerify.json()) as { error: string }).toMatchObject({
    error: 'MATCH_CONFIRMATION_REQUIRED',
  });
  const prematureEscalation = await page.request.post(
    `/api/vehicles/observations/${observationId}`,
    { data: { command: 'escalate', organizationId: 'unit-cap-tren' } },
  );
  expect(prematureEscalation.status()).toBe(400);
  expect((await prematureEscalation.json()) as { error: string }).toMatchObject(
    {
      error: 'MATCH_CONFIRMATION_REQUIRED',
    },
  );

  await page.getByRole('button', { name: 'Xác nhận match' }).click();
  await expect(
    page.getByText('Đã xác nhận match. Có thể tiếp tục xác minh.'),
  ).toBeVisible();
  await expect(
    page.getByText('Đã xác nhận match', { exact: true }),
  ).toBeVisible();

  await page.getByLabel('Kết quả xác minh').fill(`Đã kiểm tra ${suffix}`);
  await page
    .getByLabel('Tra cứu chủ xe (không bắt buộc)')
    .fill(`ownerLookup-${suffix}`);
  await page.getByLabel('Ghi chú').fill(`Kết quả xác minh ${suffix}`);
  await page.getByLabel('Vĩ độ').last().fill('20.962');
  await page.getByLabel('Kinh độ').last().fill('105.932');
  const evidenceResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/evidence') &&
      response.request().method() === 'POST',
  );
  await page.getByLabel('Chọn ảnh bằng chứng').setInputFiles({
    name: `${suffix}.jpg`,
    mimeType: 'image/jpeg',
    buffer: Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x50, 0x53, 0x30, 0x39, 0xff, 0xd9,
    ]),
  });
  const evidenceResponse = await evidenceResponsePromise;
  expect(evidenceResponse.status()).toBe(201);
  const evidenceBody = (await evidenceResponse.json()) as {
    evidence: { id: string };
  };
  expect(evidenceBody.evidence.id).toBeTruthy();

  const verificationResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/vehicles/observations/${observationId}`) &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Lưu xác minh' }).click();
  const verificationResponse = await verificationResponsePromise;
  expect(verificationResponse.status()).toBe(200);
  const verificationBody = (await verificationResponse.json()) as {
    result: {
      observation: Observation;
      verification: {
        ownerLookup: string;
        verifiedById: string;
        verifiedAt: string;
        latitude: number | string;
        longitude: number | string;
        evidenceIds: string[];
      };
    };
  };
  expect(verificationBody.result.verification).toMatchObject({
    ownerLookup: expect.stringContaining(`ownerLookup-${suffix}`),
    verifiedById: expect.any(String),
    latitude: expect.anything(),
    longitude: expect.anything(),
    evidenceIds: [evidenceBody.evidence.id],
  });
  expect(Number(verificationBody.result.verification.latitude)).toBe(20.962);
  expect(Number(verificationBody.result.verification.longitude)).toBe(105.932);
  expect(
    Date.parse(verificationBody.result.verification.verifiedAt),
  ).not.toBeNaN();
  expect(verificationBody.result.observation.id).toBe(observationId);
  expect(verificationBody.result.observation.plate).toBe(
    beforeVerification.plate,
  );
  expect(verificationBody.result.observation.observedAt).toBe(
    beforeVerification.observedAt,
  );
  expect(Number(verificationBody.result.observation.latitude)).toBe(
    Number(beforeVerification.latitude),
  );
  await expect(page.getByText('Đã ghi nhận xác minh.')).toBeVisible();
  await expect(page.getByText(/ownerLookup-/)).toBeVisible();

  const unitsResponse = await page.request.get(
    '/api/identity/organization-units',
  );
  expect(unitsResponse.ok()).toBe(true);
  const units = (await unitsResponse.json()) as {
    organizationUnits: Array<{ id: string }>;
  };
  const targetUnit = units.organizationUnits.find(
    (unit) => unit.id === 'unit-nghia-tru',
  );
  expect(targetUnit).toBeTruthy();
  const escalationResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/vehicles/observations/${observationId}`) &&
      response.request().method() === 'POST',
  );
  const escalationInput = page.locator('#vehicle-escalation-organization');
  if (
    (await escalationInput.evaluate((element) => element.tagName)) === 'SELECT'
  ) {
    await escalationInput.selectOption(targetUnit!.id);
  } else {
    await escalationInput.fill(targetUnit!.id);
  }
  await page.getByRole('button', { name: 'Chuyển đơn vị' }).click();
  const escalationResponse = await escalationResponsePromise;
  expect(escalationResponse.status()).toBe(200);
  await expect(
    page.getByText('Đã chuyển quan sát tới OrganizationUnit.'),
  ).toBeVisible();
  await expect(
    page.getByText('Đã chuyển đơn vị', { exact: true }),
  ).toBeVisible();
  const repeatedEscalation = await page.request.post(
    `/api/vehicles/observations/${observationId}`,
    { data: { command: 'escalate', organizationId: targetUnit!.id } },
  );
  expect(repeatedEscalation.status()).toBe(200);
  expect(
    ((await repeatedEscalation.json()) as { observation: Observation })
      .observation.id,
  ).toBe(observationId);

  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto(`/field/vehicles/${observationId}`);
  await expect(page.getByText(plate, { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Xác nhận match' }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lưu xác minh' })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Chuyển đơn vị' })).toHaveCount(
    0,
  );
  await logout(page);
  await loginAs(page, FIELD);

  const staleOffline = await page.request.post('/api/sync', {
    data: {
      clientCommandId: `stale-${suffix}`,
      commandType: 'vehicle.record_observation',
      resourceType: 'VehicleObservation',
      resourceId: observationId,
      occurredAt: new Date().toISOString(),
      payload: {
        plate: `77C${suffix.slice(-5)}`,
        observedAt: new Date().toISOString(),
        latitude: 20.9,
        longitude: 105.8,
      },
      payloadVersion: 1,
      baseVersion: beforeVerification.version,
    },
  });
  expect(staleOffline.status()).toBe(409);
  expect((await staleOffline.json()) as { error: string }).toMatchObject({
    error: 'STALE_OFFLINE_COMMAND',
  });

  await logout(page);
  await loginAs(page, UNASSIGNED);
  const deniedEvidenceRead = await page.request.get(
    `/api/evidence?evidenceId=${evidenceBody.evidence.id}`,
  );
  expect(deniedEvidenceRead.status()).toBe(403);
  const deniedEvidenceWrite = await page.request.post('/api/evidence', {
    multipart: {
      file: {
        name: 'unauthorized.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      },
      resourceType: 'VehicleObservation',
      resourceId: observationId,
      capturedAt: new Date().toISOString(),
      latitude: '20.962',
      longitude: '105.932',
    },
  });
  expect(deniedEvidenceWrite.status()).toBe(403);
});

test('vehicle offline queue is honest, duplicate client IDs are idempotent, and access is scoped', async ({
  page,
}) => {
  test.setTimeout(120000);
  const suffix = marker('queue');
  const plate = `77C${Math.floor(Math.random() * 90000 + 10000)}`;
  await loginAs(page, FIELD);
  await page.goto('/field/vehicles');
  await page.context().setOffline(true);
  await expect(
    page.getByText('Offline: quan sát sẽ được lưu cục bộ'),
  ).toBeVisible();
  await page.getByLabel('Biển số').fill(plate);
  await page.getByLabel('Vĩ độ').fill('20.9');
  await page.getByLabel('Kinh độ').fill('105.8');
  await page.getByRole('button', { name: 'Ghi nhận phương tiện' }).click();
  await expect(page.getByText(/Đã lưu cục bộ, chờ đồng bộ/)).toBeVisible();
  await page.context().setOffline(false);
  await page.goto('/field/offline');
  await expect(page.getByTestId('queue-pending-count')).toHaveText('0');
  await expect(page.getByTestId('queue-synced-count')).not.toHaveText('0');

  await page.goto('/field/vehicles');
  await page.route('**/api/sync', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'PS009_DETERMINISTIC_SYNC_FAILURE' }),
      });
      return;
    }
    await route.continue();
  });
  await page
    .getByLabel('Biển số')
    .fill(`55E${Math.floor(Math.random() * 90000 + 10000)}`);
  await page.getByLabel('Vĩ độ').fill('20.91');
  await page.getByLabel('Kinh độ').fill('105.81');
  await page.getByRole('button', { name: 'Ghi nhận phương tiện' }).click();
  await expect(
    page.getByText('PS009_DETERMINISTIC_SYNC_FAILURE', { exact: true }),
  ).toBeVisible();
  await page.goto('/field/offline');
  await expect(page.getByTestId('queue-failed-count')).not.toHaveText('0');
  await page.unroute('**/api/sync');

  const clientCommandId = `idem-${suffix}`;
  const payload = {
    clientCommandId,
    commandType: 'vehicle.record_observation',
    resourceType: 'VehicleObservation',
    occurredAt: new Date().toISOString(),
    payload: {
      plate: `66D${Math.floor(Math.random() * 90000 + 10000)}`,
      observedAt: new Date().toISOString(),
      latitude: 20.91,
      longitude: 105.81,
    },
    payloadVersion: 1,
  };
  const first = await page.request.post('/api/sync', { data: payload });
  const second = await page.request.post('/api/sync', { data: payload });
  expect(first.status()).toBe(200);
  expect(second.status()).toBe(200);
  const firstCommand = (await first.json()) as {
    command: { id: string; status: string };
  };
  const secondCommand = (await second.json()) as {
    command: { id: string; status: string };
  };
  expect(secondCommand.command).toMatchObject({
    id: firstCommand.command.id,
    status: 'synced',
  });

  const observationId = (
    firstCommand as typeof firstCommand & {
      command: { response?: { result?: { observationId?: string } } };
    }
  ).command.response?.result?.observationId;
  expect(observationId).toBeTruthy();
  await logout(page);
  await loginAs(page, UNASSIGNED);
  await page.goto(`/field/vehicles/${observationId}`);
  await expect(page.getByText(/Không có quyền xem quan sát/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Xác nhận match' }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lưu xác minh' })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Chuyển đơn vị' })).toHaveCount(
    0,
  );
  const deniedRead = await page.request.get(
    `/api/vehicles/observations/${observationId}`,
  );
  expect(deniedRead.status()).toBe(403);
  const deniedWrite = await page.request.post(
    `/api/vehicles/observations/${observationId}`,
    {
      data: { command: 'verify', result: 'tampered', notes: 'tampered' },
    },
  );
  expect(deniedWrite.status()).toBe(403);
});

test('mock adapter remains deterministic and manual input stays available', async ({
  page,
}) => {
  await page.goto('/field/vehicles');
  await expect(page.getByLabel('Biển số')).toBeVisible();
  await expect(page.getByText(/luôn nhập tay được/)).toBeVisible();
});
