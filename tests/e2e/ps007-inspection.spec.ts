import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const RUN_ID = process.env.CIVICOS_E2E_RUN_ID!;
const PASSWORD = process.env.CIVICOS_E2E_FIXTURE_PASSWORD!;
const COMMANDER = `ps007-e2e-${RUN_ID}-commander@example.test`;
const FIELD = `ps007-e2e-${RUN_ID}-field@example.test`;
const UNASSIGNED = `ps007-e2e-${RUN_ID}-unassigned@example.test`;
const KARAOKE_TYPE = 'Karaoke — Đ3 khoản 21(a)';

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

function uniqueMarker(prefix: string): string {
  return `${prefix} ${randomUUID()}`;
}

async function createEstablishmentViaApi(
  page: Page,
  marker: string,
): Promise<{ id: string; name: string }> {
  const name = `Cơ sở PS007 ${marker}`;
  const response = await page.request.post('/api/establishments', {
    data: {
      name,
      ownerName: `Chủ PS007 ${marker}`,
      address: `Địa chỉ PS007 ${marker}`,
      type: KARAOKE_TYPE,
      licenseRef: `GP-PS007-${marker}`,
    },
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as {
    establishment: { id: string; name: string };
  };
  expect(typeof body.establishment.id).toBe('string');
  return { id: body.establishment.id, name };
}

async function scheduleInspectionViaApi(
  page: Page,
  establishmentId: string,
): Promise<string> {
  const directoryResponse = await page.request.get('/api/identity/users');
  expect(directoryResponse.ok()).toBe(true);
  const directory = (await directoryResponse.json()) as {
    users: Array<{ id: string; email: string }>;
  };
  const fieldUser = directory.users.find(({ email }) => email === FIELD);
  expect(fieldUser).toBeDefined();
  const response = await page.request.post('/api/inspections', {
    data: {
      establishmentId,
      scheduledAt: '2030-01-15T10:00:00.000Z',
      assignedUserId: fieldUser!.id,
    },
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { inspection: { id: string } };
  expect(typeof body.inspection.id).toBe('string');
  return body.inspection.id;
}

async function setupStartedInspection(page: Page): Promise<string> {
  const marker = uniqueMarker('setup');
  const establishment = await createEstablishmentViaApi(page, marker);
  const inspectionId = await scheduleInspectionViaApi(page, establishment.id);
  await logout(page);
  await loginAs(page, FIELD);
  const started = await page.request.post(`/api/inspections/${inspectionId}`, {
    data: { command: 'start' },
  });
  expect(started.ok()).toBe(true);
  return inspectionId;
}

test('inspection catalog exposes a clear empty state', async ({ page }) => {
  await page.goto('/inspections/establishments');
  await expect(
    page.getByRole('heading', { name: 'Cơ sở kinh doanh', exact: true }),
  ).toBeVisible();
});

test('establishment-to-approval lifecycle runs through the browser without automatic sanction', async ({
  page,
}) => {
  // Cold Next/Prisma startup is measured by the fixture readiness timeout;
  // this margin covers only the browser workflow, not a hidden CLI override.
  test.setTimeout(180000);
  const marker = uniqueMarker('flow');
  const establishmentName = `Cơ sở PS007 ${marker}`;
  await loginAs(page, COMMANDER);

  await page.goto('/inspections/establishments');
  await page.getByLabel('Tên cơ sở').fill(establishmentName);
  await page.getByLabel('Chủ cơ sở').fill(`Chủ PS007 ${marker}`);
  await page.getByLabel('Địa chỉ').fill(`Địa chỉ PS007 ${marker}`);
  await page
    .getByRole('combobox', { name: 'Loại hình', exact: true })
    .selectOption(KARAOKE_TYPE);
  await page.getByLabel(/Mã giấy phép/).fill(`GP-PS007-${marker}`);
  const establishmentResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/establishments') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Tạo cơ sở' }).click();
  const establishmentResponse = await establishmentResponsePromise;
  expect(establishmentResponse.status()).toBe(201);
  const establishmentBody = (await establishmentResponse.json()) as {
    establishment?: { id?: string; name?: string };
  };
  const establishmentId = establishmentBody.establishment?.id;
  expect(establishmentId).toBeTruthy();
  await expect(page.getByText('Đã tạo cơ sở.')).toBeVisible();
  await page.goto(`/inspections/establishments/${establishmentId}`);
  await expect(
    page.getByRole('heading', { name: establishmentName }),
  ).toBeVisible();
  const fieldDirectory = await page.request.get('/api/identity/users');
  const fieldUsers = (await fieldDirectory.json()) as {
    users: Array<{ id: string; email: string }>;
  };
  const fieldUser = fieldUsers.users.find(({ email }) => email === FIELD);
  expect(fieldUser).toBeDefined();
  await page.getByLabel('Thời gian kiểm tra').fill('2030-01-15T10:00');
  const assigneeControl = page
    .locator('label')
    .filter({ hasText: 'Người được giao' });
  const assigneeSelect = assigneeControl.locator('select');
  if (await assigneeSelect.count()) {
    await assigneeSelect.selectOption(fieldUser!.id);
  } else {
    await assigneeControl.locator('input').fill(fieldUser!.id);
  }
  const inspectionResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/inspections') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Tạo lịch kiểm tra' }).click();
  const inspectionResponse = await inspectionResponsePromise;
  expect(inspectionResponse.status()).toBe(201);
  const inspectionBody = (await inspectionResponse.json()) as {
    inspection?: { id?: string; establishmentId?: string };
  };
  const inspectionId = inspectionBody.inspection?.id;
  expect(inspectionId).toBeTruthy();
  expect(inspectionBody.inspection?.establishmentId).toBe(establishmentId);
  await expect(page.getByText('Đã lập lịch kiểm tra.')).toBeVisible();

  await logout(page);
  await loginAs(page, FIELD);
  await page.goto(`/inspections/${inspectionId}`);
  await expect(
    page.getByText('Inspection', { exact: true }).first(),
  ).toBeVisible();
  const databaseUrl = new URL(process.env.DEMO_DATABASE_URL!);
  expect(databaseUrl.hostname).toBe('127.0.0.1');
  expect(databaseUrl.port).toBe('5433');
  expect(databaseUrl.pathname).toBe('/civicos_demo');
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl.toString() } },
  });
  try {
    const identity = await prisma.$queryRaw<
      Array<{ database: string; port: number; address: string | null }>
    >`SELECT current_database() AS database, (SELECT setting::int FROM pg_settings WHERE name = 'port') AS port, inet_server_addr()::text AS address`;
    expect(identity).toEqual([
      { database: 'civicos_demo', port: 5432, address: expect.any(String) },
    ]);
    const where = {
      resourceType: 'Inspection',
      resourceId: inspectionId,
      operation: 'inspection.read',
      actorId: fieldUser!.id,
    };
    const before = await prisma.auditEvent.count({ where });
    const detailResponse = await page.request.get(
      `/api/inspections/${inspectionId}`,
    );
    expect(detailResponse.status()).toBe(200);
    expect((await detailResponse.json()).inspection.id).toBe(inspectionId);
    expect(await prisma.auditEvent.count({ where })).toBeGreaterThan(before);
  } finally {
    await prisma.$disconnect();
  }
  await page.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click();
  await expect(page.getByText('Đã bắt đầu inspection.')).toBeVisible();
  await expect(page.getByTestId('inspection-status')).toHaveText(
    'Đang kiểm tra',
  );

  const checklist = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Checklist' }) });
  await checklist.getByRole('textbox').nth(0).fill(`Hồ sơ hợp lệ ${marker}`);
  await checklist.getByRole('textbox').nth(1).fill(`Nội quy karaoke ${marker}`);
  await page.getByRole('button', { name: 'Lưu checklist' }).click();
  await expect(page.getByText('Đã lưu checklist.')).toBeVisible();

  await page.context().grantPermissions(['geolocation'], {
    origin: new URL(page.url()).origin,
  });
  await page.context().setGeolocation({
    latitude: 10.12345,
    longitude: 106.54321,
  });
  const evidenceResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/evidence') &&
      response.request().method() === 'POST',
  );
  await page.getByLabel('Chọn ảnh bằng chứng').setInputFiles({
    name: 'ps007-evidence.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x50, 0x53, 0xff, 0xd9]),
  });
  const evidenceResponse = await evidenceResponsePromise;
  expect(evidenceResponse.status()).toBe(201);
  const evidenceBody = (await evidenceResponse.json()) as {
    evidence?: { latitude?: number; longitude?: number };
  };
  expect(String(evidenceBody.evidence?.latitude)).toBe('10.12345');
  expect(String(evidenceBody.evidence?.longitude)).toBe('106.54321');
  await expect(page.getByText('GPS: 10.12345, 106.54321')).toBeVisible();
  await expect(
    page.getByText('Đã tải ps007-evidence.jpg lên máy chủ.'),
  ).toBeVisible();
  await expect(
    page.getByText('Đã gắn 1 bằng chứng vào phát hiện mới.'),
  ).toBeVisible();

  await page
    .locator('#inspection-finding-checklist')
    .selectOption('karaoke-house-rules');
  await page
    .getByLabel('Mô tả phát hiện')
    .fill(`Phát hiện PS007 ${marker} cần theo dõi.`);
  await page.locator('#inspection-finding-result').selectOption('needs_action');
  await page.getByRole('button', { name: 'Lưu phát hiện' }).click();
  await expect(page.getByText('Đã ghi phát hiện.')).toBeVisible();
  await expect(
    page.getByText(`Phát hiện PS007 ${marker} cần theo dõi.`, { exact: true }),
  ).toBeVisible();

  await page
    .getByRole('checkbox', { name: /karaoke-house-rules/ })
    .first()
    .check();
  await page.getByLabel('Hành động đề xuất').fill('Theo dõi bổ sung');
  await page
    .getByLabel('Lý do')
    .fill(`Cần phê duyệt trước khi hoàn tất ${marker}.`);
  await page.getByRole('button', { name: 'Gửi đề xuất' }).click();
  await expect(page.getByText('Đã gửi đề xuất, chờ phê duyệt.')).toBeVisible();
  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto(`/inspections/${inspectionId}`);
  await page.getByRole('button', { name: 'Duyệt' }).click();
  await expect(page.getByText('Đã duyệt đề xuất.')).toBeVisible();

  await logout(page);
  await loginAs(page, FIELD);
  await page.goto(`/inspections/${inspectionId}`);

  await page
    .locator('#inspection-complete-result')
    .selectOption('needs_action');
  const completeResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/inspections/${inspectionId}/commands`) &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Hoàn tất' }).click();
  const completeResponse = await completeResponsePromise;
  expect(completeResponse.ok()).toBe(true);
  const completeBody = (await completeResponse.json()) as {
    inspection?: { status?: string };
  };
  expect(completeBody.inspection?.status).toBe('completed');
  await expect(page.getByText('Đã hoàn tất inspection.')).toBeVisible();
  await expect(page.getByTestId('inspection-status')).toHaveText('Đã hoàn tất');

  await expect(page.getByText('approved', { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      /Xử phạt|Quyết định xử phạt|Kết luận.*pháp lý|vi phạm hành chính/i,
    ),
  ).toHaveCount(0);

  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto('/inspections/reports');
  await expect(
    page.getByRole('heading', { name: 'Báo cáo inspections' }),
  ).toBeVisible();
  await expect(page.getByLabel('Từ ngày')).toBeVisible();
  await expect(page.getByLabel('Đến ngày')).toBeVisible();
  await expect(page.getByLabel('Loại hình')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Pass rate theo loại hình' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'SLA sản phẩm — 7 ngày lịch / 168 giờ',
    }),
  ).toBeVisible();
  await page.getByLabel('Từ ngày').fill('2030-01-14');
  await page.getByLabel('Đến ngày').fill('2030-01-16');
  const statsResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === '/api/inspections/stats' &&
      url.searchParams.get('establishmentType') === KARAOKE_TYPE &&
      response.request().method() === 'GET'
    );
  });
  await page.getByLabel('Loại hình').selectOption(KARAOKE_TYPE);
  const statsResponse = await statsResponsePromise;
  expect(statsResponse.status()).toBe(200);
  const body = (await statsResponse.json()) as {
    stats: { ratesByType: Record<string, { completed: number }> };
  };
  expect(body.stats.ratesByType[KARAOKE_TYPE].completed).toBeGreaterThan(0);
  const passRateSection = page
    .getByRole('heading', { name: 'Pass rate theo loại hình' })
    .locator('..');
  await expect(passRateSection).toContainText(KARAOKE_TYPE);
  await expect(passRateSection).toContainText(
    /[1-9]\d* inspections đã hoàn tất/,
  );
});

test('unassigned users are denied in UI and at the API boundary', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);
  const marker = uniqueMarker('denied');
  const establishment = await createEstablishmentViaApi(page, marker);
  const inspectionId = await scheduleInspectionViaApi(page, establishment.id);

  await logout(page);
  await loginAs(page, UNASSIGNED);
  await page.goto(`/inspections/${inspectionId}`);
  await expect(page.getByText(/Không có quyền xem inspection:/)).toBeVisible();

  const deniedRead = await page.request.get(`/api/inspections/${inspectionId}`);
  expect(deniedRead.status()).toBe(403);
  const deniedCommand = await page.request.post(
    `/api/inspections/${inspectionId}`,
    { data: { command: 'start' } },
  );
  expect(deniedCommand.status()).toBe(403);
  expect((await deniedCommand.json()) as { error?: string }).toMatchObject({
    error: 'FORBIDDEN',
  });
});

test('offline checklist work is held as pending and confirmed after retry', async ({
  page,
}) => {
  // Offline retry includes the worker round-trip after cold service startup;
  // keep this explicit while fixture readiness remains independently bounded.
  test.setTimeout(120000);
  await loginAs(page, COMMANDER);
  const inspectionId = await setupStartedInspection(page);

  await page.goto(`/inspections/${inspectionId}`);
  await expect(
    page.getByText('Inspection', { exact: true }).first(),
  ).toBeVisible();

  await page.context().setOffline(true);
  await expect(
    page.getByText('Offline: thao tác mới vẫn có thể xếp hàng trên thiết bị.'),
  ).toBeVisible();
  const checklist = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Checklist' }) });
  await checklist
    .getByRole('textbox')
    .nth(0)
    .fill(`Hồ sơ ngoại tuyến ${inspectionId}`);
  await checklist
    .getByRole('textbox')
    .nth(1)
    .fill(`An ninh ngoại tuyến ${inspectionId}`);
  await page.getByRole('button', { name: 'Lưu checklist' }).click();
  await expect(page.getByText(/Đã lưu cục bộ/)).toBeVisible();

  await page.context().setOffline(false);
  await page.goto('/field/offline');
  await page.getByRole('button', { name: 'Đồng bộ ngay' }).click();
  await expect(page.getByTestId('queue-pending-count')).toHaveText('0');
  await expect(page.getByTestId('queue-synced-count')).not.toHaveText('0');

  await page.goto(`/inspections/${inspectionId}`);
  const checklistAfterSync = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Checklist' }) });
  await expect(checklistAfterSync.getByRole('textbox').nth(0)).toHaveValue(
    `Hồ sơ ngoại tuyến ${inspectionId}`,
  );
});

test('inspection command boundary returns exact error shapes', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);
  const inspectionId = await setupStartedInspection(page);

  const unknown = await page.request.post(`/api/inspections/${inspectionId}`, {
    data: { command: 'escalate' },
  });
  expect(unknown.status()).toBe(400);
  expect((await unknown.json()) as { error?: string }).toMatchObject({
    error: 'UNKNOWN_COMMAND',
  });

  const missingApproval = await page.request.post(
    `/api/inspections/${inspectionId}`,
    { data: { command: 'approve', recommendationId: 'no-such-rec' } },
  );
  expect(missingApproval.status()).toBe(403);
  expect((await missingApproval.json()) as { error?: string }).toMatchObject({
    error: 'FORBIDDEN',
  });
});
