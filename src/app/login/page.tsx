import { LoginForm } from '@/components/identity/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto grid min-h-[calc(100dvh-8rem)] max-w-5xl items-center gap-16 lg:grid-cols-[1fr_22rem]">
        <section className="max-w-xl">
          <p className="mb-5 font-mono text-xs tracking-[0.18em] text-cyan-300 uppercase">
            CivicOS / NỘI BỘ
          </p>
          <h1 className="max-w-lg text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Vào đúng hồ sơ. Làm đúng nhiệm vụ.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
            Đăng nhập để tiếp nhận, phân công và theo dõi công việc trong phạm
            vi được cấp quyền.
          </p>
        </section>
        <LoginForm />
      </div>
    </main>
  );
}
