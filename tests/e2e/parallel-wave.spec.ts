import { expect, test } from '@playwright/test';

test('parallel wave entry surface links all three modules', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Một nơi để biết việc gì đang xảy ra.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Hàng đợi vụ việc/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Cơ sở kinh doanh/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Phương tiện hiện trường/ }),
  ).toBeVisible();
});
