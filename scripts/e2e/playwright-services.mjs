import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const environment = { ...process.env };
environment.PORT = '3001';
environment.EVENT_WORKER_INTERVAL_MS =
  process.env.EVENT_WORKER_INTERVAL_MS ?? '100';
environment.CIVICOS_E2E_RUN = '1';
const tracePath = resolve(
  process.cwd(),
  '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-trace.jsonl',
);
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
  if (child.exitCode !== null || child.signalCode !== null) return;
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
}

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  await Promise.all([...children].map(stop));
  process.exitCode = code;
}

async function main() {
  await run(npm, ['run', 'prisma:migrate:deploy']);
  await run(npm, ['run', 'build']);
  if (shuttingDown) return;

  const app = start(npm, ['run', 'start']);
  if (shuttingDown) return;
  const worker = start(npm, ['run', 'worker']);
  await Promise.race([
    new Promise((resolve) => app.once('exit', () => resolve(1))),
    new Promise((resolve) => worker.once('exit', () => resolve(1))),
  ]).then((code) => shutdown(code));
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

main().catch(async (error) => {
  process.stderr.write(`${error.message}\n`);
  await shutdown(1);
});
