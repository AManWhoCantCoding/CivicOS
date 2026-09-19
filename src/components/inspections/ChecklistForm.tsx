'use client';

import { FormEvent, useState } from 'react';

import {
  FeedbackMessage,
  useOnlineStatus,
} from '@/components/field/client-state';
import { submitOfflineCommand } from '@/components/field/offline-queue';

export type ChecklistItem = {
  key: string;
  label: string;
  required: boolean;
};

const defaultChecklistItems: ChecklistItem[] = [
  { key: 'license', label: 'Giấy phép và hồ sơ hợp lệ', required: true },
  { key: 'security', label: 'Điều kiện an ninh, trật tự', required: true },
  { key: 'safety', label: 'Điều kiện an toàn tại cơ sở', required: false },
];

const completionChoices = [
  { value: 'pass', label: 'Đạt' },
  { value: 'reminder', label: 'Nhắc nhở' },
  { value: 'needs_action', label: 'Cần xử lý' },
] as const;

type ChecklistResponse = { key: string; value: string };

function statusLabel(status: string) {
  return (
    {
      scheduled: 'Đã lập lịch',
      in_progress: 'Đang kiểm tra',
      completed: 'Đã hoàn tất',
    }[status] ?? status
  );
}

export function ChecklistForm({
  inspectionId,
  status,
  initialVersion = 0,
  initialResponses = [],
  items = defaultChecklistItems,
  onStateChange,
}: {
  inspectionId: string;
  status: string;
  initialVersion?: number;
  initialResponses?: ChecklistResponse[];
  items?: ChecklistItem[];
  onStateChange?: (state: { version: number; status: string }) => void;
}) {
  const online = useOnlineStatus();
  const [responses, setResponses] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialResponses.map((response) => [response.key, response.value]),
    ),
  );
  const [completionResult, setCompletionResult] = useState('');
  const [loadingCommand, setLoadingCommand] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');

  const editable = status === 'in_progress';

  async function command(
    commandName: string,
    body: Record<string, unknown> = {},
  ) {
    setLoadingCommand(commandName);
    setMessage(null);
    try {
      const item = await submitOfflineCommand({
        id: globalThis.crypto.randomUUID(),
        commandType: `inspection.${commandName}`,
        resourceType: 'Inspection',
        resourceId: inspectionId,
        occurredAt: new Date().toISOString(),
        payloadVersion: 1,
        baseVersion: initialVersion,
        payload: body,
      });
      const result = item.response?.result as
        { version?: number; status?: string } | undefined;
      const accepted = item.status === 'synced' || item.status === 'pending';
      if (accepted) {
        const nextVersion = result?.version ?? initialVersion + 1;
        const nextStatus =
          commandName === 'start'
            ? 'in_progress'
            : commandName === 'complete'
              ? 'completed'
              : (result?.status ?? status);
        onStateChange?.({ version: nextVersion, status: nextStatus });
      }
      setTone(accepted ? 'success' : 'error');
      setMessage(
        item.status === 'synced'
          ? commandName === 'start'
            ? 'Đã bắt đầu inspection.'
            : commandName === 'complete'
              ? 'Đã hoàn tất inspection.'
              : 'Đã lưu checklist.'
          : item.status === 'pending' || item.status === 'syncing'
            ? 'Đã lưu cục bộ, chờ đồng bộ.'
            : (item.error ?? 'Thao tác chưa được chấp nhận.'),
      );
    } catch {
      setTone('error');
      setMessage('Không thể lưu thao tác vào hàng đợi cục bộ.');
    } finally {
      setLoadingCommand(null);
    }
  }

  function saveChecklist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable) {
      setTone('warning');
      setMessage('Checklist chỉ có thể lưu khi inspection đang được kiểm tra.');
      return;
    }
    void command('save_checklist', {
      responses: items.map(({ key }) => ({ key, value: responses[key] ?? '' })),
    });
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Checklist</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Trạng thái checklist đi theo vòng đời của inspection.
          </p>
        </div>
        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
          {statusLabel(status)}
        </span>
      </div>
      {!online ? (
        <div className="mt-4">
          <FeedbackMessage
            message="Offline: bắt đầu, lưu và hoàn tất sẽ chờ đồng bộ."
            tone="warning"
          />
        </div>
      ) : null}
      <form onSubmit={saveChecklist} className="mt-5 space-y-4">
        {items.map(({ key, label, required }) => (
          <label key={key} className="block text-sm text-slate-200">
            {label}
            {required ? <span className="ml-1 text-cyan-300">*</span> : null}
            <textarea
              value={responses[key] ?? ''}
              onChange={(event) =>
                setResponses((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
              disabled={!editable || loadingCommand !== null}
              rows={2}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 disabled:opacity-60"
            />
          </label>
        ))}
        <div className="flex flex-wrap gap-2">
          {status === 'scheduled' ? (
            <button
              type="button"
              onClick={() => void command('start')}
              disabled={loadingCommand !== null}
              className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
            >
              {loadingCommand === 'start'
                ? 'Đang bắt đầu…'
                : 'Bắt đầu kiểm tra'}
            </button>
          ) : null}
          {editable ? (
            <button
              type="submit"
              disabled={loadingCommand !== null}
              className="rounded-lg border border-cyan-300/60 px-3 py-2 text-sm text-cyan-100 hover:border-cyan-200 disabled:opacity-60"
            >
              {loadingCommand === 'save_checklist'
                ? 'Đang lưu…'
                : 'Lưu checklist'}
            </button>
          ) : null}
          {editable ? (
            <label className="flex min-w-56 flex-1 items-center gap-2 text-sm text-slate-300 sm:flex-none">
              <span className="sr-only">Kết quả hoàn tất inspection</span>
              <select
                value={completionResult}
                onChange={(event) => setCompletionResult(event.target.value)}
                disabled={loadingCommand !== null}
                required
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
              >
                <option value="" disabled>
                  Chọn kết quả hoàn tất
                </option>
                {completionChoices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!completionResult || loadingCommand !== null}
                onClick={() =>
                  void command('complete', { result: completionResult })
                }
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-cyan-300 disabled:opacity-50"
              >
                Hoàn tất
              </button>
            </label>
          ) : null}
        </div>
      </form>
      {status === 'completed' ? (
        <p className="mt-4 text-sm text-slate-500">
          Inspection đã hoàn tất; checklist chỉ đọc.
        </p>
      ) : null}
      {message ? (
        <div className="mt-4">
          <FeedbackMessage message={message} tone={tone} />
        </div>
      ) : null}
    </section>
  );
}
