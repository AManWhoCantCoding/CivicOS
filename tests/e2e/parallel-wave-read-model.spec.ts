import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PASSWORD = 'civicos-dev';
const COMMANDER = 'truong@civicos.local';
const DUTY = 'trucban@civicos.local';
const FIELD = 'hientruong@civicos.local';

function persistHttpSnapshot(fields: Record<string, unknown>): void {
  const path =
    process.env.CIVICOS_E2E_HTTP_TRACE_FILE ??
    resolve(
      process.cwd(),
      '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-http.jsonl',
    );
  try {
    appendFileSync(
      path,
      `${JSON.stringify({
        recordedAt: new Date().toISOString(),
        runId:
          process.env.CIVICOS_E2E_TRACE_RUN_ID ??
          'playwright-http-trace-fallback',
        ...fields,
      })}\n`,
      'utf8',
    );
  } catch {
    return;
  }
}

async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');
}

async function logout(page: Page): Promise<void> {
  await page.request.delete('/api/auth/session');
}

async function createConvertedIncidentViaApi(
  page: Page,
  content: string,
): Promise<{ reportId: string; incidentId: string }> {
  const created = await page.request.post('/api/intake-reports', {
    data: {
      sourceChannel: 'direct',
      receivedAt: new Date().toISOString(),
      content,
    },
  });
  expect(created.status()).toBe(201);
  const createdBody = (await created.json()) as {
    reportId: string;
    incidentId: string | null;
  };
  expect(createdBody.incidentId).toBeNull();
  const verified = await page.request.post(
    `/api/intake-reports/${createdBody.reportId}/commands`,
    { data: { command: 'verify', classification: 'sufficient' } },
  );
  expect(verified.ok()).toBe(true);
  const confirmed = await page.request.post(
    `/api/intake-reports/${createdBody.reportId}/commands`,
    { data: { command: 'confirm' } },
  );
  expect(confirmed.ok()).toBe(true);
  const converted = await page.request.post(
    `/api/intake-reports/${createdBody.reportId}/commands`,
    { data: { command: 'convert_to_incident' } },
  );
  expect(converted.ok()).toBe(true);
  const convertedBody = (await converted.json()) as { incidentId: string };
  expect(convertedBody.incidentId).toBeTruthy();
  return {
    reportId: createdBody.reportId,
    incidentId: convertedBody.incidentId,
  };
}

async function waitForReadModel(
  page: Page,
  url: string,
  isReady: (body: unknown) => boolean,
  targetId: string,
): Promise<void> {
  const startedAt = Date.now();
  let midpointCaptured = false;
  let snapshotIndex = 0;
  const snapshot = async (label: string): Promise<void> => {
    const [targetResponse, healthResponse] = await Promise.all([
      page.request.get(url),
      page.request.get('/api/health/worker'),
    ]);
    const targetBody = await targetResponse.json().catch(() => null);
    const healthBody = await healthResponse.json().catch(() => null);
    const arrays =
      targetBody && typeof targetBody === 'object'
        ? Object.fromEntries(
            Object.entries(targetBody as Record<string, unknown>)
              .filter((entry): entry is [string, unknown[]] =>
                Array.isArray(entry[1]),
              )
              .map(([key, value]) => [key, { count: value.length }]),
          )
        : {};
    await test.info().attach(`read-model-${++snapshotIndex}-${label}`, {
      body: Buffer.from(
        JSON.stringify({
          target: {
            url,
            status: targetResponse.status(),
            keys:
              targetBody && typeof targetBody === 'object'
                ? Object.keys(targetBody as Record<string, unknown>)
                : [],
            arrays,
            targetIdPresent:
              typeof targetBody === 'object' && targetBody !== null
                ? JSON.stringify(targetBody).includes(targetId)
                : false,
          },
          worker: {
            status: healthResponse.status(),
            ...(healthBody && typeof healthBody === 'object'
              ? Object.fromEntries(
                  Object.entries(healthBody as Record<string, unknown>).filter(
                    ([key]) =>
                      key.endsWith('Count') ||
                      key === 'oldestPendingAgeMs' ||
                      key === 'projectionLagMs' ||
                      key === 'projectionStatus',
                  ),
                )
              : {}),
          },
        }),
      ),
      contentType: 'application/json',
    });
    persistHttpSnapshot({
      kind: 'http-snapshot',
      testTitle: test.info().title,
      label,
      url,
      targetId,
      target: {
        status: targetResponse.status(),
        keys:
          targetBody && typeof targetBody === 'object'
            ? Object.keys(targetBody as Record<string, unknown>)
            : [],
        arrays,
        targetIdPresent:
          typeof targetBody === 'object' && targetBody !== null
            ? JSON.stringify(targetBody).includes(targetId)
            : false,
      },
      worker: {
        status: healthResponse.status(),
        ...(healthBody && typeof healthBody === 'object'
          ? Object.fromEntries(
              Object.entries(healthBody as Record<string, unknown>).filter(
                ([key]) =>
                  key.endsWith('Count') ||
                  key === 'oldestPendingAgeMs' ||
                  key === 'projectionLagMs' ||
                  key === 'projectionStatus',
              ),
            )
          : {}),
      },
    });
  };

  await snapshot('start');
  try {
    await expect
      .poll(
        async () => {
          if (!midpointCaptured && Date.now() - startedAt >= 45000) {
            midpointCaptured = true;
            await snapshot('midpoint');
          }
          const response = await page.request.get(url);
          if (!response.ok()) return false;
          return isReady(await response.json());
        },
        { timeout: 90000 },
      )
      .toBe(true);
  } catch (error) {
    await snapshot('timeout');
    throw error;
  }
}

function isoLocal(date: Date): string {
  return date.toISOString().slice(0, 16);
}

test('[Web] intake created on the intake page needs no incident yet', async ({
  page,
}) => {
  test.setTimeout(180000);
  const content = `Read model intake ${randomUUID()}`;
  await loginAs(page, DUTY);
  await page.goto('/intake');
  await page.getByLabel('Nội dung tin báo').fill(content);
  const createPromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/intake-reports') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Ghi nhận tin báo' }).click();
  const created = await createPromise;
  expect(created.status()).toBe(201);
  await page.waitForURL(/\/intake\/.+/);
  const reportId = page.url().split('/intake/')[1] ?? '';
  expect(reportId).toBeTruthy();
  await expect(
    page.getByRole('button', { name: 'Lưu xác minh (không tạo Incident)' }),
  ).toBeVisible();
  await logout(page);
});

test('[Web] converted intake appears in the incident list read model', async ({
  page,
}) => {
  test.setTimeout(180000);
  const content = `Read model intake ${randomUUID()}`;
  await loginAs(page, DUTY);
  const { incidentId } = await createConvertedIncidentViaApi(page, content);
  await logout(page);
  await loginAs(page, COMMANDER);
  const direct = await page.request.get(`/api/incidents/${incidentId}`);
  expect(direct.ok()).toBe(true);
  await waitForReadModel(
    page,
    '/api/incidents',
    (body) =>
      ((body as { incidents?: Array<{ id: string }> }).incidents ?? []).some(
        (entry) => entry.id === incidentId,
      ),
    incidentId,
  );

  await page.goto('/incidents');
  const listPromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/incidents') &&
      response.request().method() === 'GET',
  );
  await page.goto('/incidents');
  const listed = await listPromise;
  expect(listed.status()).toBe(200);
  await expect(page.getByText(content).first()).toBeVisible({
    timeout: 15000,
  });
  await logout(page);
});

test('[Web] converted intake appears in the incident detail', async ({
  page,
}) => {
  test.setTimeout(180000);
  const content = `Read model intake ${randomUUID()}`;
  await loginAs(page, DUTY);
  const { incidentId } = await createConvertedIncidentViaApi(page, content);
  await logout(page);

  await loginAs(page, COMMANDER);
  await waitForReadModel(
    page,
    '/api/incidents',
    (body) =>
      ((body as { incidents?: Array<{ id: string }> }).incidents ?? []).some(
        (entry) => entry.id === incidentId,
      ),
    incidentId,
  );

  await page.goto(`/incidents/${incidentId}`);
  const detailPromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/incidents/${incidentId}`) &&
      response.request().method() === 'GET',
  );
  await page.goto(`/incidents/${incidentId}`);
  const detail = await detailPromise;
  expect(detail.status()).toBe(200);
  await expect(page.getByText('Timeline', { exact: true })).toBeVisible();
  await expect(page.getByText(content).first()).toBeVisible();
  await logout(page);
});

test('establishment and inspection created in UI appear in catalog and detail read model', async ({
  page,
}) => {
  test.setTimeout(180000);
  const marker = randomUUID();
  const establishmentName = `Read model cơ sở ${marker}`;
  await loginAs(page, COMMANDER);
  await page.goto('/inspections/establishments');
  await page.getByLabel('Tên cơ sở').fill(establishmentName);
  await page.getByLabel('Chủ cơ sở').fill(`Chủ read model ${marker}`);
  await page.getByLabel('Địa chỉ').fill(`Địa chỉ read model ${marker}`);
  await page.getByLabel('Loại hình', { exact: true }).fill('Karaoke');
  await page.getByLabel(/Mã giấy phép/).fill(`GP-RM-${marker.slice(0, 8)}`);
  const establishmentPromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/establishments') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Tạo cơ sở' }).click();
  const establishmentResponse = await establishmentPromise;
  expect(establishmentResponse.status()).toBe(201);
  const establishmentBody = (await establishmentResponse.json()) as {
    establishment: { id: string };
  };
  const establishmentId = establishmentBody.establishment.id;
  expect(establishmentId).toBeTruthy();
  const establishmentDirect = await page.request.get(
    `/api/establishments/${establishmentId}`,
  );
  expect(establishmentDirect.ok()).toBe(true);
  await expect(page.getByText('Đã tạo cơ sở.')).toBeVisible();
  await waitForReadModel(
    page,
    '/api/establishments',
    (body) =>
      (
        (body as { establishments?: Array<{ id: string }> }).establishments ??
        []
      ).some((entry) => entry.id === establishmentId),
    establishmentId,
  );

  await page.goto('/inspections/establishments');
  const catalogPromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/establishments') &&
      response.request().method() === 'GET',
  );
  await page.goto('/inspections/establishments');
  const catalog = await catalogPromise;
  expect(catalog.status()).toBe(200);
  await expect(page.getByText(establishmentName).first()).toBeVisible({
    timeout: 15000,
  });

  await page.goto(`/inspections/establishments/${establishmentId}`);
  await expect(
    page.getByRole('heading', { name: establishmentName }),
  ).toBeVisible();
  await page.getByLabel('Thời gian kiểm tra').fill('2030-03-15T10:00');
  const inspectionPromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/inspections') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Tạo lịch kiểm tra' }).click();
  const inspectionResponse = await inspectionPromise;
  expect(inspectionResponse.status()).toBe(201);
  const inspectionBody = (await inspectionResponse.json()) as {
    inspection: { id: string };
  };
  const inspectionId = inspectionBody.inspection.id;
  expect(inspectionId).toBeTruthy();
  const inspectionDirect = await page.request.get(
    `/api/inspections/${inspectionId}`,
  );
  expect(inspectionDirect.ok()).toBe(true);

  await page.goto(`/inspections/${inspectionId}`);
  const detailPromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/inspections/${inspectionId}`) &&
      response.request().method() === 'GET',
  );
  await page.goto(`/inspections/${inspectionId}`);
  const detail = await detailPromise;
  expect(detail.status()).toBe(200);
  await expect(
    page.getByText('Inspection', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByTestId('inspection-status')).toBeVisible();
  await logout(page);
});

test('registry entry and vehicle observation created in UI appear in read model views', async ({
  page,
}) => {
  test.setTimeout(180000);
  const suffix = randomUUID().slice(0, 8);
  const plate = `89A${Math.floor(Math.random() * 90000 + 10000)}`;
  const now = new Date();
  await loginAs(page, COMMANDER);
  await page.goto('/vehicles/registry');
  const registryForm = page.locator('form').filter({
    has: page.getByRole('heading', { name: 'Thêm vào registry' }),
  });
  await registryForm.getByLabel('Biển số').fill(plate);
  await registryForm.getByLabel('Nguồn').fill(`Nguồn read model ${suffix}`);
  await registryForm.getByLabel('Lý do').fill(`Lý do read model ${suffix}`);
  await registryForm
    .getByLabel('Có hiệu lực từ')
    .fill(isoLocal(new Date(now.getTime() - 3600000)));
  await registryForm
    .getByLabel('Hết hạn')
    .fill(isoLocal(new Date(now.getTime() + 86400000)));
  const registryPromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/vehicles/registry') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Thêm registry' }).click();
  const registryResponse = await registryPromise;
  expect(registryResponse.status()).toBe(201);
  await expect(page.getByText('Đã thêm biển số vào registry.')).toBeVisible();
  await waitForReadModel(
    page,
    '/api/vehicles/registry',
    (body) =>
      ((body as { registry?: Array<{ plate: string }> }).registry ?? []).some(
        (entry) => entry.plate === plate,
      ),
    plate,
  );

  const registryListPromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/vehicles/registry') &&
      response.request().method() === 'GET',
  );
  await page.goto('/vehicles/registry');
  const registryList = await registryListPromise;
  expect(registryList.status()).toBe(200);
  await expect(page.getByText(plate).first()).toBeVisible({ timeout: 15000 });
  await logout(page);

  await loginAs(page, FIELD);
  await page.goto('/field/vehicles');
  await page.getByLabel('Biển số').fill(plate);
  await page.getByLabel('Vĩ độ').fill('20.961');
  await page.getByLabel('Kinh độ').fill('105.931');
  await page.getByLabel('Mô tả').fill(`Quan sát read model ${suffix}`);
  const observationPromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/sync') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Ghi nhận phương tiện' }).click();
  const observationResponse = await observationPromise;
  expect(observationResponse.status()).toBe(200);
  await expect(
    page.getByRole('link', { name: 'Mở chi tiết quan sát →' }),
  ).toBeVisible();
  const observationCommand = (await observationResponse.json()) as {
    command: { response: { result: { observationId: string } } };
  };
  const observationId =
    observationCommand.command.response.result.observationId;
  expect(observationId).toBeTruthy();

  await page.getByRole('link', { name: 'Mở chi tiết quan sát →' }).click();
  await page.waitForURL(`/field/vehicles/${observationId}`);
  await expect(page.getByText(plate).first()).toBeVisible();
  await expect(
    page.getByText(`Quan sát read model ${suffix}`).first(),
  ).toBeVisible();
  await waitForReadModel(
    page,
    '/api/vehicles/observations',
    (body) =>
      (
        (body as { observations?: Array<{ plate: string }> }).observations ?? []
      ).some((entry) => entry.plate === plate),
    plate,
  );

  const observationListPromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/vehicles/observations') &&
      response.request().method() === 'GET',
  );
  await page.goto('/field/vehicles');
  const observationList = await observationListPromise;
  expect(observationList.status()).toBe(200);
  await expect(page.getByText(plate).first()).toBeVisible({ timeout: 15000 });
  await logout(page);
});
