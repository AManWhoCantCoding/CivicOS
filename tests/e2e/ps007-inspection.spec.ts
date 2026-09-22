import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const PASSWORD = 'civicos-dev';
const COMMANDER = 'truong@civicos.local';
const FIELD = 'hientruong@civicos.local';
const UNASSIGNED = 'khongduocphancong@civicos.local';

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
      type: 'Karaoke',
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
      cadenceMonths: 3,
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
  await page.getByLabel('Loại hình').fill('Karaoke');
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
  await page.getByLabel('Chu kỳ').selectOption('3');
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
  await page.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click();
  await expect(page.getByText('Đã bắt đầu inspection.')).toBeVisible();
  await expect(page.getByTestId('inspection-status')).toHaveText(
    'Đang kiểm tra',
  );

  const checklist = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Checklist' }) });
  await checklist.getByRole('textbox').nth(0).fill(`Hồ sơ hợp lệ ${marker}`);
  await checklist.getByRole('textbox').nth(1).fill(`An ninh đạt ${marker}`);
  await page.getByRole('button', { name: 'Lưu checklist' }).click();
  await expect(page.getByText('Đã lưu checklist.')).toBeVisible();

  await page.getByLabel('Chọn ảnh bằng chứng').setInputFiles({
    name: 'ps007-evidence.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x50, 0x53, 0xff, 0xd9]),
  });
  await expect(
    page.getByText('Đã tải ps007-evidence.jpg lên máy chủ.'),
  ).toBeVisible();
  await expect(
    page.getByText('Đã gắn 1 bằng chứng vào phát hiện mới.'),
  ).toBeVisible();

  await page.locator('#inspection-finding-checklist').selectOption('license');
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
    .getByRole('checkbox', { name: /license/ })
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
      response.url().endsWith('/api/sync') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Hoàn tất' }).click();
  const completeResponse = await completeResponsePromise;
  expect(completeResponse.ok()).toBe(true);
  const completeBody = (await completeResponse.json()) as {
    command?: { status?: string };
  };
  expect(completeBody.command?.status).toBe('synced');
  await expect(page.getByText('Đã hoàn tất inspection.')).toBeVisible();
  await expect(page.getByTestId('inspection-status')).toHaveText('Đã hoàn tất');

  await expect(page.getByText('approved', { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      /Xử phạt|Quyết định xử phạt|Kết luận.*pháp lý|vi phạm hành chính/i,
    ),
  ).toHaveCount(0);
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
