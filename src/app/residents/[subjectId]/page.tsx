import Link from 'next/link';

import { ResidentDetail } from '@/components/residents/ResidentDetail';

export default async function ResidentDetailPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  return (
    <main className="min-h-dvh bg-[var(--civicos-canvas)] px-4 py-8 text-[var(--civicos-text)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          className="text-sm text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-accent)] hover:underline"
          href="/residents"
        >
          ← Danh sách cư dân
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--civicos-text)]">
          Hồ sơ cư dân
        </h1>
        <div className="mt-8">
          <ResidentDetail subjectId={subjectId} />
        </div>
      </div>
    </main>
  );
}
