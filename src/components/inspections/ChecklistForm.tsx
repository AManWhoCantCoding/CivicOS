'use client';

import { FormEvent, useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';
import { submitOfflineCommand } from '@/components/field/offline-queue';
import { SECURITY_CHECKLIST_CAVEAT } from '@/modules/inspections/checklist-catalog';

export type ChecklistItem = {
  key: string;
  label: string;
  required: boolean;
  evidenceRequired?: boolean;
  source?: string;
  sourceUrl?: string;
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
  const [dirty, setDirty] = useState(false);

  const editable = status === 'in_progress';

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function command(
    commandName: string,
    body: Record<string, unknown> = {},
  ) {
    setLoadingCommand(commandName);
    setMessage(null);
    try {
      if (commandName === 'complete') {
        if (!online) {
          setTone('warning');
          setMessage('Đang ngoại tuyến. Kết nối mạng để hoàn tất inspection.');
          return;
        }
        const response = await fetch(
          `/api/inspections/${inspectionId}/commands`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ command: 'complete', result: body.result }),
          },
        );
        if (!response.ok) {
          setTone('error');
          setMessage(
            await readResponseError(response, 'Không thể hoàn tất inspection.'),
          );
          return;
        }
        const result = (await response.json()) as {
          inspection?: { version?: number; status?: string };
        };
        if (
          result.inspection?.version === undefined ||
          !result.inspection.status
        ) {
          setTone('error');
          setMessage('Máy chủ không trả về inspection đã cập nhật.');
          return;
        }
        onStateChange?.({
          version: result.inspection.version,
          status: result.inspection.status,
        });
        setTone('success');
        setMessage('Đã hoàn tất inspection.');
        return;
      }
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
          commandName === 'start' ? 'in_progress' : (result?.status ?? status);
        onStateChange?.({ version: nextVersion, status: nextStatus });
      }
      setTone(accepted ? 'success' : 'error');
      setMessage(
        item.status === 'synced'
          ? commandName === 'start'
            ? 'Đã bắt đầu inspection.'
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
    const missing = items.find(
      ({ key, required }) => required && !responses[key]?.trim(),
    );
    if (missing) {
      setTone('error');
      setMessage(`Điền mục bắt buộc trước khi lưu: ${missing.label}.`);
      return;
    }
    void command('save_checklist', {
      responses: items.map(({ key }) => ({ key, value: responses[key] ?? '' })),
    });
    setDirty(false);
  }

  return (
    <section className="civicos-surface rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
            Checklist
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--civicos-text-muted)]">
            Trạng thái checklist đi theo vòng đời của inspection.
          </p>
        </div>
        <span className="rounded-full bg-[var(--civicos-surface-raised)] px-3 py-1 text-xs text-[var(--civicos-accent)]">
          {statusLabel(status)}
        </span>
      </div>
      <p className="mt-3 rounded-lg bg-[var(--civicos-surface-raised)] px-3 py-2 text-xs leading-5 text-[var(--civicos-text-muted)]">
        Mẫu checklist nội bộ/dùng thử; không phải checklist pháp lý chính thức
        và không chứng minh việc tuân thủ pháp luật.
      </p>
      {items.some(({ key }) => key.startsWith('security-')) ? (
        <p className="mt-3 rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-xs leading-5 text-[var(--civicos-text-muted)]">
          {SECURITY_CHECKLIST_CAVEAT}
        </p>
      ) : null}
      {!online ? (
        <div className="mt-4">
          <FeedbackMessage
            message="Offline: bắt đầu và lưu checklist có thể chờ đồng bộ; cần kết nối mạng để hoàn tất inspection."
            tone="warning"
          />
        </div>
      ) : null}
      <form onSubmit={saveChecklist} className="mt-5 space-y-4">
        {items.map(
          ({ key, label, required, evidenceRequired, source, sourceUrl }) => (
            <label
              key={key}
              className="block text-sm text-[var(--civicos-text)]"
            >
              {label}
              {required ? (
                <span className="ml-1 text-[var(--civicos-accent)]">*</span>
              ) : null}
              {evidenceRequired ? (
                <span className="ml-2 text-xs text-[var(--civicos-warning)]">
                  cần Evidence
                </span>
              ) : null}
              {source ? (
                <span className="mt-1 block text-xs text-[var(--civicos-text-muted)]">
                  Nguồn dự thảo: {source}{' '}
                  {sourceUrl ? (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Công báo chính thức
                    </a>
                  ) : null}
                </span>
              ) : null}
              <textarea
                value={responses[key] ?? ''}
                onChange={(event) => {
                  setResponses((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }));
                  setDirty(true);
                }}
                disabled={!editable || loadingCommand !== null}
                rows={2}
                className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] disabled:opacity-60"
              />
            </label>
          ),
        )}
        <p className="text-xs text-[var(--civicos-text-muted)]" role="status">
          Tiến độ: {items.filter(({ key }) => responses[key]?.trim()).length}/
          {items.length} mục đã trả lời
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {status === 'scheduled' ? (
            <button
              type="button"
              onClick={() => void command('start')}
              disabled={loadingCommand !== null}
              className="civicos-control min-h-[44px] bg-[var(--civicos-accent)] px-3 py-2 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:opacity-90 disabled:opacity-60 motion-reduce:transition-none"
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
              className="civicos-control min-h-[44px] border border-[var(--civicos-accent)] px-3 py-2 text-sm text-[var(--civicos-accent)] hover:opacity-80 disabled:opacity-60 motion-reduce:transition-none"
            >
              {loadingCommand === 'save_checklist'
                ? 'Đang lưu…'
                : 'Lưu checklist'}
            </button>
          ) : null}
        </div>
      </form>
      {editable ? (
        <div className="mt-4 flex min-w-56 flex-1 items-center gap-2 text-sm text-[var(--civicos-text-muted)] sm:flex-none">
          <label
            htmlFor="inspection-complete-result"
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <span className="sr-only">Kết quả hoàn tất inspection</span>
            <select
              id="inspection-complete-result"
              value={completionResult}
              onChange={(event) => setCompletionResult(event.target.value)}
              disabled={loadingCommand !== null}
              required
              className="civicos-control min-w-0 flex-1 border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] disabled:opacity-60"
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
          </label>
          <button
            type="button"
            disabled={!online || !completionResult || loadingCommand !== null}
            onClick={() =>
              void command('complete', { result: completionResult })
            }
            className="civicos-control min-h-[44px] border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] disabled:opacity-50 motion-reduce:transition-none"
          >
            Hoàn tất
          </button>
        </div>
      ) : null}
      {status === 'completed' ? (
        <p className="mt-4 text-sm text-[var(--civicos-text-muted)]">
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
