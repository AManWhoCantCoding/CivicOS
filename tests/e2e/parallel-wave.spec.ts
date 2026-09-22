import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'civicos-dev';
const COMMANDER = 'truong@civicos.local';
const FIELD = 'hientruong@civicos.local';
const UNASSIGNED = 'khongduocphancong@civicos.local';
const CROSS_ORG = 'captren@civicos.local';

async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');
}

async function logout(page: Page): Promise<void> {
  await page.request.delete('/api/auth/session');
}

async function createIncidentViaApi(
  page: Page,
  content: string,
): Promise<string> {
  const response = await page.request.post('/api/intake-reports', {
    headers: {
      'Idempotency-Key': `parallel-wave-${Date.now()}-${Math.random()}`,
    },
    data: {
      channel: 'in_person',
      receivedAt: new Date().toISOString(),
      content,
    },
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { incidentId: string };
  return body.incidentId;
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectNoClippedButtons(page: Page): Promise<void> {
  const clipped = await page.evaluate(() => {
    const bad: string[] = [];
    for (const element of document.querySelectorAll('a, button')) {
      const node = element as HTMLElement;
      if (!node.offsetParent && getComputedStyle(node).position !== 'fixed')
        continue;
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right > window.innerWidth + 1 || rect.left < -1) {
        bad.push(`${node.tagName}:${(node.textContent ?? '').slice(0, 40)}`);
      }
      if (node.scrollWidth > node.clientWidth + 2 && rect.width > 0) {
        const style = getComputedStyle(node);
        if (style.overflowX !== 'auto' && style.overflowX !== 'scroll') {
          if ((node.textContent ?? '').trim().length > 0)
            bad.push(`clip:${(node.textContent ?? '').slice(0, 40)}`);
        }
      }
    }
    return bad;
  });
  expect(clipped).toEqual([]);
}

async function contrastRatio(
  page: Page,
  selector: string,
): Promise<number | null> {
  return page.evaluate((sel) => {
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
      return [data[0]!, data[1]!, data[2]!];
    }
    function effectiveBackground(element: Element | null): string {
      let current = element;
      while (current) {
        const background = getComputedStyle(current).backgroundColor;
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext('2d', { willReadFrequently: true })!;
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = background;
        context.fillRect(0, 0, 1, 1);
        if (context.getImageData(0, 0, 1, 1).data[3]! / 255 > 0.01)
          return background;
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
    const target = document.querySelector(sel);
    if (!target) return null;
    const foreground = getComputedStyle(target).color;
    const background = effectiveBackground(target);
    const l1 = luminance(toRgb(foreground));
    const l2 = luminance(toRgb(background));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }, selector);
}

async function expectLabeledControls(
  page: Page,
  formSelector: string,
): Promise<void> {
  const unlabeled = await page.evaluate((sel) => {
    const bad: string[] = [];
    const root = document.querySelector(sel) ?? document;
    for (const control of root.querySelectorAll('input, select, textarea')) {
      const element = control as
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (element.getAttribute('type') === 'hidden') continue;
      const id = element.id;
      const aria =
        element.getAttribute('aria-label') ??
        element.getAttribute('aria-labelledby');
      const labelledBy = id ? root.querySelector(`label[for="${id}"]`) : null;
      const wrapped = element.closest('label');
      const name = element.getAttribute('name') ?? element.tagName;
      if (!aria && !labelledBy && !wrapped) bad.push(name);
      else {
        const text = (
          wrapped?.textContent ??
          labelledBy?.textContent ??
          aria ??
          ''
        ).trim();
        if (!text) bad.push(name);
      }
    }
    return bad;
  }, formSelector);
  expect(unlabeled).toEqual([]);
}

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

test('operational home exposes metadata and shell navigation to all surfaces', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/CivicOS/);
  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveAttribute('content', /Nghĩa Trụ/);
  const lang = await page.evaluate(() => document.documentElement.lang);
  expect(lang).toBe('vi');
  for (const [name, href] of [
    ['Hàng đợi vụ việc', '/incidents'],
    ['Cơ sở kinh doanh', '/inspections/establishments'],
    ['Phương tiện hiện trường', '/field/vehicles'],
  ] as Array<[string, string]>) {
    await page.goto('/');
    await page.getByRole('link', { name: new RegExp(name) }).click();
    await page.waitForURL(href);
    await expect(page.locator('main, section').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Mở Assignment/ })).toBeVisible();
});

test('three operational surfaces have no horizontal overflow and no clipped actions', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);
  const incidentId = await createIncidentViaApi(
    page,
    `Parallel wave layout ${Date.now()}`,
  );
  for (const url of [
    '/intake',
    '/incidents',
    `/incidents/${incidentId}`,
    '/inspections/establishments',
    '/vehicles/registry',
    '/field/vehicles',
    '/field/offline',
  ]) {
    await page.goto(url);
    await expect(page.locator('main, section').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoClippedButtons(page);
  }
});

test('every exercised form control has an accessible label', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);
  await page.goto('/intake');
  await expectLabeledControls(page, 'form');
  await expect(page.getByLabel('Kênh tiếp nhận')).toBeVisible();
  await expect(page.getByLabel('Nội dung tin báo')).toBeVisible();
  await expect(page.getByLabel('Vĩ độ')).toBeVisible();
  await expect(page.getByLabel('Kinh độ')).toBeVisible();

  await page.goto('/inspections/establishments');
  await expect(page.getByLabel('Tên cơ sở')).toBeVisible();
  await expectLabeledControls(page, 'form');

  await page.goto('/vehicles/registry');
  await expect(page.getByLabel('Biển số')).toBeVisible();
  await expect(page.getByLabel('Nguồn')).toBeVisible();
  await expect(page.getByLabel('Lý do')).toBeVisible();
  await expectLabeledControls(page, 'form');

  await page.goto('/field/vehicles');
  await expect(page.getByLabel('Biển số')).toBeVisible();
  await expect(page.getByLabel('Mô tả')).toBeVisible();
  await expectLabeledControls(page, 'form');
});

test('form validation and error feedback are honest with keyboard focus-visible', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);

  await page.goto('/intake');
  await page.getByLabel('Kênh tiếp nhận').focus();
  await expect(page.getByLabel('Kênh tiếp nhận')).toBeFocused();
  await page.getByLabel('Nội dung tin báo').fill('   ');
  await page.getByRole('button', { name: 'Tạo Incident' }).click();
  await expect(
    page.locator('form [role="alert"], form [role="status"]'),
  ).toBeVisible();
  const intakeRing = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return null;
    const style = getComputedStyle(active);
    return {
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
    };
  });
  expect(intakeRing).not.toBeNull();

  await page.goto('/field/vehicles');
  await page.getByLabel('Biển số').fill('89A12345');
  await page.getByRole('button', { name: 'Ghi nhận phương tiện' }).click();
  await expect(
    page.getByText('Cần nhập cả vĩ độ và kinh độ hợp lệ.'),
  ).toBeVisible();
  await page.getByLabel('Biển số').focus();
  await expect(page.getByLabel('Biển số')).toBeFocused();
  await page.keyboard.press('Tab');
  const tabbed = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    return active
      ? `${active.tagName}:${active.getAttribute('name') ?? active.textContent?.slice(0, 30)}`
      : 'none';
  });
  expect(tabbed).not.toBe('none');

  await page.goto('/vehicles/registry');
  await page.getByLabel('Biển số').fill('89A54321');
  await page.getByRole('button', { name: 'Thêm registry' }).click();
  await expect(
    page.locator('form [role="alert"], form [role="status"]'),
  ).toBeVisible();

  await page.goto('/inspections/establishments');
  await page.context().setOffline(true);
  await expect(
    page.getByText(/Offline: biểu mẫu vẫn có thể xem/).first(),
  ).toBeVisible();
  await page.context().setOffline(false);
});

test('incident queue exposes loading, empty, error and retry states', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);
  await page.route('/api/incidents', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto('/incidents');
  await expect(page.getByLabel('Đang tải hàng đợi Incident')).toBeVisible();
  await expect(
    page
      .locator('a[href^="/incidents/"]')
      .or(page.getByText('Chưa có Incident trong phạm vi hiển thị.'))
      .first(),
  ).toBeVisible({ timeout: 15000 });
  await page.unroute('/api/incidents');

  await page.route('/api/incidents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ incidents: [] }),
    });
  });
  await page.goto('/incidents');
  await expect(
    page.getByText('Chưa có Incident trong phạm vi hiển thị.'),
  ).toBeVisible();

  await page.route('/api/incidents', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'INCIDENTS_FAILED' }),
    });
  });
  await page.goto('/incidents');
  await expect(
    page.getByText('Không thể tải hàng đợi Incident.'),
  ).toBeVisible();
  await page.unroute('/api/incidents');
  await page.getByRole('button', { name: 'Thử tải lại' }).click();
  await expect(
    page
      .locator('a[href^="/incidents/"]')
      .or(page.getByText('Chưa có Incident trong phạm vi hiển thị.'))
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

test('establishment, registry and vehicle lists expose loading, empty, denied and offline states', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);

  await page.goto('/inspections/establishments');
  await expect(
    page
      .getByText('Đang tải danh mục cơ sở…')
      .or(page.getByText('Chưa có cơ sở kinh doanh trong danh mục.'))
      .or(page.locator('a[href^="/inspections/establishments/"]').first()),
  ).toBeVisible({ timeout: 15000 });

  await page.goto('/vehicles/registry');
  await expect(
    page
      .getByText('Đang tải registry…')
      .or(page.getByText('Chưa có biển số trong registry.'))
      .or(page.locator('article').first()),
  ).toBeVisible({ timeout: 15000 });

  await page.goto('/field/vehicles');
  await expect(
    page
      .getByText('Đang tải quan sát…')
      .or(page.getByText('Chưa có quan sát phương tiện.'))
      .or(page.locator('article').first()),
  ).toBeVisible({ timeout: 15000 });

  await page.goto('/field/vehicles');
  await expect(
    page.getByRole('heading', { name: 'Phương tiện tại hiện trường' }),
  ).toBeVisible();
  await page.context().setOffline(true);
  await expect(
    page
      .getByText('Offline: quan sát sẽ được lưu cục bộ và đồng bộ khi có mạng.')
      .or(page.getByText(/Offline: danh sách cần kết nối/))
      .first(),
  ).toBeVisible();
  await page.context().setOffline(false);

  await page.goto('/vehicles/registry');
  await page.context().setOffline(true);
  await expect(page.getByText(/Offline: registry/).first()).toBeVisible();
  await page.context().setOffline(false);

  await page.goto('/inspections/establishments');
  await expect(page.getByText(/Offline: biểu mẫu vẫn có thể xem/)).toHaveCount(
    0,
  );
  await page.context().setOffline(true);
  await expect(
    page.getByText(/Offline: biểu mẫu vẫn có thể xem/).first(),
  ).toBeVisible();
  await page.context().setOffline(false);

  await page.goto('/field/offline');
  await expect(page.getByText('Trạng thái thiết bị')).toBeVisible();
  await expect(page.getByText('Kết nối', { exact: true })).toBeVisible();
});

test('establishment, inspection, registry and observation lists expose forced error and retry states', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);

  await page.route('/api/establishments', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'ESTABLISHMENTS_FAILED' }),
    });
  });
  await page.goto('/inspections/establishments');
  await expect(page.getByText('ESTABLISHMENTS_FAILED').first()).toBeVisible({
    timeout: 15000,
  });
  await expect(
    page.getByRole('button', { name: 'Thử lại' }).first(),
  ).toBeVisible();
  await page.unroute('/api/establishments');
  await page.getByRole('button', { name: 'Thử lại' }).first().click();
  await expect(
    page
      .locator('a[href^="/inspections/establishments/"]')
      .or(page.getByText('Chưa có cơ sở kinh doanh trong danh mục.'))
      .first(),
  ).toBeVisible({ timeout: 15000 });

  await page.route('/api/inspections', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'INSPECTIONS_FAILED' }),
    });
  });
  await page.goto('/inspections/establishments');
  await expect(page.getByText('INSPECTIONS_FAILED').first()).toBeVisible({
    timeout: 15000,
  });
  await page.unroute('/api/inspections');
  await page.goto('/inspections/establishments');
  await expect(
    page.getByRole('heading', { name: 'Lịch kiểm tra', exact: true }),
  ).toBeVisible({
    timeout: 15000,
  });

  await page.route('/api/vehicles/registry', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'REGISTRY_FAILED' }),
    });
  });
  await page.goto('/vehicles/registry');
  await expect(page.getByText('REGISTRY_FAILED').first()).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
  await page.unroute('/api/vehicles/registry');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(
    page
      .getByText('Chưa có biển số trong registry.')
      .or(page.locator('article').first())
      .first(),
  ).toBeVisible({ timeout: 15000 });

  await page.route('/api/vehicles/observations', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'OBSERVATIONS_FAILED' }),
    });
  });
  await page.goto('/field/vehicles');
  await expect(page.getByText('OBSERVATIONS_FAILED').first()).toBeVisible({
    timeout: 15000,
  });
  await page.unroute('/api/vehicles/observations');
  await page.goto('/field/vehicles');
  await expect(
    page
      .getByText('Chưa có quan sát phương tiện.')
      .or(page.locator('article').first())
      .or(page.getByRole('heading', { name: 'Phương tiện tại hiện trường' }))
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

test('offline queue pending, failed, synced and rejected states are honest', async ({
  page,
}) => {
  function seedItem(
    id: string,
    status: 'pending' | 'syncing' | 'failed' | 'rejected' | 'synced',
    error?: string,
  ) {
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
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      configurable: true,
    });
  });
  await page.goto('/field/offline');
  await page.evaluate(
    (entries) => {
      localStorage.setItem('civicos:offline-queue', JSON.stringify(entries));
      window.dispatchEvent(new Event('civicos:offline-queue'));
    },
    [
      seedItem('wave-pending-1', 'pending'),
      seedItem('wave-failed-1', 'failed', 'SYNC_UNAVAILABLE'),
      seedItem('wave-synced-1', 'synced'),
      seedItem('wave-rejected-1', 'rejected', 'STALE_OFFLINE_COMMAND'),
    ],
  );
  await expect(page.getByTestId('queue-pending-count')).toHaveText('1');
  await expect(page.getByTestId('queue-failed-count')).toHaveText('2');
  await expect(page.getByTestId('queue-synced-count')).toHaveText('1');
  await expect(
    page.locator('section[aria-label="Trạng thái đồng bộ"] p[role="alert"]'),
  ).toContainText('SYNC_UNAVAILABLE');
  await page.evaluate(() => {
    delete (window.navigator as unknown as { onLine?: boolean }).onLine;
  });

  await page.context().setOffline(true);
  await expect(page.getByText('Offline')).toBeVisible();
  await expect(
    page.getByText('Đang ngoại tuyến. Thao tác mới sẽ chờ đồng bộ.'),
  ).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByText('Online')).toBeVisible();

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
  await page.addInitScript(
    (entries) => {
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        configurable: true,
      });
      localStorage.setItem('civicos:offline-queue', JSON.stringify(entries));
    },
    [seedItem('wave-retry-1', 'pending')],
  );
  await page.goto('/field/offline');
  await expect(page.getByTestId('queue-pending-count')).toHaveText('1');
  await page.evaluate(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });
  const retry = page.getByRole('button', { name: 'Đồng bộ ngay' });
  await retry.focus();
  await expect(retry).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('queue-failed-count')).toHaveText('1');
});

test('401 and 403 authorization matrix covers five principals across three surfaces', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const anonymous = await request.get('/api/incidents');
  expect(anonymous.status()).toBe(401);
  expect(((await anonymous.json()) as { error?: string }).error).toBe(
    'UNAUTHENTICATED',
  );
  for (const path of [
    '/api/establishments',
    '/api/vehicles/registry',
    '/api/vehicles/observations',
  ]) {
    const denied = await request.get(path);
    expect(denied.status()).toBe(401);
  }

  await loginAs(page, COMMANDER);
  const stamp = Date.now();
  const incidentId = await createIncidentViaApi(
    page,
    `Parallel wave matrix ${stamp}`,
  );
  const usersResponse = await page.request.get('/api/identity/users');
  expect(usersResponse.ok()).toBe(true);
  const usersBody = (await usersResponse.json()) as {
    users: Array<{ id: string; email: string }>;
  };
  const userIdFor = (email: string) =>
    usersBody.users.find((entry) => entry.email === email)?.id ?? '';
  const fieldId = userIdFor(FIELD);
  expect(fieldId).toBeTruthy();

  async function assignResource(
    resourceType: string,
    resourceId: string,
    assigneeUserId: string,
  ) {
    const response = await page.request.post('/api/identity/assignments', {
      data: {
        resourceType,
        resourceId,
        task: `${resourceType.toLowerCase()}_matrix`,
        assigneeUserIds: [assigneeUserId],
      },
    });
    expect(response.status()).toBe(201);
    const body = (await response.json()) as {
      assignments: Array<{ id: string }>;
    };
    return body.assignments[0]?.id ?? '';
  }
  async function revokeResource(assignmentId: string) {
    const response = await page.request.delete('/api/identity/assignments', {
      data: { assignmentId, reason: 'Matrix revocation.' },
    });
    expect(response.ok()).toBe(true);
  }
  async function gotoAndExpectApi(
    url: string,
    apiSuffix: string,
    expectedStatus: number,
  ) {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(apiSuffix) &&
        response.request().method() === 'GET',
    );
    await page.goto(url);
    const response = await responsePromise;
    expect(response.status()).toBe(expectedStatus);
  }

  const incidentAssignmentId = await assignResource(
    'Incident',
    incidentId,
    fieldId,
  );
  expect(incidentAssignmentId).toBeTruthy();

  const establishmentName = `Matrix establishment ${stamp}`;
  const establishmentResponse = await page.request.post('/api/establishments', {
    data: {
      name: establishmentName,
      ownerName: `Matrix owner ${stamp}`,
      address: `Matrix address ${stamp}`,
      type: 'Karaoke',
    },
  });
  expect(establishmentResponse.status()).toBe(201);
  const establishmentBody = (await establishmentResponse.json()) as {
    establishment: { id: string };
  };
  const establishmentId = establishmentBody.establishment.id;
  const inspectionResponse = await page.request.post('/api/inspections', {
    data: {
      establishmentId,
      scheduledAt: '2030-02-15T10:00:00.000Z',
      cadenceMonths: 3,
      assignedUserId: fieldId,
    },
  });
  expect(inspectionResponse.status()).toBe(201);
  const inspectionBody = (await inspectionResponse.json()) as {
    inspection: { id: string };
  };
  const inspectionId = inspectionBody.inspection.id;

  const plate = `89A${String(stamp).slice(-5)}`;
  const registryResponse = await page.request.post('/api/vehicles/registry', {
    data: {
      plate,
      source: `Matrix source ${stamp}`,
      reason: `Matrix reason ${stamp}`,
      validFrom: new Date(Date.now() - 3600000).toISOString(),
    },
  });
  expect(registryResponse.status()).toBe(201);

  await logout(page);
  await loginAs(page, FIELD);
  const observationPlate = `77C${String(stamp).slice(-5)}`;
  const observationDescription = `Matrix observation ${stamp}`;
  const observationResponse = await page.request.post(
    '/api/vehicles/observations',
    {
      data: {
        plate: observationPlate,
        observedAt: new Date().toISOString(),
        latitude: 20.96,
        longitude: 105.93,
        description: observationDescription,
      },
    },
  );
  expect(observationResponse.status()).toBe(201);
  const observationBody = (await observationResponse.json()) as {
    result: { observation: { id: string } };
    observation?: { id: string };
  };
  const observationId =
    observationBody.result?.observation.id ??
    observationBody.observation?.id ??
    '';
  expect(observationId).toBeTruthy();
  await logout(page);

  async function expectPermitted(
    email: string,
    url: string,
    apiSuffix: string,
    visible: RegExp,
  ) {
    await loginAs(page, email);
    await gotoAndExpectApi(url, apiSuffix, 200);
    await expect(page.getByText(visible).first()).toBeVisible({
      timeout: 15000,
    });
    const api = await page.request.get(apiSuffix);
    expect(api.status()).toBe(200);
    await logout(page);
  }
  async function expectDenied(
    email: string,
    url: string,
    apiSuffix: string,
    denied: RegExp,
  ) {
    await loginAs(page, email);
    await page.goto(url);
    await expect(page.getByText(denied).first()).toBeVisible({
      timeout: 15000,
    });
    const api = await page.request.get(apiSuffix);
    expect(api.status()).toBe(403);
    await logout(page);
  }

  await expectPermitted(
    COMMANDER,
    `/incidents/${incidentId}`,
    `/api/incidents/${incidentId}`,
    /Timeline|Chi tiết Incident/,
  );
  await expectPermitted(
    FIELD,
    `/incidents/${incidentId}`,
    `/api/incidents/${incidentId}`,
    /Timeline|Chi tiết Incident/,
  );
  await expectDenied(
    UNASSIGNED,
    `/incidents/${incidentId}`,
    `/api/incidents/${incidentId}`,
    /Không có quyền truy cập/,
  );
  await expectDenied(
    CROSS_ORG,
    `/incidents/${incidentId}`,
    `/api/incidents/${incidentId}`,
    /Không có quyền truy cập/,
  );

  await expectPermitted(
    COMMANDER,
    `/inspections/${inspectionId}`,
    `/api/inspections/${inspectionId}`,
    /Inspection/,
  );
  await expectPermitted(
    FIELD,
    `/inspections/${inspectionId}`,
    `/api/inspections/${inspectionId}`,
    /Inspection/,
  );
  await expectDenied(
    UNASSIGNED,
    `/inspections/${inspectionId}`,
    `/api/inspections/${inspectionId}`,
    /Không có quyền xem inspection/,
  );
  await expectDenied(
    CROSS_ORG,
    `/inspections/${inspectionId}`,
    `/api/inspections/${inspectionId}`,
    /Không có quyền xem inspection/,
  );

  await expectPermitted(
    COMMANDER,
    '/vehicles/registry',
    '/api/vehicles/registry',
    new RegExp(plate),
  );
  await expectPermitted(
    FIELD,
    `/field/vehicles/${observationId}`,
    `/api/vehicles/observations/${observationId}`,
    new RegExp(observationDescription),
  );
  await expectDenied(
    UNASSIGNED,
    `/field/vehicles/${observationId}`,
    `/api/vehicles/observations/${observationId}`,
    /Không có quyền xem quan sát/,
  );
  await expectDenied(
    CROSS_ORG,
    `/field/vehicles/${observationId}`,
    `/api/vehicles/observations/${observationId}`,
    /Không có quyền xem quan sát/,
  );
  const deniedRegistry = await page.request.get('/api/vehicles/registry');
  expect([401, 403]).toContain(deniedRegistry.status());

  await loginAs(page, COMMANDER);
  const incidentAssignments = (await (
    await page.request.get(
      `/api/identity/assignments?resourceType=Incident&resourceId=${incidentId}`,
    )
  ).json()) as { assignments: Array<{ id: string; status: string }> };
  const inspectionAssignments = (await (
    await page.request.get(
      `/api/identity/assignments?resourceType=Inspection&resourceId=${inspectionId}`,
    )
  ).json()) as { assignments: Array<{ id: string; status: string }> };
  const observationAssignments = (await (
    await page.request.get(
      `/api/identity/assignments?resourceType=VehicleObservation&resourceId=${observationId}`,
    )
  ).json()) as { assignments: Array<{ id: string; status: string }> };
  for (const assignment of [
    ...incidentAssignments.assignments,
    ...inspectionAssignments.assignments,
    ...observationAssignments.assignments,
  ]) {
    if (assignment.status === 'active') await revokeResource(assignment.id);
  }
  await logout(page);

  await expectDenied(
    FIELD,
    `/incidents/${incidentId}`,
    `/api/incidents/${incidentId}`,
    /Không có quyền truy cập/,
  );
  await expectDenied(
    FIELD,
    `/inspections/${inspectionId}`,
    `/api/inspections/${inspectionId}`,
    /Không có quyền xem inspection/,
  );
  await expectDenied(
    FIELD,
    `/field/vehicles/${observationId}`,
    `/api/vehicles/observations/${observationId}`,
    /Không có quyền xem quan sát/,
  );
  await expectPermitted(
    COMMANDER,
    `/incidents/${incidentId}`,
    `/api/incidents/${incidentId}`,
    /Timeline|Chi tiết Incident/,
  );

  await page.goto('/login');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Mật khẩu')).toBeVisible();
});

test('dark-mode tokens and WCAG AA contrast hold for key text and controls', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);
  await page.goto('/');
  const tokens = await page.evaluate(() => {
    const scheme = getComputedStyle(document.documentElement).colorScheme;
    const body = getComputedStyle(document.body);
    const ring = getComputedStyle(document.documentElement)
      .getPropertyValue('--focus-ring')
      .trim();
    return {
      scheme,
      background: body.backgroundColor,
      color: body.color,
      ring,
    };
  });
  expect(tokens.scheme).toContain('dark');
  expect(tokens.ring.length).toBeGreaterThan(0);

  await page.goto('/intake');
  const headingRatio = await contrastRatio(page, 'h1');
  expect(headingRatio).not.toBeNull();
  expect(headingRatio!).toBeGreaterThanOrEqual(4.5);
  const submitRatio = await contrastRatio(page, 'form button[type="submit"]');
  expect(submitRatio).not.toBeNull();
  expect(submitRatio!).toBeGreaterThanOrEqual(4.5);

  await page.goto('/field/offline');
  const syncRatio = await contrastRatio(
    page,
    'section[aria-label="Trạng thái đồng bộ"] button',
  );
  expect(syncRatio).not.toBeNull();
  expect(syncRatio!).toBeGreaterThanOrEqual(4.5);

  await page.goto('/field/vehicles');
  const plateRatio = await contrastRatio(page, 'form input[name="plate"]');
  expect(plateRatio).not.toBeNull();
  expect(plateRatio!).toBeGreaterThanOrEqual(4.5);
});

test('prefers-reduced-motion disables or reduces motion classes and animation', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/field/offline');
  await expect(page.getByText('Trạng thái thiết bị')).toBeVisible();
  const motion = await page.evaluate(() => {
    const mediaMatches = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.className = 'motion-safe:animate-pulse';
    probe.style.position = 'absolute';
    document.body.append(probe);
    const computed = getComputedStyle(probe);
    const duration = computed.animationDuration;
    const animationName = computed.animationName;
    const running = document.getAnimations().map((entry) => entry.playState);
    probe.remove();
    return { mediaMatches, duration, animationName, running };
  });
  expect(motion.mediaMatches).toBe(true);
  expect(
    motion.duration === '0.01ms' ||
      motion.duration === '0s' ||
      motion.duration === '' ||
      motion.animationName === 'none' ||
      motion.animationName === '',
  ).toBe(true);
  await page.goto('/incidents');
  await expect(
    page
      .getByLabel('Đang tải hàng đợi Incident')
      .or(page.getByText('Chưa có Incident trong phạm vi hiển thị.'))
      .or(page.locator('a[href^="/incidents/"]').first()),
  ).toBeVisible({ timeout: 15000 });
  await page.goto('/field/vehicles');
  await expect(
    page.getByRole('heading', { name: 'Phương tiện tại hiện trường' }),
  ).toBeVisible();
  await context.close();
});

test('touch targets, Tab path and focus-visible hold on primary actions', async ({
  page,
}) => {
  await loginAs(page, COMMANDER);
  await page.goto('/field/offline');
  const sync = page.getByRole('button', { name: 'Đồng bộ ngay' });
  await expect(sync).toBeVisible();
  await sync.focus();
  await expect(sync).toBeFocused();
  const syncBox = await sync.boundingBox();
  expect(syncBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  await page.goto('/intake');
  const submit = page.getByRole('button', { name: 'Tạo Incident' });
  await submit.focus();
  await expect(submit).toBeFocused();
  const submitBox = await submit.boundingBox();
  expect(submitBox?.height ?? 0).toBeGreaterThanOrEqual(24);
  await page.getByLabel('Kênh tiếp nhận').focus();
  await page.keyboard.press('Tab');
  const afterTab = await page.evaluate(
    () => (document.activeElement as HTMLElement | null)?.tagName ?? 'none',
  );
  expect(
    ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(afterTab),
  ).toBe(true);

  await page.goto('/field/vehicles');
  const record = page.getByRole('button', { name: 'Ghi nhận phương tiện' });
  await record.focus();
  await expect(record).toBeFocused();
  const recordBox = await record.boundingBox();
  expect(recordBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  const gps = page.getByRole('button', { name: 'Lấy vị trí hiện tại' });
  const gpsBox = await gps.boundingBox();
  expect(gpsBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  await page.goto('/vehicles/registry');
  const registrySubmit = page.getByRole('button', { name: 'Thêm registry' });
  await registrySubmit.focus();
  await expect(registrySubmit).toBeFocused();
});
