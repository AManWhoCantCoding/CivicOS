import { LoginForm } from '@/components/identity/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-5xl items-center gap-8 sm:min-h-[calc(100dvh-6rem)] sm:gap-10 lg:min-h-[calc(100dvh-8rem)] lg:grid-cols-[1fr_22rem] lg:gap-16">
        <section className="max-w-xl">
          <p className="mb-5 font-mono text-xs tracking-[0.18em] text-[var(--civicos-accent)] uppercase">
            CivicOS / NỘI BỘ
          </p>
          <h1 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight text-[var(--civicos-text)] sm:text-4xl lg:text-6xl">
            Vào đúng hồ sơ. Làm đúng nhiệm vụ.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 break-words text-[var(--civicos-text-muted)]">
            Đăng nhập để tiếp nhận, phân công và theo dõi công việc trong phạm
            vi được cấp quyền.
          </p>
        </section>
        <LoginForm />
      </div>
    </main>
  );
}
