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

  if (loading) return <p role="status">Đang tải hồ sơ cư dân…</p>;
  if (denied) {
    return (
      <p role="alert">Hồ sơ ngoài phạm vi phân công của tài khoản hiện tại.</p>
    );
  }
  if (error || !detail) {
    return (
      <div role="alert">
        <p>{error ?? 'Không tìm thấy hồ sơ.'}</p>
        <button type="button" onClick={() => void load()}>
          Thử lại
        </button>
      </div>
    );
  }
  return (
    <div>
      <h2>{detail.displayName}</h2>
      <p>
        {detail.masked
          ? 'Danh tính đã che theo quyền.'
          : (detail.sensitiveProfile ?? 'Không có hồ sơ nhạy cảm.')}
      </p>
      {detail.records.length ? (
        <ul>
          {detail.records.map((record) => (
            <li key={record.id}>
              <Link href={`/residents/${detail.id}/records/${record.id}`}>
                {record.purpose} · {record.status} · {record.sla}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status">Chưa có hoạt động theo dõi nào.</p>
      )}
      <Link href="/residents/reports">Tạo báo cáo tháng</Link>
    </div>
  );
}
