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
    >
      <label>
        Nội dung theo dõi
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
        />
      </label>
      <label>
        Đánh giá
        <input
          value={evaluation}
          onChange={(event) => setEvaluation(event.target.value)}
        />
      </label>
      {denied ? (
        <p role="alert">Tài khoản không thuộc phân công của hồ sơ này.</p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {saved ? <p role="status">Đã ghi nhận hoạt động theo dõi.</p> : null}
      <button type="submit" disabled={saving}>
        {saving ? 'Đang lưu…' : 'Ghi nhận'}
      </button>
    </form>
  );
}
