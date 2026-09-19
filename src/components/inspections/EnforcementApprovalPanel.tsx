'use client';

export function EnforcementApprovalPanel({
  inspectionId,
  recommendations,
}: {
  inspectionId: string;
  recommendations: Array<{ id: string; action: string; status: string }>;
}) {
  async function approve(id: string) {
    await fetch(`/api/inspections/${inspectionId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: 'approve', recommendationId: id }),
    });
  }
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-semibold text-white">Đề xuất xử lý</h2>
      {recommendations.length ? (
        <div className="mt-4 space-y-3">
          {recommendations.map((recommendation) => (
            <div
              key={recommendation.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 p-3"
            >
              <div>
                <p className="text-sm text-slate-200">
                  {recommendation.action}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {recommendation.status}
                </p>
              </div>
              <button
                onClick={() => approve(recommendation.id)}
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:border-cyan-300"
              >
                Duyệt
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Chưa có đề xuất.</p>
      )}
    </section>
  );
}
