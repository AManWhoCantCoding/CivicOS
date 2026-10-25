'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type ResidentRecordEntry = {
  id: string;
  purpose: string;
  status: string;
  riskLevel: string;
  nextCheckAt: string | null;
  sla: string;
};

type ResidentEntry = {
  id: string;
  displayName: string;
  subjectType: string;
  status: string;
  records: ResidentRecordEntry[];
};

function slaLabel(sla: string): string {
  if (sla === 'overdue') return 'Quá hạn';
  if (sla === 'due_soon') return 'Sắp đến hạn';
  if (sla === 'unknown') return 'Chưa có lịch';
  return 'Đúng hạn';
}

function slaIcon(sla: string): string {
  if (sla === 'overdue') return '⚠';
  if (sla === 'due_soon') return '◷';
  if (sla === 'unknown') return '○';
  return '●';
}

// Presentation-only SLA tone mapping: state stays text + icon, color only
// reinforces the same meaning per the shared Light/Blue semantic contract.
function slaBadgeClass(sla: string): string {
  if (sla === 'overdue')
    return 'border-[var(--civicos-danger)] text-[var(--civicos-danger)]';
  if (sla === 'due_soon')
    return 'border-[var(--civicos-warning)] text-[var(--civicos-warning)]';
  if (sla === 'unknown')
    return 'border-[var(--civicos-border)] text-[var(--civicos-text-muted)]';
  return 'border-[var(--civicos-success)] text-[var(--civicos-success)]';
}

export function ResidentList() {
  const [entries, setEntries] = useState<ResidentEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const response = await fetch('/api/residents', {
        cache: 'no-store',
      });
      if (response.status === 403) setDenied(true);
      if (!response.ok) throw new Error('RESIDENTS_FAILED');
      const body = (await response.json()) as {
        subjects?: ResidentEntry[];
      };
      setEntries(body.subjects ?? []);
    } catch {
      setError('Không tải được danh sách cư dân. Thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) {
    return (
      <div
        className="space-y-3"
        role="status"
        aria-label="Đang tải danh sách cư dân"
      >
        <div className="h-8 w-52 rounded-lg bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse" />
        <div className="overflow-hidden rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)]">
          <div className="h-10 border-b border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse" />
          <div className="divide-y divide-[var(--civicos-border)]">
            <div className="h-12 motion-safe:animate-pulse" />
            <div className="h-12 motion-safe:animate-pulse" />
            <div className="h-12 motion-safe:animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-[var(--civicos-info)]">
          <span aria-hidden="true">◌ </span>
          Đang tải danh sách cư dân…
        </p>
      </div>
    );
  }
  if (denied) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4"
        style={{
          borderLeftWidth: '3px',
          borderLeftColor: 'var(--civicos-danger)',
        }}
      >
        <span className="text-sm font-medium text-[var(--civicos-danger)]">
          <span aria-hidden="true">⚠ </span>
          Tài khoản không có quyền xem hồ sơ cư dân trong phạm vi này.
        </span>
      </p>
    );
  }
  if (error) {
    return (
      <div
        role="alert"
        className="space-y-3 rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4"
        style={{
          borderLeftWidth: '3px',
          borderLeftColor: 'var(--civicos-danger)',
        }}
      >
        <p className="text-sm font-medium text-[var(--civicos-danger)]">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 text-sm text-[var(--civicos-text)] motion-safe:transition-colors hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]"
        >
          Thử lại
        </button>
      </div>
    );
  }
  const visible = (entries ?? []).filter(
    (entry) => !filter || entry.subjectType === filter,
  );
  if (!visible.length) {
    return (
      <p
        role="status"
        className="rounded-xl border border-dashed border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5 text-sm text-[var(--civicos-text-muted)]"
      >
        <span aria-hidden="true">○ </span>
        Chưa có hồ sơ cư dân đặc biệt nào.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <label className="block max-w-xs text-sm text-[var(--civicos-text)]">
        Loại cư dân
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2 text-sm text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)]"
        >
          <option value="">Tất cả</option>
          <option value="temporary_resident">Tạm trú dài hạn</option>
          <option value="foreign_resident">Người nước ngoài</option>
          <option value="reintegration">Tái hòa nhập</option>
        </select>
      </label>
      <div className="overflow-hidden rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)]">
        <table className="w-full border-collapse text-sm">
          <caption className="px-3 py-3 text-left text-xs text-[var(--civicos-text-muted)]">
            Danh sách cư dân đặc biệt theo phân công
          </caption>
          <thead>
            <tr className="bg-[var(--civicos-surface-muted)] text-left text-xs tracking-wide text-[var(--civicos-text-muted)]">
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2.5 font-medium"
              >
                Cư dân
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2.5 font-medium"
              >
                Loại
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2.5 font-medium"
              >
                Lịch gặp
              </th>
              <th
                scope="col"
                className="border-b border-[var(--civicos-border)] px-3 py-2.5 font-medium"
              >
                SLA
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => {
              const sla = entry.records[0]?.sla ?? 'unknown';
              return (
                <tr
                  key={entry.id}
                  className="border-b border-[var(--civicos-border)]"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/residents/${entry.id}`}
                      className="text-[var(--civicos-accent)] underline-offset-4 hover:underline"
                    >
                      {entry.displayName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-[var(--civicos-text)]">
                    {entry.subjectType}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-[var(--civicos-text)]">
                    {entry.records[0]?.nextCheckAt ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${slaBadgeClass(sla)}`}
                    >
                      <span aria-hidden="true">{slaIcon(sla)}</span>
                      {slaLabel(sla)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
