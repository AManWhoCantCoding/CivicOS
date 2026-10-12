import { SessionControls } from '@/components/identity/SessionControls';
import { RoleWorkspace } from '@/components/workspace/RoleWorkspace';
import { evaluateDemoTargetGuard } from '@/modules/demo/target-guard';

export default function Home() {
  // Server-computed sanitized target result only; raw URLs never leave the
  // server boundary. Demo mode stays off unless explicitly enabled.
  const demoTarget = evaluateDemoTargetGuard({
    demoModeEnabled: process.env.CIVICOS_DEMO_MODE === 'LIVE_DEMO',
    demoDatabaseUrl: process.env.DEMO_DATABASE_URL,
    databaseUrl: process.env.DATABASE_URL,
  });
  return (
    <main
      className="min-h-dvh px-4 py-8 sm:px-6 lg:px-10"
      style={{
        background: 'var(--civicos-canvas)',
        color: 'var(--civicos-text)',
      }}
    >
      <div className="mx-auto max-w-7xl">
        <header
          className="flex items-center justify-between border-b pb-6"
          style={{ borderColor: 'var(--civicos-border)' }}
        >
          <div>
            <p
              className="font-mono text-xs tracking-[0.18em] uppercase"
              style={{ color: 'var(--civicos-accent)' }}
            >
              CivicOS / Nghĩa Trụ
            </p>
            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--civicos-text-muted)' }}
            >
              Operational command surface
            </p>
          </div>
          <SessionControls />
        </header>
        <section className="grid gap-10 py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-end lg:py-24">
          <div>
            <p
              className="font-mono text-xs tracking-[0.18em] uppercase"
              style={{ color: 'var(--civicos-text-muted)' }}
            >
              Trung tâm điều hành
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Một nơi để biết việc gì đang xảy ra.
            </h1>
            <p
              className="mt-6 max-w-2xl text-lg leading-8"
              style={{ color: 'var(--civicos-text-muted)' }}
            >
              CivicOS nối công việc trực ban, hiện trường và kiểm tra trong một
              lịch sử nghiệp vụ có thể truy vết.
            </p>
          </div>
          <aside
            className="border-l pl-6 lg:mb-2"
            style={{ borderColor: 'var(--civicos-border)' }}
          >
            <p className="text-sm font-semibold">
              Bắt đầu từ phạm vi được giao
            </p>
            <p
              className="mt-3 text-sm leading-6"
              style={{ color: 'var(--civicos-text-muted)' }}
            >
              Mỗi hồ sơ hiển thị theo quyền và Assignment của tài khoản. Không
              có quyền xem mặc định cho toàn đơn vị.
            </p>
          </aside>
        </section>
        <RoleWorkspace demoTarget={demoTarget} />
        <footer
          className="mt-20 border-t pt-5 text-xs"
          style={{
            borderColor: 'var(--civicos-border)',
            color: 'var(--civicos-text-muted)',
          }}
        >
          Event-first foundation · PostgreSQL · projection freshness target p95
          ≤ 10s
        </footer>
      </div>
    </main>
  );
}
