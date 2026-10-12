import { expect, test, type Page } from '@playwright/test';

import { WEB_SCENARIO_CATALOG } from '../../src/modules/demo/scenarios/web-catalog';

// T-006 AC-2/AC-3 read-only smoke: representative catalog navigation plus one
// negative assignment case. No mutation, no reset, no fixture seeding.
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

async function expectSceneHeading(page: Page, id: string) {
  await expect(
    page.getByRole('heading', { name: scene(id).heading, exact: true }),
  ).toBeVisible();
}

// Commander login uses the broker-declared alias email from
// src/modules/demo/persona-broker.ts; the broker contract is unchanged.
const COMMANDER_EMAIL = 'commander@civicos.local';

test('commander visible dashboard links reach registry, map and assignment scenes', async ({
  page,
}) => {
  await loginAs(page, COMMANDER_EMAIL);

  await page.goto('/');
  await page.getByRole('tab', { name: 'Phương tiện' }).click();
  await page.getByRole('link', { name: 'Registry xe cần chú ý' }).click();
  await page.waitForURL(scene('web-vehicle-registry').entryRoute);
  await expectSceneHeading(page, 'web-vehicle-registry');

  await page.goto('/');
  await page.getByRole('tab', { name: 'Bản đồ' }).click();
  await page.getByRole('link', { name: 'Workspace bản đồ' }).click();
  await page.waitForURL(scene('web-map-workspace').entryRoute);
  await expectSceneHeading(page, 'web-map-workspace');

  await page.goto('/');
  await page.getByRole('tab', { name: 'Identity' }).click();
  await page.getByRole('link', { name: 'Assignment', exact: true }).click();
  await page.waitForURL(scene('web-identity-assignments').entryRoute);
  await expectSceneHeading(page, 'web-identity-assignments');
});

// The remaining catalog routes are intentionally hidden from workspace
// navigation (see NAVIGATION_EXCLUDED_FEATURE_IDS), so these approved direct
// routes are opened directly and only their documented readiness is asserted.
test('hidden direct routes render for their declared persona', async ({
  page,
}) => {
  await loginAs(page, COMMANDER_EMAIL);
  await page.goto(scene('web-incident-queue').entryRoute);
  await expectSceneHeading(page, 'web-incident-queue');
  await page.goto(scene('web-resident-list').entryRoute);
  await expectSceneHeading(page, 'web-resident-list');
  await page.request.delete('/api/auth/session');

  await loginAs(page, 'trucban@civicos.local');
  await page.goto(scene('web-intake-reports').entryRoute);
  await expectSceneHeading(page, 'web-intake-reports');
  await page.request.delete('/api/auth/session');

  await loginAs(page, 'vanphong@civicos.local');
  await page.goto(scene('web-inspection-catalogue').entryRoute);
  await expectSceneHeading(page, 'web-inspection-catalogue');
  await page.request.delete('/api/auth/session');

  await loginAs(page, 'hientruong@civicos.local');
  await page.goto(scene('web-vehicle-field').entryRoute);
  await expectSceneHeading(page, 'web-vehicle-field');
});

test('public land lookup renders without a session', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto(scene('web-land-public-lookup').entryRoute);
  await expectSceneHeading(page, 'web-land-public-lookup');
});

test('unassigned direct incident route shows forbidden state and runs no action', async ({
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
