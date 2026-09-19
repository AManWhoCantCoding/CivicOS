import { expect, test } from '@playwright/test';

test('login screen exposes labeled credentials and denied state copy', async ({
  page,
}) => {
  await page.goto('/login');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Mật khẩu')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
});
