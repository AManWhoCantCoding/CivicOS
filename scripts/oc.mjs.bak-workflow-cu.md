#!/usr/bin/env node
// Điều khiển opencode server từ xa. Hermes (hoặc bạn) gọi các lệnh ngắn, đầu ra <= 20 dòng.
//   node scripts/oc.mjs start <ticket-id> [--agent=planner] [--dir=<đường dẫn worktree>]
//   node scripts/oc.mjs say   <ticket-id> <nội dung>    # nhắn thêm/trả lời vào phiên của ticket
//   node scripts/oc.mjs status                          # phiên nào đang bận/rảnh
//   node scripts/oc.mjs digest <ticket-id> [--dir=..]   # đọc .brain/evidence/<id>/digest.md
//   node scripts/oc.mjs stop  <ticket-id>               # abort phiên
//   node scripts/oc.mjs watch                           # nghe SSE, đẩy thông báo thẳng Telegram (0 token LLM)
// Biến môi trường: OPENCODE_URL (mặc định http://127.0.0.1:4096), OPENCODE_SERVER_PASSWORD,
//   CIVICOS_DIR (mặc định cwd), TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
// LƯU Ý: đường dẫn API dựa trên tài liệu opencode server; đối chiếu với http://127.0.0.1:4096/doc khi nâng cấp opencode.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const URL_ = (process.env.OPENCODE_URL ?? 'http://127.0.0.1:4096').replace(
  /\/$/,
  '',
);
const PW = process.env.OPENCODE_SERVER_PASSWORD;
const ROOT = process.env.CIVICOS_DIR ?? process.cwd();
const STATE = `${ROOT}/.brain/oc-state.json`;
const args = process.argv.slice(2);
const flag = (k, d) =>
  args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const pos = args.filter((a) => !a.startsWith('--'));
const [cmd, ticket, ...rest] = pos;

const headers = {
  'content-type': 'application/json',
  ...(PW
    ? {
        authorization: `Basic ${Buffer.from(`opencode:${PW}`).toString('base64')}`,
      }
    : {}),
};
const api = async (method, path, body, dir = ROOT) => {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(
    `${URL_}${path}${sep}directory=${encodeURIComponent(dir)}`,
    {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  if (!res.ok)
    throw new Error(
      `${method} ${path} → ${res.status} ${await res.text().catch(() => '')}`.slice(
        0,
        300,
      ),
    );
  const t = await res.text();
  return t ? JSON.parse(t) : {};
};
const load = () =>
  existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
const save = (s) => {
  mkdirSync(`${ROOT}/.brain`, { recursive: true });
  writeFileSync(STATE, JSON.stringify(s, null, 2));
};
const need = (t) => {
  const e = load()[t];
  if (!e) throw new Error(`Chưa có phiên cho ticket ${t}. Chạy: start ${t}`);
  return e;
};
const clip = (s, n = 20) => s.trim().split('\n').slice(0, n).join('\n');

async function telegram(text) {
  const { TELEGRAM_BOT_TOKEN: tk, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!tk || !chat) return console.log(`[telegram tắt] ${text}`);
  await fetch(`https://api.telegram.org/bot${tk}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3800) }),
  }).catch((e) => console.error('telegram lỗi:', e.message));
}

function digestOf(t, dir) {
  const p = `${dir}/.brain/evidence/${t}/digest.md`;
  return existsSync(p)
    ? clip(readFileSync(p, 'utf8'), 25)
    : '(chưa có digest — chưa chạy verify)';
}

const commands = {
  async start() {
    const dir = flag('dir', ROOT);
    const agent = flag('agent', 'mentor');
    const s = await api('POST', '/session', { title: `ticket ${ticket}` }, dir);
    const st = load();
    st[ticket] = { id: s.id, dir, agent };
    save(st);
    const text = `Xử lý ticket ${ticket} trong .scratch/. Làm theo quy trình Fast/Full Lane của bạn, dừng và báo cáo khi xong hoặc khi cần người dùng.`;
    await api(
      'POST',
      `/session/${s.id}/prompt_async`,
      { agent, parts: [{ type: 'text', text }] },
      dir,
    );
    console.log(
      `Đã bắt đầu ${ticket} (phiên ${s.id}, agent ${agent}, dir ${dir})`,
    );
  },
  async say() {
    const e = need(ticket);
    await api(
      'POST',
      `/session/${e.id}/prompt_async`,
      { agent: e.agent, parts: [{ type: 'text', text: rest.join(' ') }] },
      e.dir,
    );
    console.log(`Đã gửi vào phiên ${ticket}.`);
  },
  async status() {
    const st = load();
    const live = await api('GET', '/session/status');
    const rows = Object.entries(st).map(
      ([t, e]) =>
        `${t.padEnd(12)} ${(live[e.id]?.type ?? 'idle').padEnd(6)} ${e.agent} ${e.dir}`,
    );
    console.log(rows.length ? rows.join('\n') : 'Chưa có phiên nào.');
  },
  async digest() {
    console.log(digestOf(ticket, load()[ticket]?.dir ?? flag('dir', ROOT)));
  },
  async stop() {
    const e = need(ticket);
    await api('POST', `/session/${e.id}/abort`, undefined, e.dir);
    console.log(`Đã dừng phiên ${ticket}.`);
  },
  async watch() {
    console.log('Đang nghe sự kiện từ opencode…');
    for (;;) {
      try {
        const res = await fetch(`${URL_}/event`, { headers });
        const dec = new TextDecoder();
        let buf = '';
        for await (const chunk of res.body) {
          buf += dec.decode(chunk, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const raw = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const data = raw.split('\n').find((l) => l.startsWith('data:'));
            if (!data) continue;
            let ev;
            try {
              ev = JSON.parse(data.slice(5));
            } catch {
              continue;
            }
            await onEvent(ev.payload ?? ev);
          }
        }
      } catch (e) {
        console.error('mất kết nối, thử lại sau 5s:', e.message);
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  },
};

const lastNotified = {};
async function onEvent(ev) {
  const type = ev?.type ?? '';
  const sid = ev?.properties?.sessionID ?? ev?.properties?.info?.id;
  const hit = Object.entries(load()).find(([, e]) => e.id === sid);
  if (!hit) return;
  const [t, e] = hit;
  const now = Date.now();
  if (type === 'session.idle' && now - (lastNotified[sid] ?? 0) > 10_000) {
    lastNotified[sid] = now;
    await telegram(`✅ ${t}: phiên đã rảnh.\n${digestOf(t, e.dir)}`);
  } else if (type === 'session.error') {
    await telegram(
      `❌ ${t}: phiên lỗi.\n${JSON.stringify(ev.properties?.error ?? {}).slice(0, 500)}`,
    );
  } else if (/question|permission/.test(type)) {
    await telegram(
      `❓ ${t}: agent cần bạn trả lời/duyệt (${type}). Trả lời bằng: say ${t} <nội dung>`,
    );
  }
}

if (
  !commands[cmd] ||
  (['start', 'say', 'digest', 'stop'].includes(cmd) && !ticket)
) {
  console.error(
    'Usage: node scripts/oc.mjs <start|say|status|digest|stop|watch> [ticket-id] [...]',
  );
  process.exit(64);
}
commands[cmd]().catch((e) => {
  console.error(`Lỗi: ${e.message}`);
  process.exit(1);
});
