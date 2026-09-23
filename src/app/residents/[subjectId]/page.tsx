import Link from 'next/link';

import { ResidentDetail } from '@/components/residents/ResidentDetail';

export default async function ResidentDetailPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
          href="/residents"
        >
          ← Danh sách cư dân
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
          Hồ sơ cư dân
        </h1>
        <div className="mt-8">
          <ResidentDetail subjectId={subjectId} />
        </div>
      </div>
    </main>
  );
}
