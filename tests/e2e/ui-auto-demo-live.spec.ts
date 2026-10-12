import { expect, test, type Page } from '@playwright/test';

import { WEB_SCENARIO_CATALOG } from '../../src/modules/demo/scenarios/web-catalog';

// T-007 AC-5 live-submit readiness and error visibility. Read-only-safe:
// catalog readiness, the existing forbidden state, and a validation-error
// submit through the existing /intake form that must not mutate. No
// successful live mutation here (that would leave civicos_demo dirty); the
// successful component-submit path is covered by tests/e2e/ps005-incident.spec.ts.
// No reset, no fixture seeding from the browser.
function scene(id: string) {
  const entry = WEB_SCENARIO_CATALOG.find((item) => item.id === id);
  if (!entry) throw new Error(`UNKNOWN_CATALOG_SCENE:${id}`);
  return entry;
}

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('civicos-dev');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');
}

const COMMANDER_EMAIL = 'commander@civicos.local';

test('live scene readiness stays observable through the existing component state', async ({
  page,
}) => {
  await loginAs(page, COMMANDER_EMAIL);
  await page.goto(scene('web-incident-queue').entryRoute);
  await expect(
    page.getByRole('heading', {
      name: scene('web-incident-queue').heading,
      exact: true,
    }),
  ).toBeVisible();
});

test('forbidden state stays visible instead of fake success', async ({
  page,
}) => {
  await loginAs(page, 'khongduocphancong@civicos.local');
  await page.goto(scene('web-incident-queue').entryRoute);
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Hàng đợi Incident không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại.',
    ),
  ).toBeVisible();
});

test('catalog navigation issues no reset or demo-admin call', async ({
  page,
}) => {
  const forbidden: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/reset|demo-admin|persona-switch/i.test(url)) forbidden.push(url);
  });
  await loginAs(page, COMMANDER_EMAIL);
  await page.goto(scene('web-vehicle-registry').entryRoute);
  await expect(
    page.getByRole('heading', {
      name: scene('web-vehicle-registry').heading,
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(scene('web-land-public-lookup').entryRoute);
  await expect(
    page.getByRole('heading', {
      name: scene('web-land-public-lookup').heading,
      exact: true,
    }),
  ).toBeVisible();
  expect(forbidden).toEqual([]);
});

test('whitespace intake submit shows validation state and mutates nothing', async ({
  page,
}) => {
  const forbidden: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/reset|demo-admin|persona-switch/i.test(url)) forbidden.push(url);
  });
  await loginAs(page, 'trucban@civicos.local');
  await page.goto(scene('web-intake-reports').entryRoute);
  await expect(
    page.getByRole('heading', {
      name: scene('web-intake-reports').heading,
      exact: true,
    }),
  ).toBeVisible();
  // Existing visible form path only: whitespace content is rejected by the
  // existing server validation, so no IntakeReport is created.
  await page.getByLabel('Nội dung tin báo').fill('   ');
  await page.getByRole('button', { name: 'Ghi nhận tin báo' }).click();
  // The form error paragraph (Next's route announcer shares role=alert,
  // so assert the exact validation copy instead).
  await expect(
    page.getByText('Cần nhập nội dung tin báo.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Đã ghi nhận tin báo. Hồ sơ chờ phân loại'),
  ).toHaveCount(0);
  expect(forbidden).toEqual([]);
});
