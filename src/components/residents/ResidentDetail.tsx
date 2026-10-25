'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type RecordEntry = {
  id: string;
  purpose: string;
  status: string;
  riskLevel: string;
  nextCheckAt: string | null;
  sla: string;
  version: number;
};

type SubjectDetail = {
  id: string;
  displayName: string;
  subjectType: string;
  status: string;
  sensitiveProfile: string | null;
  masked: boolean;
  records: RecordEntry[];
};

export function ResidentDetail({ subjectId }: { subjectId: string }) {
  const [detail, setDetail] = useState<SubjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const response = await fetch(`/api/residents/${subjectId}`, {
        cache: 'no-store',
      });
      if (response.status === 403) setDenied(true);
      if (!response.ok) throw new Error('SUBJECT_FAILED');
      const body = (await response.json()) as {
        subject?: SubjectDetail;
      };
      setDetail(body.subject ?? null);
    } catch {
      setError('Không tải được hồ sơ. Thử lại.');
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading)
    return (
      <div
        className="space-y-3"
        role="status"
        aria-label="Đang tải hồ sơ cư dân"
      >
        <div className="h-8 w-64 rounded-lg bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse" />
        <div className="h-24 rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] motion-safe:animate-pulse" />
        <div className="h-16 rounded-xl bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse" />
        <p className="text-sm text-[var(--civicos-info)]">
          <span aria-hidden="true">◌ </span>
          Đang tải hồ sơ cư dân…
        </p>
      </div>
    );
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
          Hồ sơ ngoài phạm vi phân công của tài khoản hiện tại.
        </span>
      </p>
    );
  }
  if (error || !detail) {
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
          {error ?? 'Không tìm thấy hồ sơ.'}
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
  return (
    <div className="space-y-4 rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--civicos-text)]">
            {detail.displayName}
          </h2>
          <p className="mt-1 text-xs tracking-wide text-[var(--civicos-text-muted)]">
            Hồ sơ cư dân đặc biệt
          </p>
        </div>
        {detail.masked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--civicos-info)] px-3 py-1 text-xs font-medium text-[var(--civicos-info)]">
            <span aria-hidden="true">ℹ </span>
            Đã che danh tính
          </span>
        ) : null}
      </div>
      <p
        className="rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] p-3 text-sm leading-6 text-[var(--civicos-text)]"
        style={
          detail.masked
            ? {
                borderLeftWidth: '3px',
                borderLeftColor: 'var(--civicos-info)',
                color: 'var(--civicos-info)',
              }
            : undefined
        }
      >
        {detail.masked ? (
          <>
            <span aria-hidden="true">ℹ </span>
            Danh tính đã che theo quyền.
          </>
        ) : (
          (detail.sensitiveProfile ?? 'Không có hồ sơ nhạy cảm.')
        )}
      </p>
      {detail.records.length ? (
        <ul className="space-y-2">
          {detail.records.map((record) => (
            <li
              key={record.id}
              className="rounded-lg border border-[var(--civicos-border)]"
            >
              <Link
                href={`/residents/${detail.id}/records/${record.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm text-[var(--civicos-accent)] motion-safe:transition-colors hover:bg-[var(--civicos-surface-muted)]"
              >
                <span className="font-medium">{record.purpose}</span>
                <span className="flex flex-wrap items-center gap-2 text-xs text-[var(--civicos-text-muted)]">
                  <span>{record.status}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{record.sla}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p
          role="status"
          className="rounded-xl border border-dashed border-[var(--civicos-border)] p-4 text-sm text-[var(--civicos-text-muted)]"
        >
          <span aria-hidden="true">○ </span>
          Chưa có hoạt động theo dõi nào.
        </p>
      )}
      <Link
        href="/residents/reports"
        className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-4 text-sm text-[var(--civicos-accent)] motion-safe:transition-colors hover:border-[var(--civicos-accent)]"
      >
        Tạo báo cáo tháng
      </Link>
    </div>
  );
}
