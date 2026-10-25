import { defineConfig, devices } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';

process.env.CIVICOS_E2E_RUN_ID ??= randomUUID();
process.env.CIVICOS_E2E_FIXTURE_PASSWORD ??=
  randomBytes(32).toString('base64url');

export default defineConfig({
  testDir: './tests/e2e',
  // Giới hạn thời gian tối đa cho 1 testcase E2E (30s)
  timeout: 30 * 1000, // Mỗi testcase tối đa 30 giây
  expect: {
    timeout: 5 * 1000,
  },
  workers: 1, // serialize shared Next dev-server/DB readiness
  webServer: {
    command: 'node scripts/e2e/playwright-services.mjs',
    url: 'http://localhost:3001',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
  globalTeardown: './scripts/e2e/playwright-teardown.mjs',
  use: {
    baseURL: 'http://localhost:3001',
    headless: true, // Bắt buộc chạy headless để tiết kiệm tài nguyên
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Verification boundary tạm thời của web; không bỏ Acceptance Criteria ticket 05.
  ],
});
