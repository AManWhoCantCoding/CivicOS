import type { Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PILOT01_COMMANDER_EMAIL } from './bootstrap-pilot01-commander';

export async function fillPilot01CommanderLogin(
  page: Page,
  password: string,
): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(password)) {
    throw new Error('PILOT01_SECRET_INVALID');
  }
  try {
    await page
      .getByRole('heading', {
        name: 'Vào đúng hồ sơ. Làm đúng nhiệm vụ.',
        exact: true,
      })
      .waitFor();
    await page
      .getByLabel('Email', { exact: true })
      .fill(PILOT01_COMMANDER_EMAIL);
    const passwordInput = page.getByLabel('Mật khẩu', { exact: true });
    if ((await passwordInput.getAttribute('type')) !== 'password') {
      throw new Error('PILOT01_LOGIN_FORM_UNVERIFIED');
    }
    await passwordInput.fill(password);
  } catch {
    throw new Error('PILOT01_LOGIN_FORM_UNVERIFIED');
  }
}

// DB-CONSOLIDATION SLICE (D-78 Task 4): the browser credential-handoff runtime
// is retired; only the pure login prefill helper above remains available.
export async function runPilot01CommanderCredentialHandoff(): Promise<void> {
  throw new Error('PILOT01_SANDBOX_RUNTIME_RETIRED');
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void runPilot01CommanderCredentialHandoff().catch((error: unknown) => {
    const message =
      error instanceof Error && /^[A-Z][A-Z0-9_]*$/.test(error.message)
        ? error.message
        : 'PILOT01_CREDENTIAL_HANDOFF_FAILED';
    console.error(message);
    process.exitCode = 1;
  });
}
