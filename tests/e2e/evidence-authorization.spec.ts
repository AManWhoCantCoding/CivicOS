import { createHash, randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('civicos-dev');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('/');
}

function uploadFields(
  resourceId: string,
  bytes: Buffer,
  fileName: string,
  extra: Record<string, string> = {},
) {
  return {
    file: { name: fileName, mimeType: 'image/jpeg', buffer: bytes },
    resourceType: 'Incident',
    resourceId,
    ...extra,
  };
}

test('unauthenticated evidence upload and download are rejected', async ({
  page,
}) => {
  const resourceId = randomUUID();
  const upload = await page.request.post('/api/evidence', {
    multipart: uploadFields(
      resourceId,
      Buffer.from('unauthenticated-bytes'),
      'unauth.jpg',
    ),
  });
  expect(upload.status()).toBe(401);
  expect((await upload.json()) as { error?: string }).toMatchObject({
    error: 'UNAUTHENTICATED',
  });

  const download = await page.request.get(
    `/api/evidence?evidenceId=${randomUUID()}`,
  );
  expect(download.status()).toBe(401);
});

test('authorized upload persists hash, actor, capture time, and GPS, then downloads and dedupes', async ({
  page,
}) => {
  await loginAs(page, 'truong@civicos.local');
  const session = await page.request.get('/api/auth/session');
  const me = (await session.json()) as { user: { id: string } };

  const resourceId = randomUUID();
  const bytes = Buffer.from(`field-evidence-${randomUUID()}`);
  const capturedAt = '2026-09-20T01:02:03.000Z';
  const upload = await page.request.post('/api/evidence', {
    multipart: uploadFields(resourceId, bytes, 'hien-truong.jpg', {
      capturedAt,
      latitude: '20.9',
      longitude: '105.8',
    }),
  });
  expect(upload.status()).toBe(201);
  const evidence = (
    (await upload.json()) as {
      evidence: {
        id: string;
        originalHash: string;
        actorId: string;
        capturedAt: string;
        immutable: boolean;
        latitude: string | number | null;
        longitude: string | number | null;
        metadata: unknown;
      };
    }
  ).evidence;
  expect(evidence.originalHash).toBe(
    createHash('sha256').update(bytes).digest('hex'),
  );
  expect(evidence.actorId).toBe(me.user.id);
  expect(evidence.capturedAt).toBe(capturedAt);
  expect(evidence.immutable).toBe(true);
  expect(Number(evidence.latitude)).toBe(20.9);
  expect(Number(evidence.longitude)).toBe(105.8);
  expect(evidence.metadata).toEqual({});

  const download = await page.request.get(
    `/api/evidence?evidenceId=${evidence.id}`,
  );
  expect(download.status()).toBe(200);
  expect((await download.body()).equals(bytes)).toBe(true);

  const duplicate = await page.request.post('/api/evidence', {
    multipart: uploadFields(resourceId, bytes, 'hien-truong.jpg', {
      capturedAt,
      latitude: '20.9',
      longitude: '105.8',
    }),
  });
  expect(duplicate.status()).toBe(201);
  expect(
    ((await duplicate.json()) as { evidence: { id: string } }).evidence.id,
  ).toBe(evidence.id);

  const replacement = await page.request.post('/api/evidence', {
    multipart: uploadFields(
      resourceId,
      Buffer.from(`replacement-${randomUUID()}`),
      'thay-the.jpg',
      { capturedAt },
    ),
  });
  expect(replacement.status()).toBe(201);
  expect(
    ((await replacement.json()) as { evidence: { id: string } }).evidence.id,
  ).not.toBe(evidence.id);

  const withoutGps = await page.request.post('/api/evidence', {
    multipart: uploadFields(
      resourceId,
      Buffer.from(`no-gps-${randomUUID()}`),
      'khong-gps.jpg',
      { capturedAt },
    ),
  });
  expect(withoutGps.status()).toBe(201);
  const gpsDenied = (
    (await withoutGps.json()) as {
      evidence: { latitude: null; longitude: null };
    }
  ).evidence;
  expect(gpsDenied.latitude).toBeNull();
  expect(gpsDenied.longitude).toBeNull();
});

test('unassigned user cannot upload to or download another resource', async ({
  page,
}) => {
  await loginAs(page, 'truong@civicos.local');
  const resourceId = `evidence-auth-${randomUUID()}`;
  const created = await page.request.post('/api/evidence', {
    multipart: uploadFields(
      resourceId,
      Buffer.from(`protected-${randomUUID()}`),
      'bao-ve.jpg',
      { capturedAt: '2026-09-20T01:02:03.000Z' },
    ),
  });
  expect(created.status()).toBe(201);
  const evidenceId = (
    (await created.json()) as { evidence: { id: string } }
  ).evidence.id;

  await page.request.delete('/api/auth/session');
  await loginAs(page, 'khongduocphancong@civicos.local');

  const tampered = await page.request.post('/api/evidence', {
    multipart: uploadFields(
      resourceId,
      Buffer.from(`tampered-${randomUUID()}`),
      'gia-mao.jpg',
      { capturedAt: '2026-09-20T01:02:03.000Z' },
    ),
  });
  expect(tampered.status()).toBe(403);
  expect((await tampered.json()) as { error?: string }).toMatchObject({
    error: 'FORBIDDEN',
  });

  const crossDownload = await page.request.get(
    `/api/evidence?evidenceId=${evidenceId}`,
  );
  expect(crossDownload.status()).toBe(403);
});
