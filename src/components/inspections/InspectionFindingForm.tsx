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
      className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div>
        <h2 className="text-sm font-semibold text-white">Ghi phát hiện</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
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
        <p className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-500">
          Bắt đầu inspection để mở biểu mẫu phát hiện.
        </p>
      ) : null}
      <label
        htmlFor="inspection-finding-checklist"
        className="block text-sm text-slate-200"
      >
        Mục checklist
        <select
          id="inspection-finding-checklist"
          name="checklistKey"
          required
          disabled={!enabled || loading}
          defaultValue=""
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
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
      <label className="block text-sm text-slate-200">
        Mô tả phát hiện
        <textarea
          name="description"
          required
          rows={4}
          disabled={!enabled || loading}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
        />
      </label>
      <label
        htmlFor="inspection-finding-result"
        className="block text-sm text-slate-200"
      >
        Kết quả
        <select
          id="inspection-finding-result"
          name="result"
          required
          disabled={!enabled || loading}
          defaultValue=""
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
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
        <p className="text-xs text-emerald-300" role="status">
          Đã gắn {evidenceIds.length} bằng chứng vào phát hiện mới.
        </p>
      ) : null}
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      <button
        type="submit"
        disabled={!enabled || loading || uploading}
        className="w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Đang lưu…' : 'Lưu phát hiện'}
      </button>
    </form>
  );
}
