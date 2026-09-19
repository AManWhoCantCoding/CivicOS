'use client';

import { useState } from 'react';

import { submitOfflineCommand } from '@/components/field/offline-queue';

export function ChecklistForm({ inspectionId }: { inspectionId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [responses, setResponses] = useState({
    license: '',
    security: '',
    safety: '',
  });
  const checklistItems: Array<{
    key: keyof typeof responses;
    label: string;
    required: boolean;
  }> = [
    { key: 'license', label: 'Giấy phép và hồ sơ hợp lệ', required: true },
    { key: 'security', label: 'Điều kiện an ninh, trật tự', required: true },
    { key: 'safety', label: 'Điều kiện an toàn tại cơ sở', required: false },
  ];
  async function command(command: string, body: Record<string, unknown> = {}) {
    const item = await submitOfflineCommand({
      id: globalThis.crypto.randomUUID(),
      commandType: `inspection.${command}`,
      resourceType: 'Inspection',
      resourceId: inspectionId,
      occurredAt: new Date().toISOString(),
      payloadVersion: 1,
      payload: body,
    });
    setMessage(
      item.status === 'synced'
        ? 'Đã lưu trạng thái.'
        : item.status === 'pending' || item.status === 'syncing'
          ? 'Đã lưu cục bộ, chờ đồng bộ.'
          : (item.error ?? 'Thao tác chưa được chấp nhận.'),
    );
  }
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-semibold text-white">Checklist</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Mỗi phát hiện phải gắn với một mục checklist và Evidence khi quy định
        yêu cầu.
      </p>
      <div className="mt-5 space-y-3">
        {checklistItems.map(({ key, label, required }) => (
          <label key={key} className="block text-sm text-slate-200">
            {label}
            {required ? <span className="ml-1 text-cyan-300">*</span> : null}
            <input
              value={responses[key as keyof typeof responses]}
              onChange={(event) =>
                setResponses((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            />
          </label>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => command('start')}
          className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
        >
          Bắt đầu
        </button>
        <button
          onClick={() =>
            command('save_checklist', {
              responses: Object.entries(responses).map(([key, value]) => ({
                key,
                value,
              })),
            })
          }
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-cyan-300"
        >
          Lưu checklist
        </button>
        <button
          onClick={() =>
            command('finding', {
              checklistKey: 'license',
              description: 'Đã kiểm tra hồ sơ.',
              result: 'pass',
            })
          }
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-cyan-300"
        >
          Ghi phát hiện
        </button>
        <button
          onClick={() => command('complete', { result: 'pass' })}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-cyan-300"
        >
          Hoàn tất đạt
        </button>
      </div>
      {message ? (
        <p className="mt-4 text-xs text-slate-400">{message}</p>
      ) : null}
    </section>
  );
}
