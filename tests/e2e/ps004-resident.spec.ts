import { expect, test, type Page } from '@playwright/test';

const runId = process.env.CIVICOS_E2E_RUN_ID ?? '';
const PASSWORD = process.env.CIVICOS_E2E_FIXTURE_PASSWORD ?? '';
if (!runId || !PASSWORD) throw new Error('E2E_FIXTURE_CREDENTIALS_REQUIRED');
const COMMANDER = `ps007-e2e-${runId}-commander@example.test`;
const MASKED_SUBJECT_ID = 'subject-masked-001';
const RAW_PII_SENTINEL = 'RAW-PII-0900123456';
const RUNTIME_TARGET = 'upper-unit-runtime-001';

async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');
}

test('residents list renders heading, rows, and empty state', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);
  await page.route('**/api/residents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ subjects: [] }),
    });
  });
  await page.goto('/residents');
  await expect(
    page.getByRole('heading', { name: 'Danh sách cư dân đặc biệt' }),
  ).toBeVisible();
  await expect(
    page.getByText('Chưa có hồ sơ cư dân đặc biệt nào.'),
  ).toBeVisible();

  await page.unroute('**/api/residents');
  const listed = {
    subjects: [
      {
        id: 'subject-001',
        displayName: 'N• V•• A•',
        subjectType: 'temporary_resident',
        status: 'active',
        records: [
          {
            id: 'record-001',
            purpose: 'temporary_resident',
            status: 'active',
            riskLevel: 'normal',
            nextCheckAt: null,
            sla: 'on_track',
          },
        ],
      },
    ],
  };
  await page.route('**/api/residents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(listed),
    });
  });
  await page.goto('/residents');
  await expect(
    page.locator('table').getByRole('link', { name: 'N• V•• A•' }),
  ).toBeVisible();

  // E1-004 stays read-only on the mobile project: no write CTA may
  // appear inside the resident surface on any viewport.
  await expect(
    page
      .locator('main')
      .getByRole('button', { name: /Tạo|Thêm|Đăng ký|Ghi nhận/ }),
  ).toHaveCount(0);
  await expect(
    page
      .locator('main')
      .getByRole('link', { name: /Tạo cư dân|Thêm cư dân|Đăng ký/ }),
  ).toHaveCount(0);
});

test('residents list surfaces error and recovers on retry', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);
  let attempts = 0;
  await page.route('**/api/residents', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'RESIDENTS_FAILED' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ subjects: [] }),
    });
  });
  await page.goto('/residents');
  const alert = page
    .getByRole('alert')
    .filter({ hasText: 'Không tải được danh sách cư dân.' });
  await expect(alert).toBeVisible();
  await alert.getByRole('button', { name: 'Thử lại' }).click();
  await expect(
    page.getByText('Chưa có hồ sơ cư dân đặc biệt nào.'),
  ).toBeVisible();
});

test('residents list shows permission-denied on 403', async ({ page }) => {
  await loginAs(page, COMMANDER);
  await page.route('**/api/residents', async (route) => {
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'FORBIDDEN' }),
    });
  });
  await page.goto('/residents');
  await expect(
    page.getByRole('alert').filter({
      hasText: 'Tài khoản không có quyền xem hồ sơ cư dân trong phạm vi này.',
    }),
  ).toContainText(
    'Tài khoản không có quyền xem hồ sơ cư dân trong phạm vi này.',
  );
});

test('resident detail masks PII without leaking raw values', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);
  const masked = {
    subject: {
      id: MASKED_SUBJECT_ID,
      displayName: 'Đ• ••• •••',
      subjectType: 'foreign_resident',
      status: 'active',
      sensitiveProfile: null,
      masked: true,
      records: [
        {
          id: 'record-masked-001',
          purpose: 'foreign_resident',
          status: 'active',
          riskLevel: 'normal',
          nextCheckAt: null,
          sla: 'due_soon',
          version: 1,
        },
      ],
    },
  };
  await page.route(`**/api/residents/${MASKED_SUBJECT_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(masked),
    });
  });
  await page.goto(`/residents/${MASKED_SUBJECT_ID}`);
  await expect(
    page.getByRole('heading', { name: 'Hồ sơ cư dân' }),
  ).toBeVisible();
  await expect(page.getByText('Danh tính đã che theo quyền.')).toBeVisible();
  await expect(page.getByText(RAW_PII_SENTINEL)).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: /foreign_resident/ }),
  ).toBeVisible();
});

test('resident reports show loading, empty, snapshot, runtime send target', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);

  await page.route('**/api/residents/reports/monthly*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reports: [] }),
    });
  });
  await page.goto('/residents/reports');
  await expect(
    page.getByRole('heading', { name: 'Báo cáo tháng' }),
  ).toBeVisible();
  await expect(page.getByText('Đang tải báo cáo tháng…')).toBeVisible();
  await expect(
    page.getByText('Chưa đủ dữ liệu nguồn cho báo cáo tháng.'),
  ).toBeVisible({ timeout: 15000 });
  await page.unroute('**/api/residents/reports/monthly*');

  const snapshot = {
    reports: [
      {
        id: 'report-draft-001',
        organizationId: 'unit-commander',
        period: '2026-09',
        status: 'draft',
        aggregateCounts: { total: 1, overdue: 0 },
        snapshotPayload: { period: '2026-09', total: 1 },
        snapshotHash: 'abc123def456snapshot',
      },
      {
        id: 'report-approved-001',
        organizationId: 'unit-commander',
        period: '2026-08',
        status: 'approved',
        aggregateCounts: { total: 2, overdue: 1 },
        snapshotPayload: { period: '2026-08', total: 2 },
        snapshotHash: 'ffeeddccbbaa998877',
      },
    ],
  };
  await page.route('**/api/residents/reports/monthly*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(snapshot),
    });
  });
  await page.route('**/api/residents/reports/*/send', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.goto('/residents/reports');
  const draftReport = page.getByRole('listitem').filter({ hasText: '2026-09' });
  await expect(draftReport.getByText('2026-09')).toBeVisible();
  await expect(draftReport.getByText(/draft$/)).toBeVisible();
  await expect(page.getByText(/Snapshot bất biến:/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Phê duyệt' })).toBeVisible();
  const targetInput = page.getByLabel('Đơn vị cấp trên nhận báo cáo');
  await expect(targetInput).toHaveValue('');
  await expect(page.getByText('upper-unit')).toHaveCount(0);

  // Sending without a runtime target is rejected before any POST.
  await page.getByRole('button', { name: 'Gửi cấp trên' }).click();
  await expect(
    page.getByText('Nhập đơn vị cấp trên nhận báo cáo.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Thử lại' }).click();
  const approvedReport = page
    .getByRole('listitem')
    .filter({ hasText: '2026-08' });
  await expect(approvedReport.getByText('2026-08')).toBeVisible();
  await expect(approvedReport.getByText(/approved$/)).toBeVisible();

  const sendResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/residents/reports/') &&
      response.url().endsWith('/send') &&
      response.request().method() === 'POST',
  );
  await page.getByLabel('Đơn vị cấp trên nhận báo cáo').fill(RUNTIME_TARGET);
  await page.getByRole('button', { name: 'Gửi cấp trên' }).click();
  const sendResponse = await sendResponsePromise;
  expect(sendResponse.ok()).toBe(true);
  const sendBody = sendResponse.request().postDataJSON() as {
    targetOrganizationId?: string;
  };
  expect(sendBody.targetOrganizationId).toBe(RUNTIME_TARGET);
});
