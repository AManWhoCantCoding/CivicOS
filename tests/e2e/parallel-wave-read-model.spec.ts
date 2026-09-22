import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const PASSWORD = 'civicos-dev';
const COMMANDER = 'truong@civicos.local';
const DUTY = 'trucban@civicos.local';
const FIELD = 'hientruong@civicos.local';

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

/** Poll a JSON list endpoint until the created read model is served. */
async function waitForReadModel(
  page: Page,
  url: string,
  isReady: (body: unknown) => boolean,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await page.request.get(url);
        if (!response.ok()) return false;
        return isReady(await response.json());
      },
      { timeout: 90000 },
    )
    .toBe(true);
}

function isoLocal(date: Date): string {
  return date.toISOString().slice(0, 16);
}

test('intake report created in UI appears in incident list and detail read model', async ({
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
  await page.getByRole('button', { name: 'Tạo Incident' }).click();
  const created = await createPromise;
  expect(created.status()).toBe(201);
  await page.waitForURL(/\/incidents\/.+/);
  const incidentId = page.url().split('/incidents/')[1] ?? '';
  expect(incidentId).toBeTruthy();
  await logout(page);

  await loginAs(page, COMMANDER);
  await waitForReadModel(page, '/api/incidents', (body) =>
    ((body as { incidents?: Array<{ id: string }> }).incidents ?? []).some(
      (entry) => entry.id === incidentId,
    ),
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
  await page.getByLabel('Loại hình').fill('Karaoke');
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
  await expect(page.getByText('Đã tạo cơ sở.')).toBeVisible();
  await waitForReadModel(page, '/api/establishments', (body) =>
    (
      (body as { establishments?: Array<{ id: string }> }).establishments ?? []
    ).some((entry) => entry.id === establishmentId),
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
  await page.getByLabel('Chu kỳ').selectOption('3');
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
  await page.getByLabel('Biển số').fill(plate);
  await page.getByLabel('Nguồn').fill(`Nguồn read model ${suffix}`);
  await page.getByLabel('Lý do').fill(`Lý do read model ${suffix}`);
  await page
    .getByLabel('Có hiệu lực từ')
    .fill(isoLocal(new Date(now.getTime() - 3600000)));
  await page
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
  await waitForReadModel(page, '/api/vehicles/registry', (body) =>
    ((body as { registry?: Array<{ plate: string }> }).registry ?? []).some(
      (entry) => entry.plate === plate,
    ),
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
  await waitForReadModel(page, '/api/vehicles/observations', (body) =>
    (
      (body as { observations?: Array<{ plate: string }> }).observations ?? []
    ).some((entry) => entry.plate === plate),
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
