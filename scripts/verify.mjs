#!/usr/bin/env node
// Chạy chuỗi kiểm tra của một ticket, ghi evidence, in tóm tắt ngắn (~40 dòng) cho agent.
// Usage: node scripts/verify.mjs <ticket-id> [--scope=fast|full|mobile] [--only=a,b] [--filter=<pattern>] [--keep-going] [--tail=60] [--timeout=600000]
//        node scripts/verify.mjs --tree [--exclude=a,b]   # chỉ in dấu vân tay mã nguồn, không chạy kiểm tra
//        node scripts/verify.mjs --check [--scope=..]     # chỉ liệt kê bước nào có/thiếu trong package.json, không chạy gì
// --filter=<pattern>: CHỈ dùng cùng --only=<đúng 1 step> (thường là test/test:e2e) — nối thêm pattern vào
//   sau "npm run <step> -- " để chạy đúng 1 test case/file đang FAIL thay vì cả bộ, dùng trong vòng sửa lỗi
//   (fix → --only=test:e2e --filter=<pattern> → pass → chạy lại --scope=full 1 lần để xác nhận không có regression).
//   Pattern tuỳ theo cách test:e2e của repo nhận tham số (VD Playwright: "--grep @T-042" hoặc đường dẫn file spec).
// Danh sách bước mặc định lấy từ quy trình CivicOS (PS-E1). Repo khác đổi bằng khối "verify" trong package.json:
//   "verify": { "fast": ["typecheck", "lint", "test"], "full": ["typecheck", "lint", "test", "build"] }
// Exit code: 0 = PASS, 1 = FAIL, 2 = INCOMPLETE (thiếu script / bước không chạy), 64 = sai tham số.
import { spawnSync } from 'node:child_process';
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
const keepGoing = argv.includes('--keep-going');
const treeOnly = argv.includes('--tree');
const checkOnly = argv.includes('--check');
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
    'Usage: node scripts/verify.mjs <ticket-id> [--scope=fast|full|mobile] [--only=a,b] [--filter=<pattern>] [--keep-going] [--tail=60] [--timeout=600000]',
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

function runStep(name) {
  if (!scripts[name]) return { name, status: 'MISSING', ms: 0, out: '' };
  if (name === 'format:check') {
    spawnSync('npx prettier --write .', { shell: true, encoding: 'utf8' });
  }
  const t0 = Date.now();
  const cmd = filter ? `npm run ${name} -- ${filter}` : `npm run ${name}`;
  const r = spawnSync(cmd, {
    shell: true,
    encoding: 'utf8',
    timeout,
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, CI: process.env.CI ?? '1', NO_COLOR: '1' },
  });
  const out = mask(
    `${r.stdout ?? ''}${r.stderr ? `\n--- stderr ---\n${r.stderr}` : ''}` +
      `${r.error ? `\n--- lỗi tiến trình: ${r.error.message} ---` : ''}`,
  );
  return {
    name,
    status: r.status === 0 ? 'PASS' : 'FAIL',
    ms: Date.now() - t0,
    out,
  };
}

const results = [];
let halted = false;
for (const name of steps) {
  if (halted) {
    results.push({ name, status: 'NOT_RUN', ms: 0, out: '' });
    continue;
  }
  const r = runStep(name);
  if (r.out) writeFileSync(logPath(name), r.out);
  results.push(r);
  if (r.status === 'FAIL' && !keepGoing) halted = true;
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
lines.push(`RESULT: ${overall}`, `Evidence: ${testsPath}`);
console.log(lines.join('\n'));
process.exit(overall === 'PASS' ? 0 : overall === 'FAIL' ? 1 : 2);
