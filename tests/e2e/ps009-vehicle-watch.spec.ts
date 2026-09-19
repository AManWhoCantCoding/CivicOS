import { expect, test } from '@playwright/test';

test('vehicle field form exposes fast labeled inputs', async ({ page }) => {
  await page.goto('/field/vehicles');
  await expect(
    page.getByRole('heading', { name: 'Phương tiện tại hiện trường' }),
  ).toBeVisible();
  await expect(page.getByLabel('Biển số')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Ghi nhận phương tiện' }),
  ).toBeVisible();
});
