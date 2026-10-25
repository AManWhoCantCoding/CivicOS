import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const environment = { ...process.env };
environment.DATABASE_URL =
  process.env.DEMO_DATABASE_URL ?? process.env.DATABASE_URL;
environment.PORT = '3001';
environment.EVENT_WORKER_INTERVAL_MS =
  process.env.EVENT_WORKER_INTERVAL_MS ?? '100';
environment.CIVICOS_E2E_RUN = '1';
const tracePath = resolve(
  process.cwd(),
  '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-trace.jsonl',
);
const runId = process.env.CIVICOS_E2E_RUN_ID;
if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    runId ?? '',
  )
) {
  throw new Error('Invalid E2E run ID');
}
const controlDir = resolve(
  process.cwd(),
  '.brain/evidence/03-ps-e1005-intake-report/logs',
);
const control = (name) => resolve(controlDir, `${runId}.${name}`);
const startedPath = control('started');
const stopPath = control('stop');
const donePath = control('done');
const httpTracePath = resolve(
  process.cwd(),
  '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-http.jsonl',
);
mkdirSync(dirname(tracePath), { recursive: true });
const traceRunId = randomUUID();
writeFileSync(
  tracePath,
  `${JSON.stringify({
    recordedAt: new Date().toISOString(),
    runId: traceRunId,
    kind: 'run',
    operation: 'start',
    status: 'started',
  })}\n`,
  'utf8',
);
writeFileSync(
  httpTracePath,
  `${JSON.stringify({
    recordedAt: new Date().toISOString(),
    runId: traceRunId,
    kind: 'run',
    operation: 'start',
    status: 'started',
  })}\n`,
  'utf8',
);
environment.CIVICOS_E2E_TRACE_FILE = tracePath;
environment.CIVICOS_E2E_TRACE_RUN_ID = traceRunId;
environment.CIVICOS_E2E_HTTP_TRACE_FILE = httpTracePath;
const children = new Set();
let shuttingDown = false;
let shutdownPromise;

function run(command, args, allowDuringShutdown = false) {
  return new Promise((resolve, reject) => {
    if (shuttingDown && !allowDuringShutdown) {
      reject(new Error('E2E service shutdown requested'));
      return;
    }
    const child = spawn(command, args, {
      env: environment,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
    children.add(child);
    child.once('error', (error) => {
      children.delete(child);
      reject(error);
    });
    child.once('exit', (code, signal) => {
      children.delete(child);
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

function start(command, args) {
  if (shuttingDown) throw new Error('E2E service shutdown requested');
  const child = spawn(command, args, {
    detached: process.platform !== 'win32',
    env: environment,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null || child.killed) {
    if (child.exitCode === null && child.signalCode === null)
      await new Promise((resolve) => child.once('exit', resolve));
    return;
  }
  if (process.platform === 'win32') {
    await run(
      'taskkill.exe',
      ['/pid', String(child.pid), '/t', '/f'],
      true,
    ).catch(() => undefined);
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
  if (child.exitCode === null && child.signalCode === null)
    await new Promise((resolve) => child.once('exit', resolve));
}

async function shutdown(code = 0) {
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = (async () => {
    shuttingDown = true;
    await Promise.all([...children].map(stop));
    if (setupCompleted) {
      try {
        await run(
          npm,
          ['exec', '--', 'tsx', 'scripts/e2e/fixtures.ts', 'cleanup'],
          true,
        );
      } catch (error) {
        process.stderr.write(`E2E fixture cleanup failed: ${error.message}\n`);
        code = 1;
      }
    }
    if (existsSync(startedPath))
      writeFileSync(donePath, code === 0 ? 'ok\n' : 'failed\n', 'utf8');
    process.exitCode = code;
  })();
  return shutdownPromise;
}

let setupCompleted = false;
async function main() {
  await run(npm, ['exec', '--', 'tsx', 'scripts/e2e/fixtures.ts', 'setup']);
  setupCompleted = true;
  await run(npm, ['run', 'build']);
  if (shuttingDown) return;

  const app = start(npm, ['run', 'start']);
  if (shuttingDown) return;
  writeFileSync(startedPath, 'started\n', { flag: 'wx' });
  const stopPoll = (async () => {
    while (!shuttingDown) {
      if (existsSync(stopPath)) {
        await shutdown(0);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  })();
  await Promise.race([
    new Promise((resolve) => app.once('exit', () => resolve(1))),
  ]).then((code) => shutdown(code));
  await stopPoll;
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

main().catch(async (error) => {
  process.stderr.write(`${error.message}\n`);
  await shutdown(1);
});
