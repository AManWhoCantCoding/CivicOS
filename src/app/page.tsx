import Link from 'next/link';

import { SessionControls } from '@/components/identity/SessionControls';

const modules = [
  {
    href: '/incidents',
    label: '01 / Incident',
    title: 'Hàng đợi vụ việc',
    description:
      'Tiếp nhận, phân loại, phân công và theo dõi vòng đời Incident.',
  },
  {
    href: '/inspections/establishments',
    label: '02 / Inspection',
    title: 'Cơ sở kinh doanh',
    description: 'Lịch kiểm tra, checklist theo loại hình và đề xuất xử lý.',
  },
  {
    href: '/field/vehicles',
    label: '03 / Field',
    title: 'Phương tiện hiện trường',
    description: 'Ghi nhận nhanh, GPS, offline sync và xác minh biển số.',
  },
];

export default function Home() {
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
        <section className="grid gap-4 md:grid-cols-3">
          {modules.map((module) => (
            <a
              key={module.href}
              href={module.href}
              className="group rounded-2xl border p-5 transition hover:-translate-y-0.5"
              style={{
                background: 'var(--civicos-surface)',
                borderColor: 'var(--civicos-border)',
                borderRadius: 'var(--civicos-radius-lg)',
              }}
            >
              <p
                className="font-mono text-[11px] tracking-[0.16em] uppercase"
                style={{ color: 'var(--civicos-text-muted)' }}
              >
                {module.label}
              </p>
              <h2 className="mt-12 text-xl font-semibold">{module.title}</h2>
              <p
                className="mt-3 min-h-12 text-sm leading-6"
                style={{ color: 'var(--civicos-text-muted)' }}
              >
                {module.description}
              </p>
              <span
                className="mt-6 inline-block min-h-[44px] text-sm font-semibold"
                style={{ color: 'var(--civicos-accent)' }}
              >
                Mở phân hệ →
              </span>
            </a>
          ))}
        </section>
        <section
          className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
          style={{
            background: 'var(--civicos-surface)',
            borderColor: 'var(--civicos-border)',
            borderRadius: 'var(--civicos-radius-lg)',
          }}
        >
          <div>
            <p className="text-sm font-semibold">Identity / Assignment</p>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: 'var(--civicos-text-muted)' }}
            >
              Quản lý phân công theo hồ sơ và task trong phạm vi chỉ huy.
            </p>
          </div>
          <Link
            href="/assignments"
            className="min-h-[44px] rounded-lg border px-4 py-2.5 text-sm font-semibold"
            style={{
              borderColor: 'var(--civicos-border)',
              borderRadius: 'var(--civicos-radius-sm)',
              color: 'var(--civicos-accent)',
              background: 'var(--civicos-surface)',
            }}
          >
            Mở Assignment
          </Link>
        </section>
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
