'use client';

import { useState } from 'react';

export function IncidentAssignmentPanel({
  incidentId,
}: {
  incidentId: string;
}) {
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  async function assign() {
    const response = await fetch(`/api/incidents/${incidentId}/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        command: 'assign',
        assigneeUserIds: [assigneeUserId],
      }),
    });
    setMessage(response.ok ? 'Đã gửi phân công.' : 'Không thể phân công.');
  }
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-semibold text-white">Phân công</h2>
      <label className="mt-5 block text-sm text-slate-300">
        ID cán bộ
        <input
          value={assigneeUserId}
          onChange={(event) => setAssigneeUserId(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-300"
          placeholder="User ID"
        />
      </label>
      <button
        onClick={assign}
        disabled={!assigneeUserId}
        className="mt-4 w-full rounded-lg border border-slate-600 px-3 py-2.5 text-sm font-semibold text-slate-100 hover:border-cyan-300 disabled:opacity-50"
      >
        Gửi phân công
      </button>
      {message ? (
        <p className="mt-3 text-xs text-slate-400">{message}</p>
      ) : null}
    </section>
  );
}
