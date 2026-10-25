import { expect, test } from '@playwright/test';

const RUN_ID = process.env.CIVICOS_E2E_RUN_ID!;
const PASSWORD = process.env.CIVICOS_E2E_FIXTURE_PASSWORD!;
const COMMANDER = `ps007-e2e-${RUN_ID}-commander@example.test`;
const INSPECTION_ID = 'synthetic-e1-007-inspection';
const TITLE = 'Synthetic E1-007 inspection marker';
const STYLE_PATH = '/e2e-map-style.json';

test('MapLibre inspection marker opens its accessible popup', async ({
  page,
}) => {
  await page.route('**/api/map/config', (route) =>
    route.fulfill({
      json: {
        provider: {
          styleUrl: new URL(STYLE_PATH, route.request().url()).toString(),
          attribution: 'Synthetic local test map',
          bounds: [106.5, 10.1, 106.6, 10.2],
          official: false,
        },
      },
    }),
  );
  await page.route('**/api/map/markers', (route) =>
    route.fulfill({
      json: {
        markers: [
          {
            id: `Inspection:${INSPECTION_ID}`,
            aggregateType: 'Inspection',
            title: TITLE,
            latitude: 10.15,
            longitude: 106.55,
            hasArea: false,
            status: 'Đang kiểm tra',
            updatedAt: '2030-01-15T10:00:00.000Z',
          },
        ],
      },
    }),
  );
  await page.route(`**${STYLE_PATH}`, (route) => {
    return route.fulfill({
      contentType: 'application/json',
      json: {
        version: 8,
        name: 'Synthetic background-only style',
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#e8e4dc' },
          },
        ],
      },
    });
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill(COMMANDER);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');
  await page.goto('/map');

  const marker = page.getByRole('button', {
    name: `${TITLE}. Trạng thái: Đang kiểm tra`,
  });
  await expect(marker).toBeVisible();
  await marker.click();
  const popup = page.locator('.maplibregl-popup');
  await expect(popup.getByText(TITLE)).toBeVisible();
  await expect(popup.getByText('Trạng thái: Đang kiểm tra')).toBeVisible();
  await expect(
    popup.getByRole('link', { name: 'Xem chi tiết' }),
  ).toHaveAttribute('href', `/inspections/${INSPECTION_ID}`);
});
