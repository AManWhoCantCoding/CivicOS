'use client';

import { useCallback, useEffect, useState } from 'react';

type ReportEntry = {
  id: string;
  organizationId: string;
  period: string;
  status: string;
  aggregateCounts: unknown;
  snapshotPayload: unknown;
  snapshotHash: string | null;
};

export function ReportPreview({ organizationId }: { organizationId: string }) {
  const [reports, setReports] = useState<ReportEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [targetOrganizationId, setTargetOrganizationId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const response = await fetch(
        `/api/residents/reports/monthly?organizationId=${encodeURIComponent(organizationId)}`,
        { cache: 'no-store' },
      );
      if (response.status === 403) setDenied(true);
      if (!response.ok) throw new Error('REPORTS_FAILED');
      const body = (await response.json()) as {
        reports?: ReportEntry[];
      };
      setReports(body.reports ?? []);
    } catch {
      setError('Không tải được báo cáo. Thử lại.');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function decide(reportId: string, kind: 'approve' | 'send') {
    if (kind === 'send' && !targetOrganizationId.trim()) {
      setError('Nhập đơn vị cấp trên nhận báo cáo.');
      return;
    }
    setAction(reportId);
    setError(null);
    try {
      const url =
        kind === 'approve'
          ? `/api/residents/reports/${reportId}/approve`
          : `/api/residents/reports/${reportId}/send`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          kind === 'send'
            ? { targetOrganizationId: targetOrganizationId.trim() }
            : {},
        ),
      });
      if (response.status === 403) setDenied(true);
      if (!response.ok) throw new Error('REPORT_ACTION_FAILED');
      await load();
    } catch {
      setError('Không xử lý được báo cáo. Thử lại.');
    } finally {
      setAction(null);
    }
  }

  if (loading)
    return (
      <div
        className="space-y-3"
        role="status"
        aria-label="Đang tải báo cáo tháng"
      >
        <div className="h-24 rounded-xl bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse" />
        <p className="text-sm text-[var(--civicos-info)]">
          Đang tải báo cáo tháng…
        </p>
      </div>
    );
  if (denied) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] p-4 text-sm text-[var(--civicos-danger)]"
      >
        Tài khoản không có quyền phê duyệt báo cáo đơn vị này.
      </p>
    );
  }
  if (error) {
    return (
      <div
        role="alert"
        className="space-y-3 rounded-xl border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] p-4"
      >
        <p className="text-sm text-[var(--civicos-danger)]">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-[44px] rounded-lg border border-[var(--civicos-danger)] px-4 py-2 text-sm text-[var(--civicos-danger)] hover:opacity-80"
        >
          Thử lại
        </button>
      </div>
    );
  }
  if (!reports?.length) {
    return (
      <p
        role="status"
        className="rounded-xl border border-dashed border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5 text-sm text-[var(--civicos-text-muted)]"
      >
        Chưa đủ dữ liệu nguồn cho báo cáo tháng.
      </p>
    );
  }
  return (
    <div className="space-y-4 rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5">
      <label className="block text-sm text-[var(--civicos-text)]">
        Đơn vị cấp trên nhận báo cáo
        <input
          value={targetOrganizationId}
          onChange={(event) => setTargetOrganizationId(event.target.value)}
          placeholder="Nhập ID đơn vị cấp trên"
          className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2 text-sm text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)]"
        />
      </label>
      <ul className="space-y-2">
        {reports.map((report) => (
          <li
            key={report.id}
            className="space-y-2 rounded-lg border border-[var(--civicos-border)] p-3"
          >
            <p className="text-sm text-[var(--civicos-text)]">
              {report.period} · {report.status}
            </p>
            {report.snapshotHash ? (
              <p className="font-mono text-xs text-[var(--civicos-text-muted)]">
                Snapshot bất biến: {report.snapshotHash.slice(0, 12)}…
              </p>
            ) : null}
            {report.status === 'draft' ? (
              <button
                type="button"
                disabled={action === report.id}
                onClick={() => void decide(report.id, 'approve')}
                className="min-h-[44px] rounded-lg bg-[var(--civicos-accent)] px-4 py-2 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)] disabled:opacity-50"
              >
                Phê duyệt
              </button>
            ) : null}
            {report.status === 'approved' ? (
              <button
                type="button"
                disabled={action === report.id}
                onClick={() => void decide(report.id, 'send')}
                className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2 text-sm text-[var(--civicos-accent)] hover:border-[var(--civicos-accent)] disabled:opacity-50"
              >
                Gửi cấp trên
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
