'use client';

import { useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

type OrganizationUnit = { id: string; name: string; level: string };

export function VehicleEscalationForm({
  observationId,
  status,
  onSaved,
}: {
  observationId: string;
  status: string;
  onSaved?: (observation: Record<string, unknown>) => void;
}) {
  const online = useOnlineStatus();
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [unitMessage, setUnitMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');
  const enabled = status !== 'match_suggested' && status !== 'escalated';

  useEffect(() => {
    if (!online) return;
    fetch('/api/identity/organization-units')
      .then(async (response) => {
        if (!response.ok) {
          setUnitMessage(
            response.status === 401 || response.status === 403
              ? 'Không có quyền tải OrganizationUnit; nhập mã đích thủ công.'
              : 'Không thể tải danh sách OrganizationUnit; nhập mã đích thủ công.',
          );
          return;
        }
        const body = (await response.json()) as {
          organizationUnits?: OrganizationUnit[];
        };
        setUnits(body.organizationUnits ?? []);
      })
      .catch(() =>
        setUnitMessage(
          'Không thể tải danh sách OrganizationUnit; nhập mã đích thủ công.',
        ),
      );
  }, [online]);

  async function submit() {
    if (!enabled) {
      setTone('warning');
      setMessage(
        status === 'match_suggested'
          ? 'Cần xác nhận match trước khi chuyển đơn vị.'
          : 'Quan sát đã được chuyển đơn vị.',
      );
      return;
    }
    if (!organizationId.trim()) {
      setTone('error');
      setMessage('Chọn hoặc nhập OrganizationUnit đích.');
      return;
    }
    if (!online) {
      setTone('warning');
      setMessage('Đang ngoại tuyến. Kết nối mạng để chuyển đơn vị.');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/vehicles/observations/${observationId}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            command: 'escalate',
            organizationId: organizationId.trim(),
          }),
        },
      );
      if (!response.ok) {
        const error = await readResponseError(response, 'ESCALATION_FAILED');
        setTone(
          response.status === 401 || response.status === 403
            ? 'warning'
            : 'error',
        );
        setMessage(
          response.status === 401 || response.status === 403
            ? `Không được phép chuyển đơn vị: ${error}`
            : `Không thể chuyển đơn vị: ${error}`,
        );
        return;
      }
      const body = (await response.json()) as {
        observation?: Record<string, unknown>;
      };
      if (!body.observation) {
        setTone('error');
        setMessage('Máy chủ không trả về quan sát đã cập nhật.');
        return;
      }
      setTone('success');
      setMessage('Đã chuyển quan sát tới OrganizationUnit.');
      onSaved?.(body.observation);
    } catch {
      setTone('error');
      setMessage('Không thể kết nối để chuyển đơn vị.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div>
        <h2 className="text-sm font-semibold text-white">
          Chuyển OrganizationUnit
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Chọn đơn vị đích để escalation. Mã được gửi nguyên trạng tới API.
        </p>
      </div>
      {!online ? (
        <FeedbackMessage
          message="Offline: escalation chưa được gửi."
          tone="warning"
        />
      ) : null}
      {!enabled ? (
        <p className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-500">
          {status === 'match_suggested'
            ? 'Xác nhận match trước khi chuyển đơn vị.'
            : 'Quan sát đã được chuyển đơn vị.'}
        </p>
      ) : null}
      <label className="block text-sm text-slate-200">
        OrganizationUnit đích
        {units.length ? (
          <select
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            disabled={!enabled || loading}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
          >
            <option value="" disabled>
              Chọn đơn vị
            </option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} · {unit.level}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            disabled={!enabled || loading}
            placeholder="Mã OrganizationUnit"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
          />
        )}
      </label>
      {unitMessage ? (
        <p className="text-xs text-slate-500" role="status">
          {unitMessage}
        </p>
      ) : null}
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!enabled || loading || !online}
        className="w-full rounded-lg border border-amber-300/60 px-4 py-3 text-sm font-semibold text-amber-100 hover:border-amber-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Đang chuyển…' : 'Chuyển đơn vị'}
      </button>
    </section>
  );
}
