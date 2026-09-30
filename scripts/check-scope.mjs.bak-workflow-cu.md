#!/usr/bin/env node
// Chốt thiết kế và chặn agent tự bịa route/module. Không dùng LLM, chạy trong vài trăm ms.
//   node scripts/check-scope.mjs lock <feature> --user-approved     # ghi hash design/*.md (CHỈ sau khi người dùng đã xác nhận)
//   node scripts/check-scope.mjs verify-lock <feature>              # exit 1 nếu thiết kế bị sửa sau khi khóa
//   node scripts/check-scope.mjs diff <ticket-file> <feature>       # so diff hiện tại với phạm vi ticket + api-contract
// Exit: 0 = sạch, 1 = vi phạm, 64 = sai tham số.
// LƯU Ý: phần dò route là heuristic (decorator @Get/@Post..., app.get/router.post...); chỉnh ROUTE_PATTERNS cho framework của bạn.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

const [cmd, a1, a2] = process.argv.slice(2).filter((x) => !x.startsWith('--'));
const flags = process.argv.slice(2).filter((x) => x.startsWith('--'));
const sh = (args) =>
  spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .stdout ?? '';
const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
const bad = [];
const IGNORE = ['.brain/', '.scratch/', '.codegraph/', 'Lesson-learned.md'];

const designDir = (f) => `.scratch/${f}/design`;
const designHashes = (f) =>
  Object.fromEntries(
    (existsSync(designDir(f)) ? readdirSync(designDir(f)) : [])
      .filter((n) => n.endsWith('.md'))
      .sort()
      .map((n) => [n, sha(readFileSync(`${designDir(f)}/${n}`, 'utf8'))]),
  );

function lock(f) {
  if (!flags.includes('--user-approved')) {
    console.error(
      'Từ chối: chỉ khóa sau khi người dùng xác nhận. Thêm --user-approved.',
    );
    process.exit(64);
  }
  const files = designHashes(f);
  for (const need of ['overview.md', 'api-contract.md', 'data-model.md'])
    if (!files[need]) bad.push(`Thiếu ${designDir(f)}/${need}`);
  for (const [n] of Object.entries(files)) {
    const t = readFileSync(`${designDir(f)}/${n}`, 'utf8');
    if (/\bTBD\b|\bTODO\b|\?\?\?|<[^>\n]{2,40}>/.test(t))
      bad.push(`${n} còn chỗ trống (TBD/TODO/???/<...>)`);
  }
  if (bad.length) return report('KHÔNG khóa được:');
  writeFileSync(
    `${designDir(f)}/LOCK.json`,
    JSON.stringify({ lockedAt: new Date().toISOString(), files }, null, 2),
  );
  console.log(`Đã khóa thiết kế ${f}: ${Object.keys(files).join(', ')}`);
}

function verifyLock(f) {
  const p = `${designDir(f)}/LOCK.json`;
  if (!existsSync(p))
    return (
      bad.push(
        'Thiết kế CHƯA được khóa (thiếu LOCK.json) — không được triển khai',
      ),
      report('Lỗi khóa:')
    );
  const locked = JSON.parse(readFileSync(p, 'utf8')).files;
  const now = designHashes(f);
  for (const n of new Set([...Object.keys(locked), ...Object.keys(now)])) {
    if (!now[n]) bad.push(`Đã bị xóa: ${n}`);
    else if (!locked[n]) bad.push(`File mới sau khi khóa: ${n}`);
    else if (locked[n] !== now[n]) bad.push(`Đã bị sửa sau khi khóa: ${n}`);
  }
  report(
    'Thiết kế đã bị thay đổi sau khi khóa (chỉ Research + người dùng được mở khóa):',
  );
  if (!bad.length) console.log('Thiết kế khớp bản đã khóa.');
}

const globRe = (g) =>
  new RegExp(
    `^${g
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '\u0000')
      .replace(/\*/g, '[^/]*')
      .replace(/\u0000/g, '.*')}$`,
  );
const norm = (p) =>
  p.replace(/:[A-Za-z_]\w*|\{[^}]+\}/g, ':p').replace(/\/+$/, '') || '/';

const ROUTE_PATTERNS = [
  /@(Get|Post|Put|Patch|Delete)\(\s*['"`]([^'"`]+)['"`]/g,
  /\.(get|post|put|patch|delete)\(\s*['"`](\/[^'"`]*)['"`]/g,
];

function diffCheck(ticketFile, f) {
  verifyLock(f);
  const ticket = readFileSync(ticketFile, 'utf8');
  const allow = (ticket.split('**File được phép sửa:**')[1] ?? '').split(
    '**File cấm sửa:**',
  )[0];
  const globs = [...allow.matchAll(/`([^`]+)`/g)]
    .map((m) => m[1])
    .filter((g) => !g.includes('...'));
  if (!globs.length)
    bad.push('Ticket không liệt kê "File được phép sửa" cụ thể');
  const res = globs.map(globRe);

  const tracked = sh(['diff', '--name-only', 'HEAD'])
    .split('\n')
    .filter(Boolean);
  const fresh = sh(['ls-files', '-o', '--exclude-standard'])
    .split('\n')
    .filter(Boolean);
  const keep = (x) => !IGNORE.some((i) => x.startsWith(i));
  for (const file of tracked.filter(keep))
    if (!res.some((r) => r.test(file))) bad.push(`NGOÀI PHẠM VI: ${file}`);
  for (const file of fresh.filter(keep))
    if (!res.some((r) => r.test(file)))
      bad.push(`FILE MỚI ngoài phạm vi (nghi tự tạo module): ${file}`);

  const contractPath = `${designDir(f)}/api-contract.md`;
  const contract = new Set();
  if (existsSync(contractPath))
    for (const line of readFileSync(contractPath, 'utf8').split('\n')) {
      const m = line.match(
        /\|\s*`?(GET|POST|PUT|PATCH|DELETE)`?\s*\|\s*`?(\/[^\s|`]*)`?/i,
      );
      if (m) contract.add(norm(m[2]));
    }
  const added =
    sh(['diff', 'HEAD', '-U0', '--', '.', ':!.brain', ':!.scratch'])
      .split('\n')
      .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
      .join('\n') +
    fresh
      .filter(keep)
      .map((x) => {
        try {
          return `\n${readFileSync(x, 'utf8')}`;
        } catch {
          return '';
        }
      })
      .join('');
  for (const re of ROUTE_PATTERNS)
    for (const m of added.matchAll(re)) {
      const route = norm(m[2].startsWith('/') ? m[2] : `/${m[2]}`);
      const ok = [...contract].some(
        (c) => c === route || c.endsWith(route) || route.endsWith(c),
      );
      if (!ok)
        bad.push(
          `ROUTE không có trong api-contract: ${m[1].toUpperCase()} ${m[2]}`,
        );
    }
  report('Vi phạm phạm vi/hợp đồng:');
  if (!bad.length) console.log('Phạm vi và route khớp thiết kế + ticket.');
}

function report(title) {
  if (!bad.length) return;
  console.log(
    [title, ...[...new Set(bad)].slice(0, 18).map((b) => `- ${b}`)].join('\n'),
  );
  process.exitCode = 1;
}

// ---- migrate: dựng BẢN NHÁP thiết kế cho feature/ticket cũ (trước khi có hệ thống khóa) bằng cách quét
// code đã tồn tại — KHÔNG tự khóa, KHÔNG thay thế bước xác nhận của người dùng qua Research. ----
function migrate(f) {
  const dir = designDir(f);
  if (existsSync(`${dir}/LOCK.json`)) {
    console.error(
      `${f} đã có LOCK.json — không phải ticket cũ cần di trú. Dùng verify-lock để kiểm tra.`,
    );
    process.exit(64);
  }
  mkdirSync(dir, { recursive: true });
  const draft = (name, body) => {
    const p2 = `${dir}/${name}`;
    if (existsSync(p2)) return console.log(`Bỏ qua (đã có): ${name}`);
    writeFileSync(p2, body);
    console.log(
      `Đã tạo bản nháp: ${name} — CẦN Research/người dùng đọc lại và sửa trước khi lock.`,
    );
  };

  // 1. Quét route trong toàn bộ src (không chỉ diff) bằng đúng ROUTE_PATTERNS dùng cho diff-check.
  const files = sh([
    'ls-files',
    '--',
    '.',
    ':!.brain',
    ':!.scratch',
    ':!node_modules',
  ])
    .split('\n')
    .filter(Boolean);
  const routes = new Set();
  for (const file of files) {
    if (!/\.(ts|js|tsx|jsx)$/.test(file)) continue;
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const re of ROUTE_PATTERNS)
      for (const m of text.matchAll(re))
        routes.add(
          `| ${m[1].toUpperCase()} | ${m[2]} | (phát hiện tự động từ ${file}) | ? | ? |`,
        );
  }
  draft(
    'api-contract.md',
    `# API contract: ${f} (BẢN NHÁP DI TRÚ — phát hiện tự động từ code hiện có, CHƯA xác nhận)\n\n` +
      `Mỗi dòng dưới đây là route ĐÃ TỒN TẠI trong code, không phải quyết định mới. Research/người dùng phải:\n` +
      `- Xác nhận từng route còn đúng, xóa route không còn dùng, điền cột Auth/Ticket.\n` +
      `- Bổ sung route MỚI (nếu ticket sắp làm thêm) bằng cách hỏi người dùng như bình thường — KHÔNG tự bịa.\n` +
      `- Điền chi tiết request/response/mã lỗi cho từng route theo mẫu \`_templates/design/api-contract.md\`.\n\n` +
      `## Route phát hiện tự động\n| Method | Path | Nguồn | Auth | Ticket |\n|---|---|---|---|---|\n` +
      (routes.size
        ? [...routes].join('\n')
        : '(không phát hiện route nào theo mẫu hiện có trong ROUTE_PATTERNS — kiểm tra thủ công)') +
      '\n',
  );

  // 2. Quét bảng trong prisma/schema.prisma (nếu có).
  let tables =
    '(không tìm thấy prisma/schema.prisma — điền thủ công hoặc trỏ nguồn schema khác)';
  if (existsSync('prisma/schema.prisma')) {
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    const names = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map(
      (m) => m[1],
    );
    tables = names.length
      ? names
          .map(
            (n) =>
              `- \`${n}\` (phát hiện tự động — xem \`prisma/schema.prisma\`, đối chiếu lại cột/ràng buộc thật)`,
          )
          .join('\n')
      : '(không tìm thấy model nào trong schema.prisma)';
  }
  draft(
    'data-model.md',
    `# Mô hình dữ liệu: ${f} (BẢN NHÁP DI TRÚ — CHƯA xác nhận)\n\n` +
      `## Bảng đã phát hiện\n${tables}\n\n` +
      `Research/người dùng: điền chi tiết cột/kiểu/ràng buộc theo mẫu \`_templates/design/data-model.md\` cho từng bảng trên, và bổ sung bảng MỚI (nếu có) bằng cách hỏi người dùng.\n`,
  );

  draft(
    'overview.md',
    `# Thiết kế tính năng: ${f} (BẢN NHÁP DI TRÚ)\n\n` +
      `Ticket này được tạo TRƯỚC khi có hệ thống khóa thiết kế. File này là điểm bắt đầu, KHÔNG PHẢI thiết kế đầy đủ.\n\n` +
      `## Việc Research/người dùng phải làm trước khi khóa\n` +
      `1. Đọc ticket gốc + \`spec.md\` cũ (nếu có) trong \`.scratch/${f}/\`, chép ý đã quyết định vào đây theo đúng mục của \`_templates/design/overview.md\` (phạm vi, NGOÀI phạm vi, bản đồ module, luồng chính, quy tắc nghiệp vụ, quyết định kỹ thuật, seam kiểm thử).\n` +
      `2. Đối chiếu \`api-contract.md\` và \`data-model.md\` vừa được dựng nháp ở trên — sửa cho đúng, xóa phần sai, hỏi người dùng phần còn thiếu.\n` +
      `3. Xóa hết \`TBD\`/\`TODO\`/\`???\`/\`<...>\` rồi mới chạy \`lock --user-approved\`.\n`,
  );

  console.log(
    `\nĐã dựng bản nháp cho ${f}. Bước tiếp theo: giao lại cho Research đọc + hỏi người dùng để hoàn thiện, rồi mới \`lock\`.`,
  );
}

const ok = { lock: a1, 'verify-lock': a1, diff: a1 && a2, migrate: a1 };
if (!ok[cmd]) {
  console.error(
    'Usage: lock <feature> --user-approved | verify-lock <feature> | diff <ticket-file> <feature> | migrate <feature>',
  );
  process.exit(64);
}
({
  lock: () => lock(a1),
  'verify-lock': () => verifyLock(a1),
  diff: () => diffCheck(a1, a2),
  migrate: () => migrate(a1),
})[cmd]();
