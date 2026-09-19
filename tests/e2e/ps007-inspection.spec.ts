import { expect, test } from '@playwright/test';

test('inspection catalog exposes a clear empty state', async ({ page }) => {
  await page.goto('/inspections/establishments');
  await expect(
    page.getByRole('heading', { name: 'Cơ sở kinh doanh' }),
  ).toBeVisible();
});
