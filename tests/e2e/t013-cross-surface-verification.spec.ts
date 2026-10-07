import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const prototypeUrl = pathToFileURL(
  resolve(
    process.cwd(),
    '.scratch/civicos-uiux-alignment/ui/prototype/index.html',
  ),
).href;

const safeStates = [
  'loading',
  'empty',
  'forbidden',
  'not-found',
  'stale',
  'offline',
  'error',
] as const;

async function openPrototype(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(prototypeUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-route-panel="login"]')).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function touchTargetViolations(page: Page) {
  return page.locator('button:visible').evaluateAll((buttons: HTMLElement[]) =>
    buttons
      .map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          label: button.textContent?.trim() ?? '',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter(({ width, height }) => width < 44 || height < 44),
  );
}

test.describe('T-013 approved prototype cross-surface smoke', () => {
  test('desktop route/back/state/focus/privacy checks at 1440x900', async ({
    page,
  }) => {
    await openPrototype(page, 1440, 900);

    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.locator('[data-route-panel="home"]')).toBeVisible();

    const menu = page.locator('#menu-trigger');
    const drawer = page.locator('#drawer');
    await menu.click();
    await expect(drawer).toHaveAttribute('aria-hidden', 'false');
    await expect(drawer).toBeFocused();
    await drawer
      .getByRole('button', { name: 'Đóng điều hướng', exact: true })
      .click();
    await expect(drawer).toHaveAttribute('aria-hidden', 'true');
    await expect(menu).toBeFocused();

    const incident = page.locator('[data-route-panel="incident"]');
    await page
      .locator('[data-route-panel="home"]')
      .getByRole('button', { name: 'Mở phân hệ →', exact: true })
      .click();
    await expect(incident).toBeVisible();
    await incident
      .getByRole('button', { name: 'Về hàng đợi', exact: true })
      .click();
    await expect(page.locator('[data-route-panel="home"]')).toBeVisible();

    const land = page.locator('[data-route-panel="land"]');
    await page.locator('.route-tabs [data-route="land"]').click();
    await expect(land).toBeVisible();
    await expect(land.locator('.simulated')).toBeVisible();
    const safeStateVisibility: Array<{ state: string; display: string }> = [];
    for (const state of safeStates) {
      await land.locator(`[data-state-value="${state}"]`).click();
      await expect(land.locator('[data-state-card="land"]')).toHaveAttribute(
        'data-state',
        state,
      );
      await expect(land.locator('.provider-frame')).toHaveAttribute(
        'hidden',
        '',
      );
      if (await land.locator('.provider-frame').isVisible()) {
        safeStateVisibility.push({
          state,
          display: await land
            .locator('.provider-frame')
            .evaluate((element) => getComputedStyle(element).display),
        });
      }
    }
    await land
      .locator('[data-state-controls="land"] [data-state-value="ready"]')
      .click();
    await expect(land.locator('.provider-frame')).toBeVisible();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page
      .locator('.route-tabs [data-route="mobileA"][data-surface="Map"]')
      .click();
    const mobileA = page.locator('[data-route-panel="mobileA"]');
    await expect(mobileA).toBeVisible();
    await expect(mobileA).toHaveCSS('animation-name', 'none');
    await mobileA
      .locator('[data-route="mobileB"][data-surface="Incident"]')
      .first()
      .click();
    await expect(page.locator('[data-route-panel="mobileB"] h1')).toHaveText(
      'Incident',
    );
    await page
      .locator('[data-route-panel="mobileB"] [data-action="back"]')
      .click();
    await expect(mobileA).toBeVisible();
    await expect(mobileA.locator('h1')).toHaveText('Map');

    await expectNoHorizontalOverflow(page);
    expect({
      safeStateVisibility,
      touchTargets: await touchTargetViolations(page),
    }).toEqual({
      safeStateVisibility: [],
      touchTargets: [],
    });
  });

  test('mobile route/deep-link/state/focus checks at 390x844', async ({
    page,
  }) => {
    await openPrototype(page, 390, 844);

    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.locator('[data-route-panel="home"]')).toBeVisible();

    const menu = page.locator('#menu-trigger');
    const drawer = page.locator('#drawer');
    await menu.click();
    await expect(drawer).toHaveAttribute('aria-hidden', 'false');
    await expect(drawer).toBeFocused();
    await drawer
      .getByRole('button', { name: 'Đóng điều hướng', exact: true })
      .click();
    await expect(drawer).toHaveAttribute('aria-hidden', 'true');
    await expect(menu).toBeFocused();

    const surfaces = [
      ['mobileA', 'Map'],
      ['mobileA', 'RelatedInfo'],
      ['mobileB', 'Alarms'],
      ['mobileB', 'Dispatches'],
      ['mobileB', 'Tasks'],
      ['mobileB', 'Incident'],
      ['mobileB', 'Đất đai'],
      ['mobileB', 'Settings'],
    ] as const;
    for (const [route, surface] of surfaces) {
      await page
        .locator(
          `.route-tabs [data-route="${route}"][data-surface="${surface}"]`,
        )
        .click();
      await expect(page.locator(`[data-route-panel="${route}"]`)).toBeVisible();
      await expect(page.locator(`[data-route-panel="${route}"] h1`)).toHaveText(
        surface,
      );
    }

    await page
      .locator('.route-tabs [data-route="mobileA"][data-surface="Map"]')
      .click();
    const mobileA = page.locator('[data-route-panel="mobileA"]');
    await mobileA
      .locator('[data-route="mobileB"][data-surface="Incident"]')
      .first()
      .click();
    await expect(page.locator('[data-route-panel="mobileB"] h1')).toHaveText(
      'Incident',
    );
    await page
      .locator('[data-route-panel="mobileB"] [data-action="back"]')
      .click();
    await expect(mobileA).toBeVisible();
    await expect(mobileA.locator('h1')).toHaveText('Map');

    const safeStateVisibility: Array<{ state: string; display: string }> = [];
    for (const state of safeStates) {
      await mobileA.locator(`[data-state-value="${state}"]`).click();
      await expect(
        mobileA.locator('[data-state-card="mobileA"]'),
      ).toHaveAttribute('data-state', state);
      await expect(mobileA.locator('.provider-frame')).toHaveAttribute(
        'hidden',
        '',
      );
      if (await mobileA.locator('.provider-frame').isVisible()) {
        safeStateVisibility.push({
          state,
          display: await mobileA
            .locator('.provider-frame')
            .evaluate((element) => getComputedStyle(element).display),
        });
      }
    }
    await mobileA
      .locator('[data-state-controls="mobileA"] [data-state-value="ready"]')
      .click();
    await expect(mobileA.locator('.provider-frame')).toBeVisible();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(mobileA).toHaveCSS('animation-name', 'none');
    await expectNoHorizontalOverflow(page);
    expect({
      safeStateVisibility,
      touchTargets: await touchTargetViolations(page),
    }).toEqual({
      safeStateVisibility: [],
      touchTargets: [],
    });
  });
});
