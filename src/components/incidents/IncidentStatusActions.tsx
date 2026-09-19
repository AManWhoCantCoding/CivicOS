'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { OrganizationUnitPicker } from '@/components/identity/OrganizationUnitPicker';

type Approval = {
  id: string;
  action: string;
  requestedAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function findApproval(value: unknown): { id: string } | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.approval) && typeof value.approval.id === 'string') {
    return { id: value.approval.id };
  }
  if (isRecord(value.incident)) return findApproval(value.incident);
  if (isRecord(value.result)) return findApproval(value.result);
  return null;
}

function approvalLabel(action: string) {
  const labels: Record<string, string> = {
    transfer: 'Chuyển cấp trên',
    resolve: 'Đề xuất kết quả',
    close: 'Đóng Incident',
  };
  return labels[action] ?? action;
}

function commandError(code: string) {
  const messages: Record<string, string> = {
    APPROVAL_ALREADY_DECIDED: 'Approval này đã được xử lý.',
    APPROVAL_NOT_FOUND: 'Không tìm thấy Approval đang chờ.',
    CLASSIFICATION_FIELDS_REQUIRED: 'Cần chọn category và severity.',
    FORBIDDEN: 'Tài khoản hiện tại không có quyền thực hiện thao tác này.',
    INVALID_INCIDENT_TRANSITION: 'Incident không ở trạng thái phù hợp.',
    ORGANIZATION_REQUIRED: 'Cần chọn OrganizationUnit nhận.',
    REJECTION_REASON_REQUIRED: 'Cần nhập lý do từ chối Approval.',
    RESOLUTION_REQUIRED: 'Cần nhập nội dung kết quả xử lý.',
  };
  return messages[code] ?? 'Thao tác chưa hoàn tất. Vui lòng thử lại.';
}

export function IncidentStatusActions({
  incidentId,
  status,
  pendingApprovals = [],
  onChanged,
}: {
  incidentId: string;
  status: string;
  pendingApprovals?: Approval[];
  onChanged?: () => Promise<void> | void;
}) {
  const [category, setCategory] = useState('other');
  const [severity, setSeverity] = useState('medium');
  const [verificationNote, setVerificationNote] = useState('');
  const [transferOrganizationId, setTransferOrganizationId] =
    useState('unit-cap-tren');
  const [resolution, setResolution] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [approvalId, setApprovalId] = useState<string | null>(
    pendingApprovals[0]?.id ?? null,
  );
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  async function send(command: string, extra: Record<string, string> = {}) {
    setPendingCommand(command);
    setMessage(null);
    setError(null);
    setDenied(false);
    try {
      const response = await fetch(`/api/incidents/${incidentId}/commands`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command, ...extra }),
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        if (response.status === 403) setDenied(true);
        throw new Error(
          isRecord(body) && typeof body.error === 'string'
            ? body.error
            : 'COMMAND_FAILED',
        );
      }
      if (!isRecord(body) || (!('incident' in body) && !('result' in body))) {
        throw new Error('INVALID_API_RESPONSE');
      }
      const requestedApproval = findApproval(body);
      if (requestedApproval) setApprovalId(requestedApproval.id);
      setMessage(
        requestedApproval
          ? 'Đã gửi yêu cầu Approval.'
          : 'Đã ghi nhận thao tác.',
      );
      await onChanged?.();
    } catch (reason: unknown) {
      const code = reason instanceof Error ? reason.message : 'COMMAND_FAILED';
      setError(commandError(code));
    } finally {
      setPendingCommand(null);
    }
  }

  async function classify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await send('classify', { category, severity });
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verificationNote.trim()) {
      setError('Cần nhập ghi chú xác minh.');
      return;
    }
    await send('verify', { note: verificationNote.trim() });
  }

  async function transfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!transferOrganizationId) {
      setError('Cần chọn OrganizationUnit nhận.');
      return;
    }
    await send('transfer', { organizationId: transferOrganizationId });
  }

  async function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resolution.trim()) {
      setError('Cần nhập nội dung kết quả xử lý.');
      return;
    }
    await send('resolve', { resolution: resolution.trim() });
  }

  async function decide(
    event: FormEvent<HTMLFormElement>,
    command: 'approve' | 'reject',
  ) {
    event.preventDefault();
    const selectedApprovalId = pendingApprovals.some(
      (approval) => approval.id === approvalId,
    )
      ? approvalId
      : (pendingApprovals[0]?.id ?? null);
    if (!selectedApprovalId) {
      setError('Chưa có Approval đang chờ.');
      return;
    }
    if (command === 'reject' && !approvalReason.trim()) {
      setError('Cần nhập lý do từ chối Approval.');
      return;
    }
    await send(command, {
      approvalId: selectedApprovalId,
      ...(command === 'reject' ? { reason: approvalReason.trim() } : {}),
    });
  }

  const hasActions =
    status === 'received' ||
    status === 'classified' ||
    status === 'verifying' ||
    status === 'transferred' ||
    status === 'resolved' ||
    pendingApprovals.length > 0;

  if (!hasActions && !message && !error) return null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-semibold text-white">Thao tác Incident</h2>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Mỗi lệnh được kiểm tra lại ở API theo role, Assignment và trạng thái hồ
        sơ.
      </p>
      <div className="mt-5 space-y-5">
        {status === 'received' ? (
          <form
            onSubmit={(event) => void classify(event)}
            className="space-y-4 border-t border-slate-800 pt-5"
          >
            <h3 className="text-sm font-medium text-slate-200">Phân loại</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Category
                <select
                  name="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                >
                  <option value="other">Khác</option>
                  <option value="public_order">Trật tự công cộng</option>
                  <option value="residential">Cư trú</option>
                  <option value="property">Tài sản</option>
                  <option value="violence">Bạo lực</option>
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                Severity
                <select
                  name="severity"
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                >
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                  <option value="critical">Nghiêm trọng</option>
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={pendingCommand !== null}
              className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
            >
              {pendingCommand === 'classify' ? 'Đang lưu…' : 'Lưu phân loại'}
            </button>
          </form>
        ) : null}

        {status === 'classified' ? (
          <form
            onSubmit={(event) => void verify(event)}
            className="space-y-4 border-t border-slate-800 pt-5"
          >
            <h3 className="text-sm font-medium text-slate-200">
              Bắt đầu xác minh
            </h3>
            <label className="block text-sm text-slate-300">
              Ghi chú xác minh
              <textarea
                name="note"
                value={verificationNote}
                onChange={(event) => setVerificationNote(event.target.value)}
                required
                rows={4}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              />
            </label>
            <button
              type="submit"
              disabled={pendingCommand !== null}
              className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
            >
              {pendingCommand === 'verify'
                ? 'Đang bắt đầu…'
                : 'Bắt đầu xác minh'}
            </button>
          </form>
        ) : null}

        {status === 'verifying' || status === 'transferred' ? (
          <div className="space-y-5 border-t border-slate-800 pt-5">
            <form
              onSubmit={(event) => void resolve(event)}
              className="space-y-4"
            >
              <h3 className="text-sm font-medium text-slate-200">
                Đề xuất kết quả
              </h3>
              <label className="block text-sm text-slate-300">
                Nội dung kết quả xử lý
                <textarea
                  name="resolution"
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  required
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                />
              </label>
              <button
                type="submit"
                disabled={pendingCommand !== null}
                className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
              >
                {pendingCommand === 'resolve'
                  ? 'Đang gửi…'
                  : 'Gửi đề xuất kết quả'}
              </button>
            </form>
            {status === 'verifying' ? (
              <form
                onSubmit={(event) => void transfer(event)}
                className="space-y-4 border-t border-slate-800 pt-5"
              >
                <h3 className="text-sm font-medium text-slate-200">
                  Xin chuyển cấp trên
                </h3>
                <OrganizationUnitPicker
                  value={transferOrganizationId}
                  onChange={setTransferOrganizationId}
                  label="Đơn vị nhận / OrganizationUnit"
                />
                <button
                  type="submit"
                  disabled={pendingCommand !== null}
                  className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:border-cyan-300 disabled:opacity-50"
                >
                  {pendingCommand === 'transfer'
                    ? 'Đang gửi…'
                    : 'Gửi yêu cầu chuyển'}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}

        {status === 'resolved' ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send('close');
            }}
            className="border-t border-slate-800 pt-5"
          >
            <button
              type="submit"
              disabled={pendingCommand !== null}
              className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
            >
              {pendingCommand === 'close'
                ? 'Đang gửi…'
                : 'Gửi yêu cầu đóng Incident'}
            </button>
          </form>
        ) : null}

        {pendingApprovals.length ? (
          <div className="space-y-4 border-t border-slate-800 pt-5">
            <div>
              <h3 className="text-sm font-medium text-slate-200">
                Approval đang chờ
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Chỉ Commander cùng OrganizationUnit mới quyết định được
                Approval.
              </p>
            </div>
            {pendingApprovals.length > 1 ? (
              <label className="block text-sm text-slate-300">
                Approval cần xử lý
                <select
                  value={
                    pendingApprovals.some(
                      (approval) => approval.id === approvalId,
                    )
                      ? (approvalId ?? '')
                      : (pendingApprovals[0]?.id ?? '')
                  }
                  onChange={(event) =>
                    setApprovalId(event.target.value || null)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                >
                  {pendingApprovals.map((approval) => (
                    <option key={approval.id} value={approval.id}>
                      {approvalLabel(approval.action)} ·{' '}
                      {approval.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-sm text-slate-300">
                {approvalLabel(pendingApprovals[0].action)}
              </p>
            )}
            <label className="block text-sm text-slate-300">
              Lý do Approval
              <textarea
                name="reason"
                value={approvalReason}
                onChange={(event) => setApprovalReason(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                aria-describedby="approval-reason-help"
              />
            </label>
            <p
              id="approval-reason-help"
              className="-mt-2 text-xs text-slate-500"
            >
              Bắt buộc khi từ chối; có thể ghi chú lý do quyết định khi phê
              duyệt.
            </p>
            <div className="flex flex-wrap gap-2">
              <form onSubmit={(event) => void decide(event, 'approve')}>
                <button
                  type="submit"
                  disabled={
                    pendingCommand !== null ||
                    (!pendingApprovals.some(
                      (approval) => approval.id === approvalId,
                    ) &&
                      !pendingApprovals[0])
                  }
                  className="rounded-lg bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-200 disabled:opacity-50"
                >
                  {pendingCommand === 'approve'
                    ? 'Đang phê duyệt…'
                    : 'Phê duyệt'}
                </button>
              </form>
              <form onSubmit={(event) => void decide(event, 'reject')}>
                <button
                  type="submit"
                  disabled={
                    pendingCommand !== null ||
                    (!pendingApprovals.some(
                      (approval) => approval.id === approvalId,
                    ) &&
                      !pendingApprovals[0])
                  }
                  className="rounded-lg border border-rose-400/60 px-4 py-2.5 text-sm text-rose-200 hover:border-rose-300 disabled:opacity-50"
                >
                  {pendingCommand === 'reject' ? 'Đang từ chối…' : 'Từ chối'}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
      {denied ? (
        <div className="mt-5">
          <AccessDenied />
        </div>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="mt-4 text-sm text-emerald-300"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
