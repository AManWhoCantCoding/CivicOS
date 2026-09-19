const modules = [
  {
    href: '/incidents',
    label: '01 / Incident',
    title: 'Hàng đợi vụ việc',
    description:
      'Tiếp nhận, phân loại, phân công và theo dõi vòng đời Incident.',
    tone: 'border-cyan-400/30 bg-cyan-400/[0.06]',
  },
  {
    href: '/inspections/establishments',
    label: '02 / Inspection',
    title: 'Cơ sở kinh doanh',
    description: 'Lịch kiểm tra, checklist theo loại hình và đề xuất xử lý.',
    tone: 'border-emerald-400/30 bg-emerald-400/[0.06]',
  },
  {
    href: '/field/vehicles',
    label: '03 / Field',
    title: 'Phương tiện hiện trường',
    description: 'Ghi nhận nhanh, GPS, offline sync và xác minh biển số.',
    tone: 'border-amber-400/30 bg-amber-400/[0.06]',
  },
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-cyan-300 uppercase">
              CivicOS / Nghĩa Trụ
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Operational command surface
            </p>
          </div>
          <a
            href="/login"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-300 hover:text-white"
          >
            Đăng nhập
          </a>
        </header>
        <section className="grid gap-10 py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-end lg:py-24">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-slate-500 uppercase">
              Trung tâm điều hành
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Một nơi để biết việc gì đang xảy ra.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              CivicOS nối công việc trực ban, hiện trường và kiểm tra trong một
              lịch sử nghiệp vụ có thể truy vết.
            </p>
          </div>
          <aside className="border-l border-slate-800 pl-6 lg:mb-2">
            <p className="text-sm font-semibold text-white">
              Bắt đầu từ phạm vi được giao
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
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
              className={`group rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:border-slate-500 ${module.tone}`}
            >
              <p className="font-mono text-[11px] tracking-[0.16em] text-slate-400 uppercase">
                {module.label}
              </p>
              <h2 className="mt-12 text-xl font-semibold text-white">
                {module.title}
              </h2>
              <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">
                {module.description}
              </p>
              <span className="mt-6 inline-block text-sm font-semibold text-slate-200 group-hover:text-white">
                Mở phân hệ →
              </span>
            </a>
          ))}
        </section>
        <footer className="mt-20 border-t border-slate-800 pt-5 text-xs text-slate-600">
          Event-first foundation · PostgreSQL · projection freshness target p95
          ≤ 10s
        </footer>
      </div>
    </main>
  );
}
