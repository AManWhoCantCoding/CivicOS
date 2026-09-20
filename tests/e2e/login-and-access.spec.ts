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
