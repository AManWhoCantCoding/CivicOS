#!/usr/bin/env node
// Chạy chuỗi kiểm tra của một ticket, ghi evidence, in tóm tắt ngắn (~40 dòng) cho agent.
// Usage: node scripts/verify.mjs <ticket-id> [--scope=fast|full|mobile] [--only=a,b] [--filter=<pattern>] [--keep-going] [--tail=60] [--timeout=600000] [--force-prisma]
//        node scripts/verify.mjs --tree [--exclude=a,b]   # chỉ in dấu vân tay mã nguồn, không chạy kiểm tra
//        node scripts/verify.mjs --check [--scope=..]     # chỉ liệt kê bước nào có/thiếu trong package.json, không chạy gì
// --filter=<pattern>: CHỈ dùng cùng --only=<đúng 1 step> (thường là test/test:e2e) — nối thêm pattern vào
//   sau "npm run <step> -- " để chạy đúng 1 test case/file đang FAIL thay vì cả bộ, dùng trong vòng sửa lỗi
//   (fix → --only=test:e2e --filter=<pattern> → pass → chạy lại --scope=full 1 lần để xác nhận không có regression).
//   Pattern tuỳ theo cách test:e2e của repo nhận tham số (VD Playwright: "--grep @T-042" hoặc đường dẫn file spec).
// --force-prisma: ép chạy lại `prisma:generate` dù schema.prisma không đổi (mặc định script tự SKIP khi không đổi).
// Danh sách bước mặc định lấy từ quy trình CivicOS (PS-E1). Repo khác đổi bằng khối "verify" trong package.json:
//   "verify": {
//     "fast": ["typecheck", "lint", "test"],
//     "full": ["typecheck", "lint", "test", "build"],
//     "backend": {                       // tuỳ chọn — bỏ qua hoặc set false để tắt hẳn cơ chế này
//       "startScript": "dev",            // npm run <startScript> để khởi động backend dev server
//       "url": "http://localhost:3000",  // base URL, cũng là giá trị inject vào envVar
//       "healthPath": "/health",         // đường dẫn health-check, ghép vào url để poll
//       "envVar": "CIVICOS_API_BASE_URL",    // tên biến môi trường inject cho các bước trong upFor
//       "startTimeoutMs": 30000,
//       "upFor": ["test", "test:e2e"],   // các bước CẦN backend đang chạy
//       "downFor": ["prisma:generate"]   // các bước CẦN backend đang tắt (tránh lock file Prisma trên Windows)
//     }
//   }
// --fix-format: cho phép format:check chạy `prettier --write .` trước (mặc định KHÔNG, tránh sửa code sau khi Dev nộp).
// scope=fast tự bật keep-going (thấy hết lỗi 1 lượt). Luôn ghi <evidence>/digest.md (<=25 dòng) và append .brain/metrics.csv.
// VERIFY_PORT=<n>: đổi cổng backend (dùng cho git worktree song song).
// Exit code: 0 = PASS, 1 = FAIL, 2 = INCOMPLETE (thiếu script / bước không chạy), 64 = sai tham số.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const DEFAULT_FULL = [
  'prisma:generate',
  'typecheck',
  'lint',
  'format:check',
  'test',
  'test:e2e',
  'build',
];
const DEFAULT_FAST = DEFAULT_FULL.slice(0, 5);
const NAME_OK = /^[\w:.-]+$/;
// Whitelist ký tự cho --filter: chữ/số, khoảng trắng, @ : . / * - (đủ cho tag "@T-042", path file spec,
// hoặc cờ dạng "--grep <pattern>"). KHÔNG cho phép dấu nháy/ký tự shell đặc biệt khác — chặn command injection
// vì filter được nối thẳng vào chuỗi lệnh chạy qua shell:true bên dưới.
const FILTER_OK = /^[\w @:./*-]+$/;

const argv = process.argv.slice(2);
const opt = (k, d) =>
  argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ticket = argv.find((a) => !a.startsWith('--'));
const scope = opt('scope', 'full');
const only = opt('only', '');
const filter = opt('filter', '');
const tail = Number(opt('tail', '60'));
const timeout = Number(opt('timeout', '600000'));
const keepGoing = argv.includes('--keep-going') || (!only && scope === 'fast'); // fast: gom hết lỗi trong 1 lượt
const fixFormat = argv.includes('--fix-format');
const treeOnly = argv.includes('--tree');
const checkOnly = argv.includes('--check');
const forcePrisma = argv.includes('--force-prisma');
const pkg = existsSync('package.json')
  ? JSON.parse(readFileSync('package.json', 'utf8'))
  : {};
const scripts = pkg.scripts ?? {};
const FULL = Array.isArray(pkg.verify?.full) ? pkg.verify.full : DEFAULT_FULL;
const FAST = Array.isArray(pkg.verify?.fast) ? pkg.verify.fast : DEFAULT_FAST;
const MOBILE = Array.isArray(pkg.verify?.mobile) ? pkg.verify.mobile : [];
const steps = only
  ? only
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : scope === 'fast'
    ? FAST
    : scope === 'mobile'
      ? MOBILE
      : FULL;

if (
  !treeOnly &&
  (!(ticket || checkOnly) ||
    (ticket && !NAME_OK.test(ticket)) ||
    !['fast', 'full', 'mobile'].includes(scope) ||
    !steps.length ||
    !steps.every((s) => NAME_OK.test(s)) ||
    !(tail > 0) ||
    !(timeout > 0) ||
    (filter && steps.length !== 1) ||
    (filter && !FILTER_OK.test(filter)))
) {
  console.error(
    'Usage: node scripts/verify.mjs <ticket-id> [--scope=fast|full|mobile] [--only=a,b] [--filter=<pattern>] [--keep-going] [--tail=60] [--timeout=600000] [--force-prisma]',
  );
  console.error(
    '       --filter chỉ hợp lệ khi --only chỉ định đúng 1 step, và pattern chỉ gồm chữ/số/khoảng trắng/@:./*-',
  );
  console.error('       node scripts/verify.mjs --tree [--exclude=a,b]');
  console.error(
    '       node scripts/verify.mjs --check [--scope=fast|full] [--only=a,b]',
  );
  process.exit(64);
}

if (checkOnly) {
  const missing = steps.filter((n) => !scripts[n]);
  console.log(
    `verify --check · ${only ? `only=${only}` : `scope=${scope}`} · nguồn danh sách: ${pkg.verify ? 'package.json "verify"' : 'mặc định CivicOS'}`,
  );
  for (const n of steps)
    console.log(
      `${scripts[n] ? 'OK     ' : 'MISSING'} ${n}${scripts[n] ? `  →  ${scripts[n]}` : ''}`,
    );
  console.log(
    missing.length
      ? `RESULT: ${missing.length} bước thiếu trong package.json (chạy thật sẽ ra INCOMPLETE)`
      : 'RESULT: đủ bước',
  );
  process.exit(missing.length ? 2 : 0);
}

// Che giá trị bí mật trước khi ghi ra log/evidence/stdout.
const SECRET_NAME = /(KEY|TOKEN|SECRET|PASSWORD|PASSWD|PRIVATE|DATABASE_URL)/i;
const secrets = new Set();
const addSecret = (name, v) => {
  if (SECRET_NAME.test(name) && v && v.length >= 8) secrets.add(v);
};
Object.entries(process.env).forEach(([k, v]) => addSecret(k, v));
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/);
    if (m) addSecret(m[1], m[2].replace(/^(['"])(.*)\1$/, '$2'));
  }
}
const mask = (s) => [...secrets].reduce((t, v) => t.split(v).join('***'), s);
const stripAnsi = (s) => s.replace(/\x1B\[[0-9;?]*[ -/]*[@-~]/g, '');
const lastLines = (s, n) =>
  stripAnsi(s).trimEnd().split(/\r?\n/).slice(-n).join('\n');
const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;
const safe = (s) => s.replace(/[^\w.-]/g, '_');

const git = (args) => {
  const r = spawnSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return r.status === 0 ? r.stdout.trim() : '';
};
const head = git(['rev-parse', '--short', 'HEAD']) || '(chưa có commit)';
const dirty = git(['status', '--porcelain']).split('\n').filter(Boolean).length;

// Dấu vân tay của cây mã nguồn để Reviewer biết PASS áp dụng cho đúng code.
// Bỏ qua các đường dẫn mà agent ghi thường xuyên nhưng không phải mã nguồn (thêm bằng --exclude=a,b nếu cần).
const EXCLUDE = [
  '.brain',
  '.scratch',
  '.codegraph',
  'Lesson-learned.md',
  ...opt('exclude', '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean),
];
const isExcluded = (f) => EXCLUDE.some((p) => f === p || f.startsWith(`${p}/`));
function isGeneratedArtifact(f) {
  // Loại generated Android build, Gradle và CMake output khỏi fingerprint Tree.
  const normalized = f.replace(/\\/g, '/');
  return (
    normalized.startsWith('mobile/android/') &&
    normalized
      .split('/')
      .some((s) => s === 'build' || s === '.gradle' || s === '.cxx')
  );
}
function treeFingerprint() {
  const h = createHash('sha1');
  h.update(
    git([
      'diff',
      'HEAD',
      '--',
      '.',
      ...EXCLUDE.map((p) => `:!${p}`),
      ':!mobile/android/**/build/**',
      ':!mobile/android/**/.gradle/**',
      ':!mobile/android/**/.cxx/**',
    ]),
  );
  for (const f of git(['ls-files', '-o', '--exclude-standard'])
    .split('\n')
    .filter(Boolean)) {
    if (isExcluded(f) || isGeneratedArtifact(f)) continue;
    try {
      h.update(f);
      h.update(readFileSync(f));
    } catch {
      /* file vừa bị xóa */
    }
  }
  return h.digest('hex').slice(0, 8);
}
if (treeOnly) {
  console.log(`Tree: ${treeFingerprint()}`);
  process.exit(0);
}

const dir = `.brain/evidence/${ticket}`;
mkdirSync(`${dir}/logs`, { recursive: true });
const testsPath = `${dir}/tests.md`;
const prev = existsSync(testsPath) ? readFileSync(testsPath, 'utf8') : '';
const run = (prev.match(/^## Lần chạy \d+/gm) ?? []).length + 1;
const logPath = (name) => `${dir}/logs/run${run}-${safe(name)}.log`;

// ---- prisma:generate: skip nếu schema không đổi từ lần generate PASS trước ----
const PRISMA_SCHEMA = 'prisma/schema.prisma';
const PRISMA_HASH_FILE = '.brain/.prisma-schema-hash';
function prismaSchemaHash() {
  try {
    return createHash('sha1').update(readFileSync(PRISMA_SCHEMA)).digest('hex');
  } catch {
    return null; // không tìm thấy schema — để step tự chạy và báo lỗi rõ ràng
  }
}
function prismaGenerateNeeded() {
  if (forcePrisma) return true;
  const h = prismaSchemaHash();
  if (!h) return true;
  const prevHash = existsSync(PRISMA_HASH_FILE)
    ? readFileSync(PRISMA_HASH_FILE, 'utf8').trim()
    : '';
  return h !== prevHash;
}
function markPrismaGenerated() {
  const h = prismaSchemaHash();
  if (h) writeFileSync(PRISMA_HASH_FILE, h);
}

// ---- Vòng đời backend dev server: TẮT trước bước cần tắt (VD prisma:generate, tránh lock file
// Windows với query engine), TỰ BẬT + inject URL trước bước cần nó (VD test). Cấu hình qua
// package.json → "verify"."backend"; đặt "backend": false để tắt hẳn cơ chế này. ----
const backendCfg = pkg.verify?.backend;
const BACKEND =
  backendCfg === false
    ? null
    : {
        startScript: 'dev',
        url: `http://localhost:${process.env.VERIFY_PORT ?? 3000}`,
        healthPath: '/health',
        envVar: 'CIVICOS_API_BASE_URL',
        extraEnvVars: ['CIVICOS_BASE_URL'], // chặn lỗi lệch tên biến giữa test và script
        startTimeoutMs: 30000,
        upFor: ['test', 'test:e2e'],
        downFor: ['prisma:generate'],
        ...(backendCfg ?? {}),
      };
let backendProc = null; // { pid }
const isWin = process.platform === 'win32';

function killBackend() {
  if (!backendProc) return;
  const { pid } = backendProc;
  try {
    if (isWin) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F']);
    else process.kill(-pid, 'SIGTERM');
  } catch {
    /* tiến trình đã chết sẵn */
  }
  backendProc = null;
}

async function waitForHealth(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.status < 500) return true;
    } catch {
      /* backend chưa sẵn sàng, thử lại */
    }
    await new Promise((res) => setTimeout(res, 500));
  }
  return false;
}

async function ensureBackendUp() {
  if (!BACKEND) return true; // cơ chế bị tắt → coi như không cần quản lý, để step tự chạy
  if (backendProc) return true;
  if (!scripts[BACKEND.startScript]) return false; // không có script dev trong package.json
  const proc = spawn(`npm run ${BACKEND.startScript}`, {
    shell: true,
    detached: !isWin,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      ...(process.env.VERIFY_PORT ? { PORT: process.env.VERIFY_PORT } : {}),
    },
  });
  backendProc = { pid: proc.pid };
  const ok = await waitForHealth(
    `${BACKEND.url}${BACKEND.healthPath}`,
    BACKEND.startTimeoutMs,
  );
  if (!ok) killBackend();
  return ok;
}

async function ensureBackendDown() {
  if (!BACKEND || !backendProc) return;
  killBackend();
  await new Promise((res) => setTimeout(res, 1000)); // chờ OS nhả file lock (Windows) trước khi chạy step kế
}

async function runStep(name, extraEnv = {}) {
  if (!scripts[name]) return { name, status: 'MISSING', ms: 0, out: '' };
  if (name === 'format:check' && fixFormat) {
    spawnSync('npx prettier --write .', { shell: true, encoding: 'utf8' });
  }
  const cmd = filter ? `npm run ${name} -- ${filter}` : `npm run ${name}`;
  const env = {
    ...process.env,
    ...extraEnv,
    CI: process.env.CI ?? '1',
    NO_COLOR: '1',
  };
  // prisma:generate: thử lại nếu dính lock file (EPERM/EBUSY) — có thể do backend chưa kịp nhả
  // dù đã ensureBackendDown(), hoặc do 1 tiến trình khác (VD IDE) đang giữ file query engine.
  const maxAttempts = name === 'prisma:generate' ? 3 : 1;
  let r;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const t0 = Date.now();
    r = spawnSync(cmd, {
      shell: true,
      encoding: 'utf8',
      timeout,
      maxBuffer: 256 * 1024 * 1024,
      env,
    });
    r._ms = Date.now() - t0;
    const raw = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    const lockErr = /EPERM|EBUSY|resource busy|operation not permitted/i.test(
      raw,
    );
    if (r.status === 0 || !lockErr || attempt === maxAttempts) break;
    await new Promise((res) => setTimeout(res, 1000));
  }
  const out = mask(
    `${r.stdout ?? ''}${r.stderr ? `\n--- stderr ---\n${r.stderr}` : ''}` +
      `${r.error ? `\n--- lỗi tiến trình: ${r.error.message} ---` : ''}`,
  );
  return {
    name,
    status: r.status === 0 ? 'PASS' : 'FAIL',
    ms: r._ms,
    out,
  };
}

const results = [];
let halted = false;
try {
  for (const name of steps) {
    if (halted) {
      results.push({ name, status: 'NOT_RUN', ms: 0, out: '' });
      continue;
    }
    if (name === 'prisma:generate' && !prismaGenerateNeeded()) {
      results.push({
        name,
        status: 'SKIPPED',
        ms: 0,
        out: 'schema.prisma không đổi từ lần generate PASS trước — bỏ qua (dùng --force-prisma để ép chạy lại).',
      });
      continue;
    }
    if (BACKEND?.downFor.includes(name)) await ensureBackendDown();
    let extraEnv = {};
    if (BACKEND?.upFor.includes(name)) {
      const ok = await ensureBackendUp();
      if (!ok) {
        results.push({
          name,
          status: 'FAIL',
          ms: 0,
          out: `Không khởi động được backend (npm run ${BACKEND.startScript}) hoặc health-check ${BACKEND.url}${BACKEND.healthPath} không phản hồi trong ${BACKEND.startTimeoutMs}ms.`,
        });
        if (!keepGoing) halted = true;
        continue;
      }
      extraEnv = Object.fromEntries(
        [BACKEND.envVar, ...(BACKEND.extraEnvVars ?? [])].map((k) => [
          k,
          BACKEND.url,
        ]),
      );
    }
    const r = await runStep(name, extraEnv);
    if (r.out) writeFileSync(logPath(name), r.out);
    if (r.status === 'PASS' && name === 'prisma:generate')
      markPrismaGenerated();
    results.push(r);
    if (r.status === 'FAIL' && !keepGoing) halted = true;
  }
} finally {
  await ensureBackendDown();
}
const tree = treeFingerprint();

const has = (s) => results.some((r) => r.status === s);
const overall = has('FAIL')
  ? 'FAIL'
  : has('MISSING') || has('NOT_RUN')
    ? 'INCOMPLETE'
    : 'PASS';
const label =
  (only ? `only=${only}` : `scope=${scope}`) +
  (filter ? ` filter="${filter}"` : '');
const F = '````';

let md =
  `${prev ? '\n' : `# Evidence kiểm tra — ${ticket}\n\n`}` +
  `## Lần chạy ${run} — ${new Date().toISOString()} (${label})\n\n` +
  `- HEAD: ${head} | file chưa commit: ${dirty} | Tree: ${tree}\n` +
  `- Kết quả: **${overall}**\n\n| Bước | Lệnh | Kết quả | Thời gian |\n|---|---|---|---|\n` +
  results
    .map(
      (r) =>
        `| ${r.name} | \`npm run ${r.name}\` | ${r.status} | ${r.ms ? secs(r.ms) : '-'} |`,
    )
    .join('\n') +
  '\n';
for (const r of results.filter((x) => x.status === 'FAIL')) {
  md +=
    `\n### Lỗi: ${r.name}\n\nLog đầy đủ: \`${logPath(r.name)}\`. ${tail} dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):\n\n` +
    `${F}text\n${lastLines(r.out, tail)}\n${F}\n`;
}
writeFileSync(testsPath, prev + md);

// ---- digest.md: tối đa 25 dòng, chỉ dòng lỗi trọng tâm — cho Developer tự sửa và gửi Telegram ----
const ERR_RE =
  /error|fail|✕|●|expected|received|TS\d{4}|\.[cm]?[jt]sx?:\d+|\(\d+,\d+\)/i;
function digestLines(r) {
  const all = stripAnsi(r.out)
    .split(/\r?\n/)
    .filter((l) => l.trim());
  const hit = [
    ...new Set(
      all.filter((l) => ERR_RE.test(l)).map((l) => l.trim().slice(0, 200)),
    ),
  ];
  return (hit.length ? hit : all.slice(-8)).slice(0, 8);
}
const dg = [`# Digest ${ticket} · lần ${run} · ${label} · ${overall}`];
for (const r of results)
  if (r.status !== 'PASS' && r.status !== 'SKIPPED')
    dg.push(`- ${r.name}: ${r.status}`);
for (const r of results.filter((x) => x.status === 'FAIL'))
  dg.push(`\n## ${r.name} (log: ${logPath(r.name)})`, ...digestLines(r));
writeFileSync(`${dir}/digest.md`, `${dg.slice(0, 25).join('\n')}\n`);
try {
  const mp = '.brain/metrics.csv';
  if (!existsSync(mp)) writeFileSync(mp, 'time,ticket,label,result,seconds\n');
  const total = results.reduce((a, r) => a + r.ms, 0) / 1000;
  writeFileSync(
    mp,
    `${readFileSync(mp, 'utf8')}${new Date().toISOString()},${ticket},${label.replace(/,/g, ';')},${overall},${total.toFixed(1)}\n`,
  );
} catch {
  /* metrics không được làm hỏng kết quả */
}

const lines = [
  `verify ${ticket} · lần ${run} · ${label} · HEAD ${head} · Tree ${tree}`,
];
for (const r of results) {
  lines.push(
    `${r.status.padEnd(8)} ${r.name.padEnd(16)} ${r.ms ? secs(r.ms) : r.status === 'MISSING' ? '(không có trong package.json)' : ''}`.trimEnd(),
  );
}
for (const r of results.filter((x) => x.status === 'FAIL').slice(0, 2)) {
  lines.push(`--- ${r.name}: 15 dòng cuối ---`, lastLines(r.out, 15));
}
lines.push(
  `RESULT: ${overall}`,
  `Evidence: ${testsPath}`,
  `Digest: ${dir}/digest.md`,
);
console.log(lines.join('\n'));
process.exit(overall === 'PASS' ? 0 : overall === 'FAIL' ? 1 : 2);
