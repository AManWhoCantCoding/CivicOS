'use client';

import { useState } from 'react';

export function ActivityForm({
  subjectId,
  recordId,
}: {
  subjectId: string;
  recordId: string;
}) {
  const [content, setContent] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!content.trim()) {
      setError('Nội dung theo dõi là bắt buộc.');
      return;
    }
    setSaving(true);
    setError(null);
    setDenied(false);
    try {
      const response = await fetch(
        `/api/residents/${subjectId}/management-records/${recordId}/activities`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            activityType: 'checkup',
            occurredAt: new Date().toISOString(),
            content: content.trim(),
            evaluation: evaluation.trim() || undefined,
            idempotencyKey:
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `${Date.now()}`,
          }),
        },
      );
      if (response.status === 403) setDenied(true);
      if (!response.ok) throw new Error('ACTIVITY_FAILED');
      setSaved(true);
      setContent('');
      setEvaluation('');
    } catch {
      setError('Không ghi nhận được hoạt động. Thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-4 rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5"
    >
      <div>
        <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
          Ghi nhận hoạt động theo dõi
        </h2>
        <p className="mt-2 text-xs leading-5 text-[var(--civicos-text-muted)]">
          Ghi chú được gắn vào hoạt động checkup của lượt theo dõi hiện tại.
        </p>
      </div>
      <label className="block text-sm text-[var(--civicos-text)]">
        Nội dung theo dõi
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
          rows={4}
          placeholder="Nội dung buổi gặp / đánh giá"
          className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2 text-sm text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)]"
        />
      </label>
      <label className="block text-sm text-[var(--civicos-text)]">
        Đánh giá
        <input
          value={evaluation}
          onChange={(event) => setEvaluation(event.target.value)}
          className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2 text-sm text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)]"
        />
      </label>
      {denied ? (
        <p
          role="alert"
          className="rounded-lg border border-[var(--civicos-border)] p-3 text-sm font-medium text-[var(--civicos-danger)]"
          style={{
            borderLeftWidth: '3px',
            borderLeftColor: 'var(--civicos-danger)',
          }}
        >
          <span aria-hidden="true">⚠ </span>
          Tài khoản không thuộc phân công của hồ sơ này.
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-[var(--civicos-border)] p-3 text-sm font-medium text-[var(--civicos-danger)]"
          style={{
            borderLeftWidth: '3px',
            borderLeftColor: 'var(--civicos-danger)',
          }}
        >
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      ) : null}
      {saved ? (
        <p
          role="status"
          className="rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] p-3 text-sm font-medium text-[var(--civicos-success)]"
          aria-live="polite"
          style={{
            borderLeftWidth: '3px',
            borderLeftColor: 'var(--civicos-success)',
          }}
        >
          <span aria-hidden="true">● </span>Đã ghi nhận hoạt động theo dõi.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="min-h-[44px] rounded-lg bg-[var(--civicos-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-accent-contrast)] motion-safe:transition-colors hover:bg-[var(--civicos-accent-hover)] disabled:opacity-50"
      >
        {saving ? 'Đang lưu…' : 'Ghi nhận'}
      </button>
    </form>
  );
}
