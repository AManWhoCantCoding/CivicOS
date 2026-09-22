import { expect, test, type Page } from '@playwright/test';

type SeedItem = {
  id: string;
  commandType: string;
  resourceType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  payloadVersion: number;
  status: 'pending' | 'syncing' | 'failed' | 'rejected' | 'synced';
  error?: string;
};

function seedItem(id: string, status: SeedItem['status'], error?: string) {
  return {
    id,
    commandType: 'test.append',
    resourceType: 'TestResource',
    occurredAt: '2026-09-19T01:00:00.000Z',
    payload: {},
    payloadVersion: 1,
    status,
    ...(error ? { error } : {}),
  };
}

async function seedQueue(page: Page, items: SeedItem[]) {
  await page.evaluate((entries) => {
    localStorage.setItem('civicos:offline-queue', JSON.stringify(entries));
    window.dispatchEvent(new Event('civicos:offline-queue'));
  }, items);
}

async function seedQueueBeforeLoad(page: Page, items: SeedItem[]) {
  await page.addInitScript((entries) => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    localStorage.setItem('civicos:offline-queue', JSON.stringify(entries));
  }, items);
}

async function restoreOnline(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });
}

function syncError(page: Page) {
  return page.locator(
    'section[aria-label="Trạng thái đồng bộ"] p[role="alert"]',
  );
}

test('field shell exposes an offline status surface', async ({ page }) => {
  await page.goto('/field/offline');
  await expect(page.getByText('Trạng thái thiết bị')).toBeVisible();
  await expect(page.getByText('Kết nối', { exact: true })).toBeVisible();
});

test('field shell counts pending, failed, and synced states and persists them across reload', async ({
  page,
}) => {
  await page.goto('/field/offline');
  await seedQueue(page, [
    seedItem('shell-synced-1', 'synced'),
    seedItem('shell-synced-2', 'synced'),
    seedItem('shell-rejected-1', 'rejected', 'STALE_OFFLINE_COMMAND'),
  ]);
  await expect(page.getByTestId('queue-pending-count')).toHaveText('0');
  await expect(page.getByTestId('queue-failed-count')).toHaveText('1');
  await expect(page.getByTestId('queue-synced-count')).toHaveText('2');
  await expect(syncError(page)).toContainText('STALE_OFFLINE_COMMAND');

  await page.reload();
  await expect(page.getByTestId('queue-pending-count')).toHaveText('0');
  await expect(page.getByTestId('queue-failed-count')).toHaveText('1');
  await expect(page.getByTestId('queue-synced-count')).toHaveText('2');
  await expect(syncError(page)).toContainText('STALE_OFFLINE_COMMAND');
});

test('field shell moves a pending command to failed on server error through keyboard retry', async ({
  page,
}) => {
  await page.route('**/api/sync', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'SYNC_UNAVAILABLE' }),
      });
    } else {
      await route.continue();
    }
  });
  await seedQueueBeforeLoad(page, [seedItem('shell-pending-1', 'pending')]);
  await page.goto('/field/offline');
  await expect(page.getByTestId('queue-pending-count')).toHaveText('1');

  await restoreOnline(page);
  const retry = page.getByRole('button', { name: 'Đồng bộ ngay' });
  await expect(retry).toBeVisible();
  await retry.focus();
  await expect(retry).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('queue-pending-count')).toHaveText('0');
  await expect(page.getByTestId('queue-failed-count')).toHaveText('1');
  await expect(syncError(page)).toContainText('SYNC_UNAVAILABLE');
});

test('field shell recovers a failed command to synced on retry success', async ({
  page,
}) => {
  await page.route('**/api/sync', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          command: { status: 'synced', response: { ok: true }, error: null },
        }),
      });
    } else {
      await route.continue();
    }
  });
  await seedQueueBeforeLoad(page, [
    seedItem('shell-failed-1', 'failed', 'SYNC_UNAVAILABLE'),
  ]);
  await page.goto('/field/offline');
  await expect(page.getByTestId('queue-failed-count')).toHaveText('1');

  await restoreOnline(page);
  await page.getByRole('button', { name: 'Đồng bộ ngay' }).click();

  await expect(page.getByTestId('queue-failed-count')).toHaveText('0');
  await expect(page.getByTestId('queue-synced-count')).toHaveText('1');
});

test('field shell reflects offline and online transitions', async ({
  page,
}) => {
  await page.goto('/field/offline');
  await expect(page.getByText('Online')).toBeVisible();
  await expect(page.getByText('Đang kết nối máy chủ.')).toBeVisible();

  await page.context().setOffline(true);
  await expect(page.getByText('Offline')).toBeVisible();
  await expect(
    page.getByText('Đang ngoại tuyến. Thao tác mới sẽ chờ đồng bộ.'),
  ).toBeVisible();

  await page.context().setOffline(false);
  await expect(page.getByText('Online')).toBeVisible();
  await expect(page.getByText('Đang kết nối máy chủ.')).toBeVisible();
});

test('field shell primary sync action meets touch target and contrast preflight', async ({
  page,
}) => {
  await page.goto('/field/offline');
  const retry = page.getByRole('button', { name: 'Đồng bộ ngay' });
  await expect(retry).toBeVisible();
  await retry.focus();
  await expect(retry).toBeFocused();
  const box = await retry.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  const preflight = await page.evaluate(() => {
    function toRgba(value: string) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const data = context.getImageData(0, 0, 1, 1).data;
      return [data[0]!, data[1]!, data[2]!, data[3]! / 255];
    }
    function toRgb(value: string) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const data = context.getImageData(0, 0, 1, 1).data;
      return [data[0]!, data[1]!, data[2]!, data[3]! / 255];
    }
    function effectiveBackground(element: Element | null) {
      let current = element;
      while (current) {
        const background = getComputedStyle(current).backgroundColor;
        const raw = toRgba(background);
        if (raw[3]! > 0.01) return background;
        current = current.parentElement;
      }
      return 'rgb(255, 255, 255)';
    }
    function luminance(channels: number[]) {
      const linear = channels.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
    }
    function contrast(foreground: string, background: string) {
      const foregroundLuminance = luminance(toRgb(foreground).slice(0, 3));
      const backgroundLuminance = luminance(toRgb(background).slice(0, 3));
      const lighter = Math.max(foregroundLuminance, backgroundLuminance);
      const darker = Math.min(foregroundLuminance, backgroundLuminance);
      return (lighter + 0.05) / (darker + 0.05);
    }
    const action = document.querySelector(
      'section[aria-label="Trạng thái đồng bộ"] button',
    );
    const status = document.querySelector(
      'section[aria-label="Trạng thái đồng bộ"] p.mt-2',
    );
    if (!action || !status) return null;
    const actionForeground = getComputedStyle(action).color;
    const actionBackground = effectiveBackground(action);
    const statusForeground = getComputedStyle(status).color;
    const statusBackground = effectiveBackground(status);
    const actionBox = action.getBoundingClientRect();
    return {
      actionRatio: contrast(actionForeground, actionBackground),
      statusRatio: contrast(statusForeground, statusBackground),
      actionHeight: actionBox.height,
    };
  });
  expect(preflight).not.toBeNull();
  expect(preflight!.actionHeight).toBeGreaterThanOrEqual(44);
  expect(preflight!.actionRatio).toBeGreaterThanOrEqual(4.5);
  expect(preflight!.statusRatio).toBeGreaterThanOrEqual(4.5);
});
test('field shell keeps every label and action usable with reduced motion', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/field/offline');
  await expect(page.getByText('Trạng thái thiết bị')).toBeVisible();
  await expect(page.getByText('Kết nối', { exact: true })).toBeVisible();
  await expect(page.getByText('Chờ gửi')).toBeVisible();
  await expect(page.getByText('Lỗi/từ chối')).toBeVisible();
  await expect(page.getByText('Đã xác nhận')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Đồng bộ ngay' }),
  ).toBeVisible();
  await context.close();
});
