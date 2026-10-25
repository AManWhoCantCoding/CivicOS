'use client';

import { useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

import { describeVehicleCommandError } from './vehicle-status-text';

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
        setMessage(describeVehicleCommandError(error, response.status));
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
    <section className="civicos-surface space-y-5 rounded-xl p-5">
      <div>
        <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
          Chuyển OrganizationUnit
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--civicos-text-muted)]">
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
        <p className="rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm leading-6 text-[var(--civicos-text-muted)]">
          {status === 'match_suggested'
            ? 'Xác nhận match trước khi chuyển đơn vị.'
            : 'Quan sát đã được chuyển đơn vị.'}
        </p>
      ) : null}
      <label
        htmlFor="vehicle-escalation-organization"
        className="block text-sm text-[var(--civicos-text)]"
      >
        OrganizationUnit đích
        {units.length ? (
          <select
            id="vehicle-escalation-organization"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            disabled={!enabled || loading}
            className="civicos-control mt-2 w-full border border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)] disabled:opacity-60"
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
            id="vehicle-escalation-organization"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            disabled={!enabled || loading}
            placeholder="Mã OrganizationUnit"
            className="civicos-control mt-2 w-full border border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)] disabled:opacity-60"
          />
        )}
      </label>
      {unitMessage ? (
        <p className="text-xs leading-5 text-[var(--civicos-text-muted)]" role="status">
          {unitMessage}
        </p>
      ) : null}
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!enabled || loading || !online}
        className="min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-4 py-3 text-sm font-semibold text-[var(--civicos-accent)] hover:border-[var(--civicos-accent)] hover:bg-[var(--civicos-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Đang chuyển…' : 'Chuyển đơn vị'}
      </button>
    </section>
  );
}
