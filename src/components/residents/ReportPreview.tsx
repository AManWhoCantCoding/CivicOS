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

  if (loading) return <p role="status">Đang tải báo cáo tháng…</p>;
  if (denied) {
    return (
      <p role="alert">Tài khoản không có quyền phê duyệt báo cáo đơn vị này.</p>
    );
  }
  if (error) {
    return (
      <div role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => void load()}>
          Thử lại
        </button>
      </div>
    );
  }
  if (!reports?.length) {
    return <p role="status">Chưa đủ dữ liệu nguồn cho báo cáo tháng.</p>;
  }
  return (
    <div>
      <label>
        Đơn vị cấp trên nhận báo cáo
        <input
          value={targetOrganizationId}
          onChange={(event) => setTargetOrganizationId(event.target.value)}
          placeholder="Nhập ID đơn vị cấp trên"
        />
      </label>
      <ul>
        {reports.map((report) => (
          <li key={report.id}>
            <p>
              {report.period} · {report.status}
            </p>
            {report.snapshotHash ? (
              <p>Snapshot bất biến: {report.snapshotHash.slice(0, 12)}…</p>
            ) : null}
            {report.status === 'draft' ? (
              <button
                type="button"
                disabled={action === report.id}
                onClick={() => void decide(report.id, 'approve')}
              >
                Phê duyệt
              </button>
            ) : null}
            {report.status === 'approved' ? (
              <button
                type="button"
                disabled={action === report.id}
                onClick={() => void decide(report.id, 'send')}
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
