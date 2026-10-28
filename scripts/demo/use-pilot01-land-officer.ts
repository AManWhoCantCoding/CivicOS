import type { Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LAND_REVIEW_EMAIL = 'pilot01-land-review@civicos.local';

export async function fillPilot01LandOfficerLogin(page: Page): Promise<void> {
  try {
    await page
      .getByRole('heading', {
        name: 'Vào đúng hồ sơ. Làm đúng nhiệm vụ.',
        exact: true,
      })
      .waitFor();
    await page.getByLabel('Email', { exact: true }).fill(LAND_REVIEW_EMAIL);
  } catch {
    throw new Error('PILOT01_LOGIN_FORM_UNVERIFIED');
  }
}

// DB-CONSOLIDATION SLICE (D-78 Task 4): the land officer browser handoff
// runtime is retired; only the pure login prefill helper above remains. The
// handoff fails closed before any Windows identity lookup, TTY prompt, browser
// launch, DPAPI secret read or API request to the legacy Pilot 01 sandbox at
// port 3100.
export async function runPilot01LandOfficerHandoff(): Promise<void> {
  throw new Error('PILOT01_SANDBOX_RUNTIME_RETIRED');
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void runPilot01LandOfficerHandoff().catch((error: unknown) => {
    const message =
      error instanceof Error && /^[A-Z][A-Z0-9_]*$/.test(error.message)
        ? error.message
        : 'PILOT01_LAND_REVIEW_HANDOFF_FAILED';
    console.error(message);
    process.exitCode = 1;
  });
}
