// Standalone browser evidence for LandParcel polygon rendering (T-003/T-004/T-008).
// Runs with playwright.land-parcels.config.ts ONLY — the global playwright.config.ts
// starts fixture services (scripts/e2e/playwright-services.mjs) and must NOT be used.
//
// Everything here is fully synthetic: login-free, DB-free, no fixture setup,
// no test mutations. All app API calls, the map style, and any provider/tile
// request are intercepted locally; every non-local request is aborted.
// Content strings (Vietnamese) must mirror src/components/map verbatim.

import { inflateSync } from 'node:zlib';

import { expect, test, type Page, type Route } from '@playwright/test';

const STYLE_PATH = '/land-e2e-map-style.json';
const BACKGROUND_RGB: [number, number, number] = [232, 228, 220]; // #e8e4dc
const LINE_RGB: [number, number, number] = [7, 89, 133]; // #075985
const LOCAL_ORIGINS = new Set([
  'http://127.0.0.1:3101',
  'http://localhost:3101',
]);

// Synthetic polygons inside the CADN bounds (105.93, 20.91, 106.03, 20.99).
// Without focus the camera centers on the provider bounds center (105.98, 20.95);
// with focus it centers on the polygon bbox center at zoom 16.
const FOCUS_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [105.9975, 20.94775],
      [106.0025, 20.94775],
      [106.0025, 20.95225],
      [105.9975, 20.95225],
      [105.9975, 20.94775],
    ],
  ],
};
const DISCOVERY_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [105.96, 20.93],
      [106.0, 20.93],
      [106.0, 20.97],
      [105.96, 20.97],
      [105.96, 20.93],
    ],
  ],
};

// Minimal PNG decoder (8-bit, non-interlaced RGB/RGBA) for canvas pixel reads.
type DecodedPng = { width: number; height: number; data: Uint8Array };

function decodePng(buffer: Buffer): DecodedPng {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      const bitDepth = buffer[dataStart + 8];
      colorType = buffer[dataStart + 9];
      const interlace = buffer[dataStart + 12];
      if (interlace !== 0) throw new Error('interlaced PNG not supported');
      if (bitDepth !== 8)
        throw new Error(`bit depth ${bitDepth} not supported`);
      if (colorType !== 2 && colorType !== 6) {
        throw new Error(`color type ${colorType} not supported`);
      }
    } else if (type === 'IDAT') {
      idatChunks.push(buffer.subarray(dataStart, dataStart + length));
    } else if (type === 'IEND') {
      break;
    }
    offset = dataStart + length + 4;
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idatChunks));
  if (raw.length !== height * (stride + 1)) {
    throw new Error(`unexpected PNG raw size ${raw.length}`);
  }
  const out = new Uint8Array(width * height * 4);
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const source = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = new Uint8Array(stride);
    for (let index = 0; index < stride; index++) {
      const left = index >= channels ? row[index - channels] : 0;
      const up = previous[index];
      const upperLeft = index >= channels ? previous[index - channels] : 0;
      let value = source[index];
      switch (filter) {
        case 0:
          break;
        case 1:
          value += left;
          break;
        case 2:
          value += up;
          break;
        case 3:
          value += (left + up) >> 1;
          break;
        case 4: {
          const p = left + up - upperLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upperLeft);
          value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upperLeft;
          break;
        }
        default:
          throw new Error(`PNG filter ${filter} not supported`);
      }
      row[index] = value & 0xff;
    }
    previous = row;
    for (let x = 0; x < width; x++) {
      const sourceIndex = x * channels;
      const targetIndex = (y * width + x) * 4;
      out[targetIndex] = row[sourceIndex];
      out[targetIndex + 1] = row[sourceIndex + 1];
      out[targetIndex + 2] = row[sourceIndex + 2];
      out[targetIndex + 3] = channels === 4 ? row[sourceIndex + 3] : 255;
    }
  }
  return { width, height, data: out };
}

function withinTolerance(
  actual: [number, number, number],
  expected: [number, number, number],
  tolerance: number,
): boolean {
  return (
    Math.abs(actual[0] - expected[0]) <= tolerance &&
    Math.abs(actual[1] - expected[1]) <= tolerance &&
    Math.abs(actual[2] - expected[2]) <= tolerance
  );
}

async function readCanvasPixels(page: Page): Promise<{
  linePixels: number;
  fillPixels: number;
}> {
  const canvas = page.locator('.maplibregl-canvas');
  const buffer = await canvas.screenshot({ type: 'png' });
  const png = decodePng(buffer);
  let linePixels = 0;
  let fillPixels = 0;
  for (let index = 0; index < png.width * png.height; index++) {
    const rgb: [number, number, number] = [
      png.data[index * 4],
      png.data[index * 4 + 1],
      png.data[index * 4 + 2],
    ];
    if (!withinTolerance(rgb, BACKGROUND_RGB, 8)) {
      if (withinTolerance(rgb, LINE_RGB, 24)) linePixels += 1;
      // Expected blend of #38BDF8 at fill-opacity 0.25 over #e8e4dc.
      if (withinTolerance(rgb, [188, 218, 227], 8)) fillPixels += 1;
    }
  }
  return { linePixels, fillPixels };
}

// Poll the real MapLibre canvas until the synthetic polygon outline and its
// fill blend are actually rendered (not an empty-basemap glitch).
async function expectPolygonPainted(page: Page) {
  await expect
    .poll(
      async () => {
        try {
          const counts = await readCanvasPixels(page);
          return counts.linePixels >= 50 && counts.fillPixels >= 500;
        } catch {
          return false;
        }
      },
      { timeout: 20_000, intervals: [250] },
    )
    .toBe(true);
  expect(page.workers().map((worker) => worker.url())).toContain(
    new URL('/api/maplibre-assets/maplibre-gl-worker.mjs', page.url()).href,
  );
}

// Same-origin guard, registered FIRST (route handlers run in reverse
// registration order, so later specific mocks take precedence via fallback).
async function blockExternalRequests(page: Page) {
  // Evidence for the run: forward browser-side errors and failed requests.
  page.on('worker', (worker) => {
    console.log('[browser-worker-created]', worker.url());
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      console.log('[browser-console-error]', message.type(), message.text());
    }
  });
  page.on('requestfailed', (request) => {
    console.log(
      '[browser-request-failed]',
      request.url(),
      request.failure()?.errorText,
    );
  });
  await page.route('**/*', (route: Route) => {
    const url = new URL(route.request().url());
    if (LOCAL_ORIGINS.has(url.origin)) return route.fallback();
    return route.abort();
  });
}

async function mockSharedInfra(page: Page, mockMarkers = true) {
  await page.route(`**${STYLE_PATH}`, (route) =>
    route.fulfill({
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
    }),
  );
  await page.route('**/api/map/config', (route) =>
    route.fulfill({
      json: {
        provider: {
          styleUrl: new URL(STYLE_PATH, route.request().url()).toString(),
          attribution: 'Synthetic local test map · OpenStreetMap',
          bounds: [105.93, 20.91, 106.03, 20.99],
          official: false,
        },
      },
    }),
  );
  if (mockMarkers) {
    await page.route('**/api/map/markers', (route) =>
      route.fulfill({ json: { markers: [] } }),
    );
  }
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ json: { user: null } }),
  );
}

test('unauthenticated marker response still renders the public basemap', async ({
  page,
}) => {
  await blockExternalRequests(page);
  await mockSharedInfra(page, false);

  const markerResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/map/markers',
  );
  await page.goto('/map');
  expect((await markerResponse).status()).toBe(401);

  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await expect(page.locator('.maplibregl-marker')).toHaveCount(0);
  await expect(page.locator('.maplibregl-popup')).toHaveCount(0);
  await expect(page.locator('a[href^="/incidents/"]')).toHaveCount(0);
  await expect(
    page.locator(
      'a[href^="/inspections/"]:not([href="/inspections/establishments"])',
    ),
  ).toHaveCount(0);
});

test('forbidden marker response denies the map without rendering map content', async ({
  page,
}) => {
  await blockExternalRequests(page);
  await mockSharedInfra(page, false);
  await page.route('**/api/map/markers', (route) =>
    route.fulfill({ status: 403, json: { error: 'Forbidden' } }),
  );

  const markerResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/map/markers',
  );
  await page.goto('/map');
  expect((await markerResponse).status()).toBe(403);

  await expect(
    page.getByRole('heading', {
      name: 'Không có quyền truy cập bản đồ',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
  await expect(page.locator('.maplibregl-marker')).toHaveCount(0);
  await expect(page.locator('.maplibregl-popup')).toHaveCount(0);
  await expect(page.locator('a[href^="/incidents/"]')).toHaveCount(0);
  await expect(
    page.locator(
      'a[href^="/inspections/"]:not([href="/inspections/establishments"])',
    ),
  ).toHaveCount(0);
});

test('focused LandParcel polygon renders in MapLibre and activates accessible popup', async ({
  page,
}) => {
  const parcelId = 'parcel-e2e-001';
  await blockExternalRequests(page);
  await mockSharedInfra(page);
  await page.route(`**/api/map/land-parcels/${parcelId}`, (route) =>
    route.fulfill({
      json: {
        parcel: {
          id: parcelId,
          parcelCode: 'PARCEL-E2E-001',
          mapSheetNumber: '12',
          parcelNumber: '34',
          status: 'active',
          geometry: FOCUS_POLYGON,
          updatedAt: '2026-10-20T00:00:00.000Z',
        },
        simulated: true,
        projection: 'land-parcel-map',
      },
    }),
  );

  await page.goto(`/map?parcelId=${parcelId}`);

  const focusSection = page.locator('section:has(#land-parcel-focus-heading)');
  await expect(
    focusSection.getByRole('heading', { name: 'PARCEL-E2E-001' }),
  ).toBeVisible();
  await expect(focusSection.getByText('active', { exact: true })).toBeVisible();
  await expect(page.locator('#land-parcel-focus-description')).toHaveText(
    'Thửa PARCEL-E2E-001, tờ 12, thửa 34, trạng thái active, dữ liệu mô phỏng nội bộ',
  );

  // Actual MapLibre canvas render of the focused polygon.
  await expectPolygonPainted(page);

  // The map camera is focused on the polygon bbox center, so a click at the
  // container center lands inside the polygon and triggers its click handler.
  await page.locator('[data-testid="map-canvas"]').click();

  const popup = page.locator('.maplibregl-popup');
  await expect(popup.getByText('PARCEL-E2E-001')).toBeVisible();
  await expect(popup.getByText('Trạng thái: active')).toBeVisible();
  await expect(popup.getByText('Dữ liệu mô phỏng nội bộ')).toBeVisible();
  const popupLink = popup.getByRole('link', { name: 'Xem chi tiết' });
  await expect(popupLink).toBeVisible();
  await expect(popupLink).toHaveAttribute('href', `/land/parcels/${parcelId}`);

  // Accessible selection flow with the safe detail route (asserted, navigated
  // nowhere — the detail page would need the real DB).
  await page.getByRole('button', { name: 'Chọn thửa đất trên bản đồ' }).click();
  const detailLink = page.getByRole('link', { name: 'Mở chi tiết thửa' });
  await expect(detailLink).toBeVisible();
  await expect(detailLink).toHaveAttribute('href', `/land/parcels/${parcelId}`);
});

test('discovery LandParcel polygon renders in MapLibre with accessible result and popup', async ({
  page,
  baseURL,
}) => {
  const parcelId = 'parc-disc-9';
  let discoveryUrl = '';
  await blockExternalRequests(page);
  await mockSharedInfra(page);
  await page.route('**/api/map/land-parcels?**', (route) => {
    discoveryUrl = route.request().url();
    return route.fulfill({
      json: {
        items: [
          {
            id: parcelId,
            parcelCode: 'PARC-DISC-9',
            mapSheetNumber: '12',
            parcelNumber: '34',
            status: 'proposed',
            geometry: DISCOVERY_POLYGON,
            updatedAt: '2026-10-21T00:00:00.000Z',
          },
        ],
        simulated: true,
        projection: 'land-parcel-map',
      },
    });
  });

  await page.goto('/map');

  await page.getByLabel('Mã thửa').fill('PARC-DISC-9');
  await page.getByRole('button', { name: 'Tìm thửa đất' }).click();

  expect(new URL(discoveryUrl, baseURL).searchParams.get('parcelCode')).toBe(
    'PARC-DISC-9',
  );
  expect(new URL(discoveryUrl, baseURL).searchParams.get('limit')).toBe('50');

  // Readable bounded result list, selection via keyboard-accessible button.
  const results = page.getByRole('list', {
    name: 'Kết quả thửa đất',
  });
  await expect(results).toBeVisible();
  const resultButton = results.getByRole('button');
  await expect(resultButton).toHaveCount(1);
  await expect(resultButton).toContainText('PARC-DISC-9');
  await expect(resultButton).toContainText('proposed');

  // Actual MapLibre canvas render of the discovery polygon (no focus P0).
  await expectPolygonPainted(page);

  await resultButton.click();
  const detailLink = page.getByRole('link', { name: 'Mở chi tiết thửa' });
  await expect(detailLink).toBeVisible();
  await expect(detailLink).toHaveAttribute('href', `/land/parcels/${parcelId}`);

  // Clicking the discovered polygon shows the same accessible popup content.
  await page.locator('[data-testid="map-canvas"]').click();
  const popup = page.locator('.maplibregl-popup');
  await expect(popup.getByText('PARC-DISC-9')).toBeVisible();
  await expect(popup.getByText('Trạng thái: proposed')).toBeVisible();
  await expect(popup.getByText('Dữ liệu mô phỏng nội bộ')).toBeVisible();
  await expect(
    popup.getByRole('link', { name: 'Xem chi tiết' }),
  ).toHaveAttribute('href', `/land/parcels/${parcelId}`);
});
