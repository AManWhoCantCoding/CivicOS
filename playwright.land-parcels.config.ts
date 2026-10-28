// Standalone Playwright config for tests/e2e/land-parcel-polygon.spec.ts ONLY.
//
// Why this exists: the global playwright.config.ts webServer starts
// scripts/e2e/playwright-services.mjs (fixture setup + `npm run build` +
// cleanup). The Land parcel browser evidence must run with zero DB/fixture
// side effects, so it builds and serves the app directly via the next CLI.
//
// Use the production build so this smoke verifies the bundle users receive;
// the MapLibre worker and its shared module are served by the same-origin app
// route rather than relying on bundler-specific import.meta.url output.
//
// Fail-closed DB guard: the spawned build/start processes get a syntactically
// valid but unreachable DATABASE_URL (port 1 on loopback). Any accidental DB
// access fails fast (validated: `next build` completes with it). The override
// is process-only — it lives in the webServer subprocess spawned by Playwright
// and dies with it; `.env`, `DEMO_DATABASE_URL` and the Playwright runner
// process are untouched, so there is nothing to clean up afterward.
//
// Run: npx playwright test --config=playwright.land-parcels.config.ts

import { defineConfig, devices } from '@playwright/test';

const PORT = 3101;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  // Narrow the testDir to the single browser-evidence spec.
  testMatch: /^.*land-parcel-polygon\.spec\.ts$/,
  timeout: 90 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'node node_modules/next/dist/bin/next build && node node_modules/next/dist/bin/next start --port 3101 --hostname 127.0.0.1',
    url: `${BASE_URL}/map`,
    reuseExistingServer: false,
    timeout: 600 * 1000,
    env: {
      // Deliberately unreachable (fail closed); only the spawned processes
      // see this value — never persisted anywhere.
      DATABASE_URL:
        'postgresql://civicos-browser-e2e-guard:guard@127.0.0.1:1/guard_db',
      // Same unreachable target for the demo alias: with a non-demo runtime
      // DATABASE_URL the demo broker guard already fails closed before any
      // connection, and the alias stays consistent instead of silently
      // matching the real DB that .env would otherwise feed the server.
      DEMO_DATABASE_URL:
        'postgresql://civicos-browser-e2e-guard:guard@127.0.0.1:1/guard_db',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
