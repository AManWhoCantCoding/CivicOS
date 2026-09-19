import { expect, test } from '@playwright/test';

test('intake screen exposes a complete labeled form', async ({ page }) => {
  await page.goto('/intake');
  await expect(
    page.getByRole('heading', { name: 'Ghi nhận tin báo' }),
  ).toBeVisible();
  await expect(page.getByLabel('Nội dung tin báo')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Tạo Incident' }),
  ).toBeVisible();
});
