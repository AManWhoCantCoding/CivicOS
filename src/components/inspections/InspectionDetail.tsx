'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { ChecklistForm } from './ChecklistForm';
import { EnforcementApprovalPanel } from './EnforcementApprovalPanel';

type InspectionData = {
  inspection: { id: string; status: string } | null;
  findings: Array<{ id: string }>;
  recommendations: Array<{ id: string; action: string; status: string }>;
};

export function InspectionDetail({ inspectionId }: { inspectionId: string }) {
  const [data, setData] = useState<InspectionData | null>(null);
  useEffect(() => {
    fetch(`/api/inspections/${inspectionId}`)
      .then((response) => response.json())
      .then(setData);
  }, [inspectionId]);
  if (!data?.inspection)
    return (
      <main className="min-h-dvh bg-slate-950 p-8 text-slate-400">
        Đang tải Inspection…
      </main>
    );
  if (!data.inspection)
    return (
      <main className="min-h-dvh bg-slate-950 p-8 text-slate-400">
        Inspection không tồn tại.
      </main>
    );
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/inspections/establishments"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Cơ sở
        </Link>
        <div className="mt-10">
          <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
            Inspection
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            {data.inspection.id}
          </h1>
          <p className="mt-3 text-slate-400">
            Trạng thái: {data.inspection.status}
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <ChecklistForm inspectionId={inspectionId} />
          <EnforcementApprovalPanel
            inspectionId={inspectionId}
            recommendations={data.recommendations}
          />
        </div>
      </div>
    </main>
  );
}
