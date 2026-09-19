import { expect, test } from '@playwright/test';

test('field shell exposes an offline status surface', async ({ page }) => {
  await page.goto('/field/offline');
  await expect(page.getByText('Trạng thái thiết bị')).toBeVisible();
  await expect(page.getByText('Kết nối', { exact: true })).toBeVisible();
});
