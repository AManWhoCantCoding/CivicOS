import { chromium, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PILOT01_COMMANDER_EMAIL } from './bootstrap-pilot01-commander';
import { readPilot01CommanderSecret } from './pilot01-secret-store';

function currentWindowsIdentity(): string {
  try {
    const identity = execFileSync('whoami.exe', [], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5_000,
    }).trim();
    if (identity) return identity;
  } catch {
    // Return one closed error code rather than exposing process details.
  }
  throw new Error('PILOT01_WINDOWS_IDENTITY_UNAVAILABLE');
}

async function confirmPoContext(identity: string): Promise<void> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('PILOT01_INTERACTIVE_TERMINAL_REQUIRED');
  }
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await terminal.question(
      `Windows account: ${identity}. Confirm this is the PO-approved account; type PO to continue: `,
    );
    if (answer.trim() !== 'PO') {
      throw new Error('PILOT01_PO_CONTEXT_NOT_CONFIRMED');
    }
  } finally {
    terminal.close();
  }
}

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

export async function runPilot01CommanderCredentialHandoff(): Promise<void> {
  let password = '';
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    if (process.platform !== 'win32') {
      throw new Error('PILOT01_WINDOWS_SECRET_STORE_REQUIRED');
    }
    if (process.env.DEBUG || process.env.PWDEBUG) {
      throw new Error('PILOT01_DEBUG_OUTPUT_REFUSED');
    }
    const origin = new URL('http://127.0.0.1:3100');
    await confirmPoContext(currentWindowsIdentity());

    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(new URL('/login', origin).href, {
      waitUntil: 'domcontentloaded',
    });
    if (new URL(page.url()).origin !== origin.origin) {
      throw new Error('PILOT01_LOGIN_ORIGIN_UNVERIFIED');
    }
    password = readPilot01CommanderSecret() ?? '';
    if (!password) throw new Error('PILOT01_SECRET_NOT_FOUND');
    await fillPilot01CommanderLogin(page, password);
    password = '';

    console.log(
      'Credential is in the masked login field. Submit manually in the browser; this helper does not submit the login request.',
    );
    await page.waitForURL(
      (url) => url.origin === origin.origin && url.pathname === '/',
      { timeout: 0 },
    );
    console.log(
      'Commander session opened. Close the browser to end this helper.',
    );
    await page.waitForEvent('close', { timeout: 0 });
  } catch (error) {
    if (error instanceof Error && /^[A-Z][A-Z0-9_]*$/.test(error.message)) {
      throw error;
    }
    throw new Error('PILOT01_CREDENTIAL_HANDOFF_FAILED');
  } finally {
    password = '';
    await browser?.close().catch(() => undefined);
  }
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
