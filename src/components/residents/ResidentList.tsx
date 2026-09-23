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
    return <p role="status">Đang tải danh sách cư dân…</p>;
  }
  if (denied) {
    return (
      <p role="alert">
        Tài khoản không có quyền xem hồ sơ cư dân trong phạm vi này.
      </p>
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
  const visible = (entries ?? []).filter(
    (entry) => !filter || entry.subjectType === filter,
  );
  if (!visible.length) {
    return <p role="status">Chưa có hồ sơ cư dân đặc biệt nào.</p>;
  }
  return (
    <div>
      <label>
        Loại cư dân
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="">Tất cả</option>
          <option value="temporary_resident">Tạm trú dài hạn</option>
          <option value="foreign_resident">Người nước ngoài</option>
          <option value="reintegration">Tái hòa nhập</option>
        </select>
      </label>
      <table>
        <thead>
          <tr>
            <th>Cư dân</th>
            <th>Loại</th>
            <th>Lịch gặp</th>
            <th>SLA</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((entry) => (
            <tr key={entry.id}>
              <td>
                <Link href={`/residents/${entry.id}`}>{entry.displayName}</Link>
              </td>
              <td>{entry.subjectType}</td>
              <td>{entry.records[0]?.nextCheckAt ?? '—'}</td>
              <td>{slaLabel(entry.records[0]?.sla ?? 'unknown')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
