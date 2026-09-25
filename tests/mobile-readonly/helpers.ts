import { afterAll, beforeAll, expect } from 'vitest';

import {
  cleanupMobileReadonlyFixture,
  seedMobileReadonlyFixture,
} from './fixtures';

export function useMobileReadonlyFixture(): void {
  beforeAll(seedMobileReadonlyFixture);
  afterAll(cleanupMobileReadonlyFixture);
}

export const piiKeys = [
  'phoneNumber',
  'sourceContact',
  'sensitiveProfile',
  'ownerName',
  'description',
  'freeText',
] as const;

export function expectNoRawPii(value: unknown): void {
  const text = JSON.stringify(value);
  for (const key of piiKeys) expect(text).not.toContain(`"${key}"`);
}

export function expectListEnvelope(value: unknown): void {
  expect(value).toMatchObject({
    data: expect.any(Array),
    total: expect.any(Number),
    page: expect.any(Number),
    pageSize: expect.any(Number),
  });
}
