import { expect, test } from '@playwright/test';

test('login screen exposes labeled credentials and denied state copy', async ({
  page,
}) => {
  await page.goto('/login');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Mật khẩu')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
});

test('invalid credentials show an inline error without creating a session', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('truong@civicos.local');
  await page.getByLabel('Mật khẩu').fill('wrong-password');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.locator('form [role="alert"]')).toContainText(
    'Email hoặc mật khẩu không hợp lệ.',
  );
  const session = await page.evaluate(() => document.cookie);
  expect(session).not.toContain('civicos_session');
});

test('development login issues an expiring HttpOnly session and logout clears it', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('truong@civicos.local');
  await page.getByLabel('Mật khẩu').fill('civicos-dev');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');

  const cookies = await page.context().cookies();
  const session = cookies.find(({ name }) => name === 'civicos_session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.value.length).toBeGreaterThan(0);
  expect((session?.expires ?? 0) * 1000).toBeGreaterThan(Date.now());

  const current = await page.request.get('/api/auth/session');
  expect(current.ok()).toBe(true);
  const body = (await current.json()) as { user?: { email?: string } | null };
  expect(body.user?.email).toBe('truong@civicos.local');

  const logout = await page.request.delete('/api/auth/session');
  expect(logout.ok()).toBe(true);
  const after = await page.request.get('/api/auth/session');
  const afterBody = (await after.json()) as { user?: unknown };
  expect(afterBody.user).toBeNull();

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
});

test('superior unit account signs in as superior_officer with its own unit', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('captren@civicos.local');
  await page.getByLabel('Mật khẩu').fill('civicos-dev');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');

  const current = await page.request.get('/api/auth/session');
  expect(current.ok()).toBe(true);
  const body = (await current.json()) as {
    user?: { roles?: string[]; organizationUnitId?: string } | null;
  };
  expect(body.user?.roles).toEqual(['superior_officer']);
  expect(body.user?.organizationUnitId).toBe('unit-cap-tren');
});

test('superior commander and system operator sessions carry their own roles', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('captren-chihuy@civicos.local');
  await page.getByLabel('Mật khẩu').fill('civicos-dev');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');
  const superior = (await (
    await page.request.get('/api/auth/session')
  ).json()) as { user?: { roles?: string[] } | null };
  expect(superior.user?.roles).toContain('superior_commander');
  await page.request.delete('/api/auth/session');

  await page.goto('/login');
  await page.getByLabel('Email').fill('system-operator@civicos.local');
  await page.getByLabel('Mật khẩu').fill('civicos-dev');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');
  const operator = (await (
    await page.request.get('/api/auth/session')
  ).json()) as { user?: { roles?: string[] } | null };
  expect(operator.user?.roles).toContain('system_operator');
  const business = await page.request.get('/api/incidents/t02-tampered-id');
  expect(business.status()).toBe(403);
});

test('system operator can read health/worker but not user management', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('system-operator@civicos.local');
  await page.getByLabel('Mật khẩu').fill('civicos-dev');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');

  const health = await page.request.get('/api/health/worker');
  expect(health.status()).toBe(200);
  const healthBody = (await health.json()) as Record<string, unknown>;
  expect(healthBody).toHaveProperty('pendingCount');
  expect(healthBody).not.toHaveProperty('users');

  const users = await page.request.get('/api/identity/users');
  expect(users.status()).toBe(403);
});

test('unassigned user cannot reach records through direct URL or API tampering', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('khongduocphancong@civicos.local');
  await page.getByLabel('Mật khẩu').fill('civicos-dev');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');

  const tampered = await page.request.get('/api/incidents/t02-tampered-id');
  expect(tampered.status()).toBe(403);
  const tamperedBody = (await tampered.json()) as { error?: string };
  expect(tamperedBody.error).toBe('FORBIDDEN');

  const grant = await page.request.post('/api/identity/assignments', {
    data: {
      resourceType: 'Incident',
      resourceId: 't02-tampered-id',
      task: 'incident_verification',
      assigneeUserIds: ['t02-tampered-id'],
    },
  });
  expect(grant.status()).toBe(403);

  await page.goto('/incidents/t02-tampered-id');
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();
});

test('assignments route denies unauthenticated access on the server', async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto('/assignments');
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();
});

test('users screen shows roles and units to commander only', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('truong@civicos.local');
  await page.getByLabel('Mật khẩu').fill('civicos-dev');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');

  await page.goto('/users');
  await expect(
    page.getByRole('heading', { name: 'Quản lý User' }),
  ).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
  await expect(
    page.getByRole('columnheader', { name: 'OrganizationUnit' }),
  ).toBeVisible();
  await expect(page.getByRole('table')).toContainText('truong@civicos.local');
  await page.request.delete('/api/auth/session');

  await page.goto('/login');
  await page.getByLabel('Email').fill('khongduocphancong@civicos.local');
  await page.getByLabel('Mật khẩu').fill('civicos-dev');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');
  await page.goto('/users');
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();

  await page.context().clearCookies();
  await page.goto('/users');
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập' }),
  ).toBeVisible();
});
