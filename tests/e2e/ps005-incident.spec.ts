import { expect, test, type Page } from '@playwright/test';

const RUN_ID = process.env.CIVICOS_E2E_RUN_ID ?? '';
const PASSWORD = process.env.CIVICOS_E2E_FIXTURE_PASSWORD ?? '';
if (!RUN_ID || !PASSWORD) throw new Error('PS005_E2E_FIXTURE_ENV_REQUIRED');
const email = (role: string) => `ps007-e2e-${RUN_ID}-${role}@example.test`;
const COMMANDER = email('commander');
const DUTY = email('duty_officer');
const FIELD = email('field');
const UNASSIGNED = email('unassigned');
const RECEIVING_OU = `ps007-e2e-${RUN_ID}-parent`;

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

async function createRawIntakeViaApi(
  page: Page,
  content: string,
): Promise<string> {
  const response = await page.request.post('/api/intake-reports', {
    headers: {
      'Idempotency-Key': `ps005-raw-${Date.now()}-${Math.random()}`,
    },
    data: {
      sourceChannel: 'direct',
      receivedAt: new Date().toISOString(),
      content,
    },
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as {
    reportId: string;
    incidentId: string | null;
  };
  expect(typeof body.reportId).toBe('string');
  expect(body.incidentId).toBeNull();
  return body.reportId;
}

async function createVerifiedIntakeViaApi(
  page: Page,
  content: string,
): Promise<string> {
  const reportId = await createRawIntakeViaApi(page, content);
  const verified = await page.request.post(
    `/api/intake-reports/${reportId}/commands`,
    { data: { command: 'verify', classification: 'sufficient' } },
  );
  expect(verified.ok()).toBe(true);
  const confirmed = await page.request.post(
    `/api/intake-reports/${reportId}/commands`,
    { data: { command: 'confirm' } },
  );
  expect(confirmed.ok()).toBe(true);
  return reportId;
}

async function createIncidentViaApi(
  page: Page,
  content: string,
): Promise<string> {
  const reportId = await createVerifiedIntakeViaApi(page, content);
  const converted = await page.request.post(
    `/api/intake-reports/${reportId}/commands`,
    { data: { command: 'convert_to_incident' } },
  );
  expect(converted.ok()).toBe(true);
  const convertedBody = (await converted.json()) as { incidentId: string };
  expect(typeof convertedBody.incidentId).toBe('string');
  return convertedBody.incidentId;
}

async function commandViaApi(
  page: Page,
  incidentId: string,
  command: Record<string, unknown>,
) {
  return page.request.post(`/api/incidents/${incidentId}/commands`, {
    data: command,
  });
}

async function userIdByEmail(page: Page, email: string): Promise<string> {
  const usersResponse = await page.request.get('/api/identity/users');
  expect(usersResponse.ok()).toBe(true);
  const usersBody = (await usersResponse.json()) as {
    users: Array<{ id: string; email: string }>;
  };
  const match = usersBody.users.find((entry) => entry.email === email);
  expect(match?.id).toBeTruthy();
  return match?.id ?? '';
}

async function assignViaApi(
  page: Page,
  incidentId: string,
  assigneeUserId: string,
): Promise<void> {
  const assigned = await commandViaApi(page, incidentId, {
    command: 'assign',
    assigneeUserIds: [assigneeUserId],
  });
  expect(assigned.ok()).toBe(true);
}

async function createClassifiedAssignedIncident(
  page: Page,
  content: string,
): Promise<string> {
  const incidentId = await createIncidentViaApi(page, content);
  await assignViaApi(page, incidentId, await userIdByEmail(page, DUTY));
  await logout(page);
  await loginAs(page, DUTY);
  const classified = await commandViaApi(page, incidentId, {
    command: 'classify',
    category: 'public_order',
    severity: 'high',
  });
  expect(classified.ok()).toBe(true);
  await logout(page);
  await loginAs(page, COMMANDER);
  await assignViaApi(page, incidentId, await userIdByEmail(page, FIELD));
  await logout(page);
  await loginAs(page, FIELD);
  return incidentId;
}

async function assignUser(page: Page, emailPattern: RegExp): Promise<void> {
  await page.getByLabel(emailPattern).first().scrollIntoViewIfNeeded();
  await page.getByLabel(emailPattern).check({ force: true });
  await page
    .getByRole('button', { name: 'Gửi phân công' })
    .click({ force: true });
  await expect(page.getByText('Đã gửi phân công.')).toBeVisible();
}

test('[Web] intake page exposes a complete labeled form', async ({ page }) => {
  await page.goto('/intake');
  await expect(
    page.getByRole('heading', { name: 'Ghi nhận tin báo' }),
  ).toBeVisible();
  await expect(page.getByLabel('Nội dung tin báo')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Ghi nhận tin báo' }),
  ).toBeVisible();
});

test('[Web] duty officer creates an intake report without an incident', async ({
  page,
}) => {
  const content = `PS005 E2E ${Date.now()}`;
  await loginAs(page, DUTY);
  await page.goto('/intake');
  await page.getByLabel('Nội dung tin báo').fill(content);
  await page.getByLabel('Tên nguồn tin').fill('Nguyen Van E2E');
  await page.getByRole('button', { name: 'Ghi nhận tin báo' }).click();
  await page.waitForURL(/\/intake\/.+/);
  const reportId = page.url().split('/intake/')[1];
  expect(reportId).toBeTruthy();
  await expect(
    page.getByRole('button', { name: 'Lưu xác minh (không tạo Incident)' }),
  ).toBeVisible();
});

test('[Web] verify action on an intake creates no incident', async ({
  page,
}) => {
  await loginAs(page, DUTY);
  const reportId = await createRawIntakeViaApi(
    page,
    `PS005 verify ${Date.now()}`,
  );
  await page.goto(`/intake/${reportId}`);
  await expect(
    page.getByRole('button', { name: 'Lưu xác minh (không tạo Incident)' }),
  ).toBeVisible();
  await page.getByLabel('Phân loại').selectOption('sufficient');
  await page.getByLabel('Ghi chú xác minh').fill('Da xuong hien truong.');
  await page
    .getByRole('button', { name: 'Lưu xác minh (không tạo Incident)' })
    .click();
  await expect(page.getByText('Đã ghi nhận thao tác.')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Xác nhận hồ sơ' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo Incident' })).toHaveCount(
    0,
  );
});

test('[Web] convert action on a verified intake creates one incident', async ({
  page,
}) => {
  await loginAs(page, DUTY);
  const reportId = await createVerifiedIntakeViaApi(
    page,
    `PS005 convert ${Date.now()}`,
  );
  await page.goto(`/intake/${reportId}`);
  await expect(
    page.getByRole('button', { name: 'Xác nhận hồ sơ' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Tạo Incident' }).click();
  await expect(page.getByText('Đã tạo Incident từ tin báo.')).toBeVisible();
  const incidentHref = await page
    .locator('a[href^="/incidents/"]')
    .first()
    .getAttribute('href');
  const incidentId = incidentHref?.split('/incidents/')[1];
  expect(incidentId).toBeTruthy();
});

test('[Web] commander sees a converted incident and assigns duty', async ({
  page,
}) => {
  const content = `PS005 assign ${Date.now()}`;
  await loginAs(page, DUTY);
  const incidentId = await createIncidentViaApi(page, content);
  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto(`/incidents/${incidentId}`);
  await expect(page.getByText(content)).toBeVisible();
  await assignUser(
    page,
    new RegExp(DUTY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
});

test('[Web] duty officer classifies an assigned incident', async ({ page }) => {
  await loginAs(page, COMMANDER);
  const incidentId = await createIncidentViaApi(
    page,
    `PS005 classify ${Date.now()}`,
  );
  await assignViaApi(page, incidentId, await userIdByEmail(page, DUTY));
  await logout(page);
  await loginAs(page, DUTY);
  await page.goto(`/incidents/${incidentId}`);
  await page.getByLabel('Category').selectOption('public_order');
  await page.getByLabel('Severity').selectOption('high');
  await page.getByRole('button', { name: 'Lưu phân loại' }).click();
  await expect(page.getByText('Đã ghi nhận thao tác.')).toBeVisible();
  await expect(
    page
      .locator('main')
      .getByText(/classified$/)
      .first(),
  ).toBeVisible();
});

test('[Web] field officer verifies and requests a transfer', async ({
  page,
}) => {
  test.setTimeout(120000);
  await loginAs(page, COMMANDER);
  const incidentId = await createClassifiedAssignedIncident(
    page,
    `PS005 transfer ${Date.now()}`,
  );
  await page.goto(`/incidents/${incidentId}`);
  await page.getByLabel('Ghi chú xác minh').fill('Da xuong hien truong.');
  await page.getByRole('button', { name: 'Bắt đầu xác minh' }).click();
  await expect(page.getByText('Đã ghi nhận thao tác.')).toBeVisible();
  await expect(
    page
      .locator('main')
      .getByText(/verifying$/)
      .first(),
  ).toBeVisible();
  await page.getByLabel('Đơn vị nhận').selectOption(RECEIVING_OU);
  await page.getByRole('button', { name: 'Gửi yêu cầu chuyển' }).click();
  await expect(page.getByText('Đã gửi yêu cầu Approval.')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('Approval đang chờ')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Phê duyệt' })).toHaveCount(0);
});

test('[Web] commander approves a transfer request', async ({ page }) => {
  test.setTimeout(120000);
  await loginAs(page, COMMANDER);
  const incidentId = await createClassifiedAssignedIncident(
    page,
    `PS005 approve transfer ${Date.now()}`,
  );
  await page.goto(`/incidents/${incidentId}`);
  await page.getByLabel('Ghi chú xác minh').fill('Da xuong hien truong.');
  await page.getByRole('button', { name: 'Bắt đầu xác minh' }).click();
  await expect(page.getByText('Đã ghi nhận thao tác.')).toBeVisible();
  await page.getByLabel('Đơn vị nhận').selectOption(RECEIVING_OU);
  await page.getByRole('button', { name: 'Gửi yêu cầu chuyển' }).click();
  await expect(page.getByText('Đã gửi yêu cầu Approval.')).toBeVisible({
    timeout: 15000,
  });
  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto(`/incidents/${incidentId}`);
  await expect(
    page
      .locator('section', { hasText: 'Timeline' })
      .getByText('IncidentVerifying', { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Phê duyệt' }).click();
  await expect(
    page
      .locator('main')
      .getByText(/transferred$/)
      .first(),
  ).toBeVisible();
});

test('[Web] field officer proposes a resolution for approval', async ({
  page,
}) => {
  test.setTimeout(120000);
  await loginAs(page, COMMANDER);
  const incidentId = await createClassifiedAssignedIncident(
    page,
    `PS005 resolve ${Date.now()}`,
  );
  await page.goto(`/incidents/${incidentId}`);
  await page.getByLabel('Ghi chú xác minh').fill('Da xuong hien truong.');
  await page.getByRole('button', { name: 'Bắt đầu xác minh' }).click();
  await expect(page.getByText('Đã ghi nhận thao tác.')).toBeVisible();
  await page.getByLabel('Nội dung kết quả xử lý').fill('Da hoan tat xu ly.');
  await page.getByRole('button', { name: 'Gửi đề xuất kết quả' }).click();
  await expect(page.getByText('Đã gửi yêu cầu Approval.')).toBeVisible({
    timeout: 15000,
  });
  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto(`/incidents/${incidentId}`);
  await page.getByRole('button', { name: 'Phê duyệt' }).click();
  await expect(
    page
      .locator('main')
      .getByText(/resolved$/)
      .first(),
  ).toBeVisible();
});

test('[Web] field officer requests closure and commander closes', async ({
  page,
}) => {
  test.setTimeout(120000);
  await loginAs(page, COMMANDER);
  const incidentId = await createClassifiedAssignedIncident(
    page,
    `PS005 close ${Date.now()}`,
  );
  await page.goto(`/incidents/${incidentId}`);
  await page.getByLabel('Ghi chú xác minh').fill('Da xuong hien truong.');
  await page.getByRole('button', { name: 'Bắt đầu xác minh' }).click();
  await expect(page.getByText('Đã ghi nhận thao tác.')).toBeVisible();
  await page.getByLabel('Nội dung kết quả xử lý').fill('Da hoan tat xu ly.');
  await page.getByRole('button', { name: 'Gửi đề xuất kết quả' }).click();
  await expect(page.getByText('Đã gửi yêu cầu Approval.')).toBeVisible({
    timeout: 15000,
  });
  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto(`/incidents/${incidentId}`);
  await page.getByRole('button', { name: 'Phê duyệt' }).click();
  await expect(
    page
      .locator('main')
      .getByText(/resolved$/)
      .first(),
  ).toBeVisible();
  await logout(page);
  await loginAs(page, FIELD);
  await page.goto(`/incidents/${incidentId}`);
  await page.getByRole('button', { name: 'Gửi yêu cầu đóng Incident' }).click();
  await expect(page.getByText('Đã gửi yêu cầu Approval.')).toBeVisible({
    timeout: 15000,
  });
  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto(`/incidents/${incidentId}`);
  await page.getByRole('button', { name: 'Phê duyệt' }).click();
  await expect(
    page
      .locator('main')
      .getByText(/closed$/)
      .first(),
  ).toBeVisible();
});

test('[Web] closed incident timeline lists every lifecycle event', async ({
  page,
}) => {
  test.setTimeout(180000);
  const content = `PS005 timeline ${Date.now()}`;
  await loginAs(page, DUTY);
  const incidentId = await createIncidentViaApi(page, content);
  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto(`/incidents/${incidentId}`);
  await assignUser(
    page,
    new RegExp(DUTY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
  await logout(page);
  await loginAs(page, DUTY);
  await page.goto(`/incidents/${incidentId}`);
  await page.getByLabel('Category').selectOption('public_order');
  await page.getByLabel('Severity').selectOption('high');
  await page.getByRole('button', { name: 'Lưu phân loại' }).click();
  await expect(page.getByText('Đã ghi nhận thao tác.')).toBeVisible();
  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto(`/incidents/${incidentId}`);
  await assignUser(
    page,
    new RegExp(FIELD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
  await logout(page);
  await loginAs(page, FIELD);
  await page.goto(`/incidents/${incidentId}`);
  await page.getByLabel('Ghi chú xác minh').fill('Da xuong hien truong.');
  await page.getByRole('button', { name: 'Bắt đầu xác minh' }).click();
  await expect(page.getByText('Đã ghi nhận thao tác.')).toBeVisible();
  await page.getByLabel('Đơn vị nhận').selectOption(RECEIVING_OU);
  await page.getByRole('button', { name: 'Gửi yêu cầu chuyển' }).click();
  await expect(page.getByText('Đã gửi yêu cầu Approval.')).toBeVisible({
    timeout: 15000,
  });
  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto(`/incidents/${incidentId}`);
  await page.getByRole('button', { name: 'Phê duyệt' }).click();
  await expect(
    page
      .locator('main')
      .getByText(/transferred$/)
      .first(),
  ).toBeVisible();
  await logout(page);
  await loginAs(page, FIELD);
  await page.goto(`/incidents/${incidentId}`);
  await page.getByLabel('Nội dung kết quả xử lý').fill('Da hoan tat xu ly.');
  await page.getByRole('button', { name: 'Gửi đề xuất kết quả' }).click();
  await expect(page.getByText('Đã gửi yêu cầu Approval.')).toBeVisible({
    timeout: 15000,
  });
  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto(`/incidents/${incidentId}`);
  await page.getByRole('button', { name: 'Phê duyệt' }).click();
  await expect(
    page
      .locator('main')
      .getByText(/resolved$/)
      .first(),
  ).toBeVisible();
  await logout(page);
  await loginAs(page, FIELD);
  await page.goto(`/incidents/${incidentId}`);
  await page.getByRole('button', { name: 'Gửi yêu cầu đóng Incident' }).click();
  await expect(page.getByText('Đã gửi yêu cầu Approval.')).toBeVisible({
    timeout: 15000,
  });
  await logout(page);
  await loginAs(page, COMMANDER);
  await page.goto(`/incidents/${incidentId}`);
  await page.getByRole('button', { name: 'Phê duyệt' }).click();
  await expect(
    page
      .locator('main')
      .getByText(/closed$/)
      .first(),
  ).toBeVisible();
  const timeline = page.locator('section', { hasText: 'Timeline' });
  for (const eventType of [
    'IncidentRegistered',
    'IncidentAssigned',
    'IncidentClassified',
    'IncidentAssigned',
    'IncidentVerifying',
    'IncidentTransferRequested',
    'IncidentTransferred',
    'IncidentResolutionRequested',
    'IncidentResolved',
    'IncidentClosureRequested',
    'IncidentClosed',
  ]) {
    await expect(
      timeline.getByText(eventType, { exact: true }).first(),
    ).toBeVisible();
  }
});

test('[Web] commander intake creates no incident', async ({ page }) => {
  await loginAs(page, COMMANDER);
  const intake = await page.request.post('/api/intake-reports', {
    data: {
      sourceChannel: 'direct',
      receivedAt: new Date().toISOString(),
      content: `commander intake ${Date.now()}`,
    },
  });
  expect(intake.status()).toBe(201);
  const intakeBody = (await intake.json()) as {
    reportId?: string;
    incidentId?: string | null;
  };
  expect(typeof intakeBody.reportId).toBe('string');
  expect(intakeBody.incidentId).toBeNull();
});

test('[Web] unassigned users are denied in UI and at the API boundary', async ({
  page,
}) => {
  await loginAs(page, DUTY);
  const incidentId = await createIncidentViaApi(
    page,
    `PS005 denied ${Date.now()}`,
  );
  await logout(page);
  await loginAs(page, UNASSIGNED);
  await page.goto(`/incidents/${incidentId}`);
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();
  const deniedRead = await page.request.get(`/api/incidents/${incidentId}`);
  expect(deniedRead.status()).toBe(403);
  const deniedCommand = await commandViaApi(page, incidentId, {
    command: 'classify',
    category: 'other',
    severity: 'low',
  });
  expect(deniedCommand.status()).toBe(403);
  const deniedBody = (await deniedCommand.json()) as { error?: string };
  expect(deniedBody.error).toBe('FORBIDDEN');
});

test('[Web] anonymous incident list is rejected as unauthenticated', async ({
  request,
}) => {
  const anonymous = await request.get('/api/incidents');
  expect(anonymous.status()).toBe(401);
  expect(((await anonymous.json()) as { error?: string }).error).toBe(
    'UNAUTHENTICATED',
  );
});

test('[Web] intake API rejects unknown channels', async ({ page }) => {
  await loginAs(page, DUTY);
  const badChannel = await page.request.post('/api/intake-reports', {
    data: {
      channel: 'sms',
      receivedAt: new Date().toISOString(),
      content: 'bad channel probe',
    },
  });
  expect(badChannel.status()).toBe(400);
  expect(((await badChannel.json()) as { error?: string }).error).toBe(
    'INVALID_CHANNEL',
  );
});

test('[Web] intake API rejects empty content', async ({ page }) => {
  await loginAs(page, DUTY);
  const emptyContent = await page.request.post('/api/intake-reports', {
    data: {
      channel: 'in_person',
      receivedAt: new Date().toISOString(),
      content: '   ',
    },
  });
  expect(emptyContent.status()).toBe(400);
  expect(((await emptyContent.json()) as { error?: string }).error).toBe(
    'CONTENT_REQUIRED',
  );
});

test('[Web] intake idempotency key returns the same report', async ({
  page,
}) => {
  await loginAs(page, DUTY);
  const key = `ps005-idem-${Date.now()}`;
  const payload = {
    channel: 'telephone',
    receivedAt: new Date().toISOString(),
    content: `PS005 idempotency ${Date.now()}`,
  };
  const first = await page.request.post('/api/intake-reports', {
    headers: { 'Idempotency-Key': key },
    data: payload,
  });
  expect(first.status()).toBe(201);
  const second = await page.request.post('/api/intake-reports', {
    headers: { 'Idempotency-Key': key },
    data: payload,
  });
  expect(second.status()).toBe(201);
  const firstBody = (await first.json()) as {
    reportId: string;
    incidentId: string | null;
  };
  const secondBody = (await second.json()) as {
    reportId: string;
    incidentId: string | null;
  };
  expect(secondBody.reportId).toBe(firstBody.reportId);
  expect(secondBody.incidentId).toBeNull();
  expect(firstBody.incidentId).toBeNull();
});

test('[Web] converted intake exposes incident commands', async ({ page }) => {
  await loginAs(page, DUTY);
  const reportId = await createRawIntakeViaApi(
    page,
    `PS005 commands ${Date.now()}`,
  );
  const verified = await page.request.post(
    `/api/intake-reports/${reportId}/commands`,
    { data: { command: 'verify', classification: 'sufficient' } },
  );
  expect(verified.ok()).toBe(true);
  const confirmed = await page.request.post(
    `/api/intake-reports/${reportId}/commands`,
    { data: { command: 'confirm' } },
  );
  expect(confirmed.ok()).toBe(true);
  const converted = await page.request.post(
    `/api/intake-reports/${reportId}/commands`,
    { data: { command: 'convert_to_incident' } },
  );
  expect(converted.ok()).toBe(true);
  const convertedBody = (await converted.json()) as { incidentId: string };
  const unknown = await commandViaApi(page, convertedBody.incidentId, {
    command: 'escalate',
  });
  expect(unknown.status()).toBe(400);
  expect(((await unknown.json()) as { error?: string }).error).toBe(
    'UNKNOWN_COMMAND',
  );
});

test('[Web] approving a missing approval reports not found', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);
  const incidentId = await createIncidentViaApi(
    page,
    `PS005 approval ${Date.now()}`,
  );
  const missingApproval = await commandViaApi(page, incidentId, {
    command: 'approve',
    approvalId: 'no-such-approval',
  });
  expect(missingApproval.status()).toBe(404);
  expect(((await missingApproval.json()) as { error?: string }).error).toBe(
    'APPROVAL_NOT_FOUND',
  );
});

test('[Web] field officer is forbidden from intake', async ({ page }) => {
  await loginAs(page, FIELD);
  const forbiddenIntake = await page.request.post('/api/intake-reports', {
    data: {
      channel: 'in_person',
      receivedAt: new Date().toISOString(),
      content: 'field officer cannot intake',
    },
  });
  expect(forbiddenIntake.status()).toBe(403);
});

test('[Web] incident queue shows a loading state', async ({ page }) => {
  await loginAs(page, COMMANDER);
  await page.route('/api/incidents', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto('/incidents');
  await expect(page.getByLabel('Đang tải hàng đợi Incident')).toBeVisible();
  await expect(
    page
      .locator('a[href^="/incidents/"]')
      .or(page.getByText('Chưa có Incident trong phạm vi hiển thị.'))
      .first(),
  ).toBeVisible({ timeout: 15000 });
  await page.unroute('/api/incidents');
});

test('[Web] incident queue shows an empty state', async ({ page }) => {
  await loginAs(page, COMMANDER);
  await page.route('/api/incidents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ incidents: [] }),
    });
  });
  await page.goto('/incidents');
  await expect(
    page.getByText('Chưa có Incident trong phạm vi hiển thị.'),
  ).toBeVisible();
  await page.unroute('/api/incidents');
});

test('[Web] incident queue shows an error state with retry', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);
  await page.route('/api/incidents', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'INCIDENTS_FAILED' }),
    });
  });
  await page.goto('/incidents');
  await expect(
    page.getByText('Không thể tải hàng đợi Incident.'),
  ).toBeVisible();
  await page.unroute('/api/incidents');
  await page.getByRole('button', { name: 'Thử tải lại' }).click();
  await expect(
    page
      .locator('a[href^="/incidents/"]')
      .or(page.getByText('Chưa có Incident trong phạm vi hiển thị.'))
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

for (const url of ['/intake', '/incidents']) {
  test(`[Web] ${url} never clips horizontally`, async ({ page }) => {
    await loginAs(page, DUTY);
    await page.goto(url);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('[Web] incident detail never clips horizontally', async ({ page }) => {
  await loginAs(page, DUTY);
  const incidentId = await createIncidentViaApi(
    page,
    `PS005 layout ${Date.now()}`,
  );
  await page.goto(`/incidents/${incidentId}`);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('[Web] intake controls keep a visible keyboard focus', async ({
  page,
}) => {
  await loginAs(page, DUTY);
  await page.goto('/intake');
  const intakeForm = page.locator('form').filter({
    has: page.getByRole('button', { name: 'Ghi nhận tin báo' }),
  });
  await intakeForm.getByLabel('Kênh tiếp nhận').focus();
  await expect(intakeForm.getByLabel('Kênh tiếp nhận')).toBeFocused();
  await page.getByLabel('Nội dung tin báo').focus();
  await expect(page.getByLabel('Nội dung tin báo')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Vĩ độ')).toBeFocused();
});
