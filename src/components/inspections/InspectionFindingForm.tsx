'use client';

import { FormEvent, useState } from 'react';

import { EvidenceCapture } from '@/components/field/EvidenceCapture';
import {
  FeedbackMessage,
  useOnlineStatus,
} from '@/components/field/client-state';
import { submitOfflineCommand } from '@/components/field/offline-queue';

import type { ChecklistItem } from './ChecklistForm';

const resultChoices = [
  { value: 'pass', label: 'Đạt' },
  { value: 'reminder', label: 'Nhắc nhở' },
  { value: 'needs_action', label: 'Cần xử lý' },
] as const;

export function InspectionFindingForm({
  inspectionId,
  initialVersion,
  status,
  items,
  onSaved,
  onVersionChange,
}: {
  inspectionId: string;
  initialVersion: number;
  status: string;
  items: ChecklistItem[];
  onSaved?: () => void;
  onVersionChange?: (version: number) => void;
}) {
  const online = useOnlineStatus();
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [evidenceCaptureKey, setEvidenceCaptureKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');
  const enabled = status === 'in_progress';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) {
      setTone('warning');
      setMessage('Chỉ có thể ghi phát hiện khi inspection đang được kiểm tra.');
      return;
    }
    setLoading(true);
    setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const item = await submitOfflineCommand({
        id: globalThis.crypto.randomUUID(),
        commandType: 'inspection.finding',
        resourceType: 'Inspection',
        resourceId: inspectionId,
        occurredAt: new Date().toISOString(),
        payloadVersion: 1,
        baseVersion: initialVersion,
        payload: {
          checklistKey: String(form.get('checklistKey') ?? ''),
          description: String(form.get('description') ?? ''),
          result: String(form.get('result') ?? ''),
          severity: String(form.get('severity') ?? ''),
          category: String(form.get('category') ?? ''),
          evidenceIds,
        },
      });
      const accepted = item.status === 'synced' || item.status === 'pending';
      if (accepted) {
        onVersionChange?.(initialVersion + 1);
        onSaved?.();
        formElement.reset();
        setEvidenceIds([]);
        setEvidenceCaptureKey((value) => value + 1);
      }
      setTone(accepted ? 'success' : 'error');
      setMessage(
        item.status === 'synced'
          ? 'Đã ghi phát hiện.'
          : item.status === 'pending' || item.status === 'syncing'
            ? 'Đã lưu phát hiện cục bộ, chờ đồng bộ.'
            : (item.error ?? 'Phát hiện chưa được chấp nhận.'),
      );
    } catch {
      setTone('error');
      setMessage('Không thể lưu phát hiện vào hàng đợi cục bộ.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="civicos-surface space-y-5 rounded-xl p-5"
    >
      <div>
        <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
          Ghi phát hiện
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--civicos-text-muted)]">
          Mỗi phát hiện phải gắn với một mục checklist và kết quả kiểm tra.
        </p>
      </div>
      {!online ? (
        <FeedbackMessage
          message="Offline: phát hiện sẽ được giữ trong hàng đợi trên thiết bị."
          tone="warning"
        />
      ) : null}
      {!enabled ? (
        <p className="civicos-feedback rounded-lg px-3 py-2 text-sm text-[var(--civicos-text-muted)]">
          Bắt đầu inspection để mở biểu mẫu phát hiện.
        </p>
      ) : null}
      <label
        htmlFor="inspection-finding-checklist"
        className="block text-sm text-[var(--civicos-text)]"
      >
        Mục checklist
        <select
          id="inspection-finding-checklist"
          name="checklistKey"
          required
          disabled={!enabled || loading}
          defaultValue=""
          className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] disabled:opacity-60"
        >
          <option value="" disabled>
            Chọn mục checklist
          </option>
          {items.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label} ({item.key})
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-[var(--civicos-text)]">
          Mức độ
          <select
            name="severity"
            disabled={!enabled || loading}
            defaultValue="medium"
            className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] disabled:opacity-60"
          >
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
          </select>
        </label>
        <label className="block text-sm text-[var(--civicos-text)]">
          Nhóm vi phạm
          <input
            name="category"
            disabled={!enabled || loading}
            className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] disabled:opacity-60"
          />
        </label>
      </div>
      <label className="block text-sm text-[var(--civicos-text)]">
        Mô tả phát hiện
        <textarea
          name="description"
          required
          rows={4}
          disabled={!enabled || loading}
          className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] disabled:opacity-60"
        />
      </label>
      <label
        htmlFor="inspection-finding-result"
        className="block text-sm text-[var(--civicos-text)]"
      >
        Kết quả
        <select
          id="inspection-finding-result"
          name="result"
          required
          disabled={!enabled || loading}
          defaultValue=""
          className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] disabled:opacity-60"
        >
          <option value="" disabled>
            Chọn kết quả
          </option>
          {resultChoices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>
      <EvidenceCapture
        key={evidenceCaptureKey}
        resourceType="Inspection"
        resourceId={inspectionId}
        disabled={!enabled || loading}
        onUploadStateChange={setUploading}
        onUploaded={(evidence) =>
          setEvidenceIds((current) =>
            current.includes(evidence.id) ? current : [...current, evidence.id],
          )
        }
      />
      {evidenceIds.length ? (
        <p className="text-xs text-[var(--civicos-success)]" role="status">
          Đã gắn {evidenceIds.length} bằng chứng vào phát hiện mới.
        </p>
      ) : null}
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      <button
        type="submit"
        disabled={!enabled || loading || uploading}
        className="civicos-control w-full bg-[var(--civicos-accent)] px-4 py-3 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Đang lưu…' : 'Lưu phát hiện'}
      </button>
    </form>
  );
}
