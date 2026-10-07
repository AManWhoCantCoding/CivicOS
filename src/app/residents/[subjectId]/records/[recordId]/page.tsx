import Link from 'next/link';

import { ActivityForm } from '@/components/residents/ActivityForm';

export default async function ResidentActivityPage({
  params,
}: {
  params: Promise<{ subjectId: string; recordId: string }>;
}) {
  const { subjectId, recordId } = await params;
  return (
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          className="text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-accent)] hover:underline"
          href={`/residents/${subjectId}`}
        >
          ← Hồ sơ cư dân
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--civicos-text)]">
          Hoạt động theo dõi
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--civicos-text-muted)]">
          Ghi nhận lần gặp hàng tháng trên web khi trực tuyến.
        </p>
        <div className="mt-8">
          <ActivityForm subjectId={subjectId} recordId={recordId} />
        </div>
      </div>
    </main>
  );
}
