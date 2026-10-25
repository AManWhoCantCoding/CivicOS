'use client';

import { FormEvent, useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

import type { EstablishmentRecord } from './EstablishmentForm';

type UserOption = { id: string; name: string | null; email: string };

export function InspectionScheduleForm({
  establishments,
  establishmentId,
  onScheduled,
}: {
  establishments: EstablishmentRecord[];
  establishmentId?: string;
  onScheduled?: () => void;
}) {
  const online = useOnlineStatus();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [assigneeMessage, setAssigneeMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');

  useEffect(() => {
    if (!online) return;
    fetch('/api/identity/users')
      .then(async (response) => {
        if (!response.ok) {
          setAssigneeMessage(
            response.status === 401 || response.status === 403
              ? 'Không có quyền tải danh sách người được giao; có thể nhập mã thủ công.'
              : 'Không thể tải danh sách người được giao.',
          );
          return;
        }
        const body = (await response.json()) as { users?: UserOption[] };
        setUsers(body.users ?? []);
      })
      .catch(() =>
        setAssigneeMessage('Không thể tải danh sách người được giao.'),
      );
  }, [online]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online) {
      setTone('warning');
      setMessage('Đang ngoại tuyến. Kết nối mạng để lập lịch kiểm tra.');
      return;
    }
    setLoading(true);
    setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const selectedEstablishmentId =
      establishmentId ?? String(form.get('establishmentId') ?? '');
    const scheduledAtValue = String(form.get('scheduledAt') ?? '');
    const scheduledAt = new Date(scheduledAtValue);
    if (!selectedEstablishmentId || Number.isNaN(scheduledAt.getTime())) {
      setTone('error');
      setMessage('Cần chọn cơ sở và thời gian hợp lệ.');
      setLoading(false);
      return;
    }
    const payload: Record<string, unknown> = {
      establishmentId: selectedEstablishmentId,
      scheduledAt: scheduledAt.toISOString(),
      cadenceMonths: Number(form.get('cadenceMonths')),
    };
    if (assigneeUserId.trim()) payload.assignedUserId = assigneeUserId.trim();

    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await readResponseError(response, 'INSPECTION_FAILED');
        setTone(
          response.status === 401 || response.status === 403
            ? 'warning'
            : 'error',
        );
        setMessage(
          response.status === 401 || response.status === 403
            ? `Không được phép lập lịch: ${error}`
            : `Không thể lập lịch: ${error}`,
        );
        return;
      }
      setTone('success');
      setMessage('Đã lập lịch kiểm tra.');
      formElement.reset();
      setAssigneeUserId('');
      onScheduled?.();
    } catch {
      setTone('error');
      setMessage('Không thể kết nối để lập lịch kiểm tra.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="civicos-surface space-y-5 rounded-2xl p-5"
    >
      <div>
        <h2 className="text-base font-semibold text-[var(--civicos-text)]">
          Lập lịch kiểm tra
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--civicos-text-muted)]">
          Chọn cơ sở, ngày kiểm tra, chu kỳ và người được giao.
        </p>
      </div>
      {!online ? (
        <FeedbackMessage
          message="Offline: biểu mẫu vẫn có thể xem, nhưng cần mạng để tạo lịch."
          tone="warning"
        />
      ) : null}
      {establishmentId ? (
        <div className="rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 break-words text-sm text-[var(--civicos-text)]">
          Cơ sở:{' '}
          <span className="break-all font-medium text-[var(--civicos-text)]">
            {establishments.find((item) => item.id === establishmentId)?.name ??
              establishmentId}
          </span>
        </div>
      ) : (
        <label className="block text-sm text-[var(--civicos-text)]">
          Cơ sở
          <select
            name="establishmentId"
            required
            defaultValue=""
            className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
          >
            <option value="" disabled>
              Chọn cơ sở
            </option>
            {establishments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.type}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-sm text-[var(--civicos-text)]">
        Thời gian kiểm tra
        <input
          name="scheduledAt"
          required
          type="datetime-local"
          className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
        />
      </label>
      <label className="block text-sm text-[var(--civicos-text)]">
        Chu kỳ
        <select
          name="cadenceMonths"
          defaultValue="6"
          className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
        >
          {[1, 2, 3, 4, 5, 6].map((months) => (
            <option key={months} value={months}>
              Mỗi {months} tháng
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-[var(--civicos-text)]">
        Người được giao{' '}
        <span className="text-[var(--civicos-text-muted)]">(tuỳ chọn)</span>
        {users.length ? (
          <select
            value={assigneeUserId}
            onChange={(event) => setAssigneeUserId(event.target.value)}
            className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
          >
            <option value="">Chưa giao</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ?? user.email} · {user.email}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={assigneeUserId}
            onChange={(event) => setAssigneeUserId(event.target.value)}
            placeholder="Mã user nếu đã biết"
            className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
          />
        )}
      </label>
      {assigneeMessage ? (
        <p className="text-xs text-[var(--civicos-text-muted)]" role="status">
          {assigneeMessage}
        </p>
      ) : null}
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      <button
        type="submit"
        disabled={
          loading || !online || (!establishmentId && !establishments.length)
        }
        className="civicos-control w-full bg-[var(--civicos-accent)] px-4 py-3 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Đang lập lịch…' : 'Tạo lịch kiểm tra'}
      </button>
    </form>
  );
}
