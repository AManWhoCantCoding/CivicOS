import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('civicos-dev');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');
}

function moduleSidebar(page: Page, module: string) {
  return page.locator(`nav[aria-label="Điều hướng ${module}"] >> visible=true`);
}

async function visibleNav(page: Page, module: string, testInfo: TestInfo) {
  const drawer = page.getByRole('dialog', {
    name: `Điều hướng ${module}`,
  });
  if (testInfo.project.name === 'mobile') {
    if (!(await drawer.isVisible())) {
      await page.getByRole('button', { name: 'Mở điều hướng' }).click();
    }
    await expect(drawer).toBeVisible();
    return drawer;
  }
  return moduleSidebar(page, module);
}

test('dashboard preserves module cards and open-module behavior', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Hàng đợi vụ việc' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Cơ sở kinh doanh' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Phương tiện hiện trường' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Hàng đợi vụ việc/ }),
  ).toHaveAttribute('href', '/incidents');
  await expect(
    page.getByRole('link', { name: /Cơ sở kinh doanh/ }),
  ).toHaveAttribute('href', '/inspections/establishments');
  await expect(
    page.getByRole('link', { name: /Phương tiện hiện trường/ }),
  ).toHaveAttribute('href', '/field/vehicles');
  await expect(
    page.getByRole('link', { name: 'Mở Assignment' }),
  ).toHaveAttribute('href', '/assignments');
});

test('incident shell exposes intake, work queue and assignment features with active state', async ({
  page,
}, testInfo) => {
  await loginAs(page, 'truong@civicos.local');
  await page.goto('/incidents');
  const sidebar = await visibleNav(page, 'Incident', testInfo);
  await expect(sidebar).toBeVisible();
  await expect(
    sidebar.getByRole('link', { name: 'Hàng đợi Incident' }),
  ).toHaveAttribute('href', '/incidents');
  await expect(
    sidebar.getByRole('link', { name: 'Phân công Incident' }),
  ).toHaveAttribute('href', '/assignments');
  await expect(
    sidebar.getByRole('link', { name: 'Hàng đợi Incident' }),
  ).toHaveAttribute('aria-current', 'page');
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(breadcrumb).toBeVisible();
  await expect(
    breadcrumb.getByRole('link', { name: 'Trung tâm' }),
  ).toHaveAttribute('href', '/');
  await expect(
    breadcrumb.getByText('Hàng đợi Incident', { exact: true }),
  ).toBeVisible();
});

test('duty officer sees intake but not commander-only assignment management', async ({
  page,
}, testInfo) => {
  await loginAs(page, 'trucban@civicos.local');
  await page.goto('/incidents');
  const sidebar = await visibleNav(page, 'Incident', testInfo);
  await expect(
    sidebar.getByRole('link', { name: 'Ghi nhận tin báo' }),
  ).toHaveAttribute('href', '/intake');
  await expect(
    sidebar.getByRole('link', { name: 'Phân công Incident' }),
  ).toHaveCount(0);
});

test('inspection shell lists catalogue, schedule and fieldwork queue', async ({
  page,
}, testInfo) => {
  await loginAs(page, 'vanphong@civicos.local');
  await page.goto('/inspections/establishments');
  const officeSidebar = await visibleNav(page, 'Inspection', testInfo);
  await expect(
    officeSidebar.getByRole('link', { name: 'Danh mục cơ sở' }),
  ).toHaveAttribute('href', '/inspections/establishments');
  await expect(
    officeSidebar.getByRole('link', { name: 'Lịch kiểm tra' }),
  ).toHaveAttribute('href', '/inspections/establishments#inspection-schedule');
  await page.request.delete('/api/auth/session');

  await loginAs(page, 'truong@civicos.local');
  await page.goto('/inspections/establishments');
  const commanderSidebar = await visibleNav(page, 'Inspection', testInfo);
  await expect(
    commanderSidebar.getByRole('link', { name: 'Danh mục cơ sở' }),
  ).toBeVisible();
  await expect(
    commanderSidebar.getByRole('link', { name: 'Lịch kiểm tra' }),
  ).toBeVisible();
  await expect(
    commanderSidebar.getByRole('link', { name: 'Hàng đợi fieldwork' }),
  ).toBeVisible();
});

test('vehicle shell lists registry, observation and verification', async ({
  page,
}, testInfo) => {
  await loginAs(page, 'truong@civicos.local');
  await page.goto('/vehicles/registry');
  const sidebar = await visibleNav(page, 'Phương tiện', testInfo);
  await expect(
    sidebar.getByRole('link', { name: 'Registry xe cần chú ý' }),
  ).toHaveAttribute('href', '/vehicles/registry');
  await expect(
    sidebar.getByRole('link', { name: 'Quan sát hiện trường' }),
  ).toHaveAttribute('href', '/field/vehicles');
  await expect(
    sidebar.getByRole('link', { name: 'Xác minh phương tiện' }),
  ).toHaveCount(0);
  await expect(
    sidebar.getByRole('link', { name: 'Registry xe cần chú ý' }),
  ).toHaveAttribute('aria-current', 'page');
});

test('identity shell lists assignment and user management with role filtering', async ({
  page,
}, testInfo) => {
  await loginAs(page, 'truong@civicos.local');
  await page.goto('/assignments');
  const commanderSidebar = await visibleNav(page, 'Identity', testInfo);
  await expect(
    commanderSidebar.getByRole('link', { name: 'Assignment' }),
  ).toHaveAttribute('href', '/assignments', { timeout: 20000 });
  await expect(
    commanderSidebar.getByRole('link', { name: 'Quản lý User' }),
  ).toHaveAttribute('href', '/users', { timeout: 20000 });
  await page.request.delete('/api/auth/session');

  await loginAs(page, 'vanphong@civicos.local');
  await page.goto('/assignments');
  const officeSidebar = await visibleNav(page, 'Identity', testInfo);
  await expect(
    officeSidebar.getByRole('link', { name: 'Assignment' }),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    officeSidebar.getByRole('link', { name: 'Quản lý User' }),
  ).toHaveCount(0);
});

test('identity landing exposes the module shell with user and assignment features', async ({
  page,
}, testInfo) => {
  await loginAs(page, 'truong@civicos.local');
  await page.goto('/identity');
  const commanderSidebar = await visibleNav(page, 'Identity', testInfo);
  await expect(
    commanderSidebar.getByRole('link', { name: 'Assignment' }),
  ).toHaveAttribute('href', '/assignments', { timeout: 20000 });
  await expect(
    commanderSidebar.getByRole('link', { name: 'Quản lý User' }),
  ).toHaveAttribute('href', '/users', { timeout: 20000 });
  await expect(
    page.getByRole('heading', { name: 'Identity', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Mở Assignment' }),
  ).toHaveAttribute('href', '/assignments');
  await expect(
    page.getByRole('link', { name: 'Mở quản lý User' }),
  ).toHaveAttribute('href', '/users');
  await page.request.delete('/api/auth/session');

  await loginAs(page, 'vanphong@civicos.local');
  await page.goto('/identity');
  const officeSidebar = await visibleNav(page, 'Identity', testInfo);
  await expect(
    officeSidebar.getByRole('link', { name: 'Assignment' }),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByRole('link', { name: 'Mở Assignment' }),
  ).toHaveAttribute('href', '/assignments');
  await expect(page.getByRole('link', { name: 'Mở quản lý User' })).toHaveCount(
    0,
  );
});

test('client visibility stays in sync with server-authorized session and own assignments', async ({
  page,
}, testInfo) => {
  await loginAs(page, 'hientruong@civicos.local');
  const session = (await (
    await page.request.get('/api/auth/session')
  ).json()) as {
    user?: { id?: string; roles?: string[] } | null;
  };
  const assignmentsBody = (await (
    await page.request.get('/api/identity/assignments')
  ).json()) as {
    assignments?: {
      task?: string;
      status?: string;
      assigneeUserId?: string;
    }[];
  };
  const ownActive = (assignmentsBody.assignments ?? []).filter(
    (entry) =>
      entry.status === 'active' &&
      entry.assigneeUserId === session.user?.id &&
      entry.task === 'incident_verification',
  );
  const ownVehicle = (assignmentsBody.assignments ?? []).filter(
    (entry) =>
      entry.status === 'active' &&
      entry.assigneeUserId === session.user?.id &&
      entry.task === 'vehicle_verification',
  );
  await page.goto('/incidents');
  if (ownActive.length > 0) {
    const sidebar = await visibleNav(page, 'Incident', testInfo);
    await expect(sidebar).toBeVisible();
    await expect(
      sidebar.getByRole('link', { name: 'Phân công Incident' }),
    ).toHaveCount(0);
    await expect(
      sidebar.getByRole('link', { name: 'Hàng đợi Incident' }),
    ).toHaveCount(1);
  } else {
    await expect(
      page.getByRole('heading', { name: 'Không có quyền truy cập' }),
    ).toBeVisible();
    await expect(
      page.locator('nav[aria-label="Điều hướng Incident"]'),
    ).toHaveCount(0);
  }

  await page.goto('/vehicles/registry');
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();

  await page.goto('/field/vehicles');
  const vehicleSidebar = await visibleNav(page, 'Phương tiện', testInfo);
  await expect(vehicleSidebar).toBeVisible();
  await expect(
    vehicleSidebar.getByRole('link', { name: 'Registry xe cần chú ý' }),
  ).toHaveCount(0);
  await expect(
    vehicleSidebar.getByRole('link', { name: 'Quan sát hiện trường' }),
  ).toBeVisible();
  await expect(
    vehicleSidebar.getByRole('link', { name: 'Xác minh phương tiện' }),
  ).toHaveCount(ownVehicle.length > 0 ? 1 : 0);
});

test('feature entry routes deny unauthorized direct links from the server', async ({
  page,
}) => {
  await loginAs(page, 'vanphong@civicos.local');
  await page.goto('/vehicles/registry');
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();
  await page.request.delete('/api/auth/session');

  await loginAs(page, 'vanphong@civicos.local');
  await page.goto('/field/vehicles');
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();
  await page.request.delete('/api/auth/session');

  await loginAs(page, 'captren@civicos.local');
  await page.goto('/inspections/establishments');
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();
  await page.request.delete('/api/auth/session');

  await loginAs(page, 'khongduocphancong@civicos.local');
  await page.goto('/incidents');
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();
  await page.request.delete('/api/auth/session');

  await loginAs(page, 'system-operator@civicos.local');
  await page.goto('/identity');
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();
});

test('direct links without permission return server denied states', async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto('/incidents');
  await expect(
    page.getByRole('heading', { name: 'Hàng đợi Incident' }),
  ).toBeVisible();
  await expect(
    page.locator('nav[aria-label="Điều hướng Incident"]'),
  ).toHaveCount(0);
  const loggedOutApi = await page.request.get('/api/incidents');
  expect(loggedOutApi.status()).toBe(401);

  await loginAs(page, 'system-operator@civicos.local');
  await page.goto('/incidents');
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();

  await page.request.delete('/api/auth/session');
  await loginAs(page, 'khongduocphancong@civicos.local');
  await page.goto('/users');
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();
});

test('keyboard focus reaches sidebar links with visible active state', async ({
  page,
}, testInfo) => {
  await loginAs(page, 'truong@civicos.local');
  await page.goto('/incidents');
  const queueLink = (await visibleNav(page, 'Incident', testInfo)).getByRole(
    'link',
    {
      name: 'Hàng đợi Incident',
    },
  );
  await expect(async () => {
    await queueLink.focus();
    await expect(queueLink).toBeFocused();
  }).toPass();
  await expect(queueLink).toHaveAttribute('aria-current', 'page');
  const box = await queueLink.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test('desktop sidebar collapses and expands on demand', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'collapse control is desktop-only',
  );
  await loginAs(page, 'truong@civicos.local');
  await page.goto('/incidents');
  const collapse = page.getByRole('button', { name: 'Thu gọn điều hướng' });
  await expect(collapse).toBeVisible();
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await collapse.click();
  await expect(
    page.getByRole('button', { name: 'Mở rộng điều hướng' }),
  ).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Mở rộng điều hướng' }).click();
  await expect(
    page.getByRole('button', { name: 'Thu gọn điều hướng' }),
  ).toHaveAttribute('aria-expanded', 'true');
  await expect(
    moduleSidebar(page, 'Incident').getByRole('link', {
      name: 'Hàng đợi Incident',
    }),
  ).toBeVisible();
});

test('mobile drawer traps focus, closes on escape and after navigation', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'drawer is mobile-only');
  await loginAs(page, 'truong@civicos.local');
  await page.goto('/incidents');
  const menuButton = page.getByRole('button', { name: 'Mở điều hướng' });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await menuButton.click();
  const drawer = page.getByRole('dialog', { name: 'Điều hướng Incident' });
  await expect(drawer).toBeVisible();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  const queueLink = drawer.getByRole('link', { name: 'Hàng đợi Incident' });
  await expect(queueLink).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(menuButton).toBeFocused();
  await menuButton.click();
  await expect(
    page.getByRole('dialog', { name: 'Điều hướng Incident' }),
  ).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Điều hướng Incident' })
    .getByRole('link', { name: 'Phân công Incident' })
    .click();
  await page.waitForURL('/assignments');
  await expect(
    page.getByRole('dialog', { name: 'Điều hướng Incident' }),
  ).toHaveCount(0);
});

test('shell surfaces offline state without losing navigation', async ({
  page,
}, testInfo) => {
  await loginAs(page, 'truong@civicos.local');
  await page.goto('/incidents');
  await expect(await visibleNav(page, 'Incident', testInfo)).toBeVisible();
  await page.context().setOffline(true);
  await expect(page.getByText('Đang ngoại tuyến.')).toBeVisible();
  await expect(
    (await visibleNav(page, 'Incident', testInfo)).getByRole('link', {
      name: 'Hàng đợi Incident',
    }),
  ).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByText('Đang ngoại tuyến.')).toHaveCount(0);
});
