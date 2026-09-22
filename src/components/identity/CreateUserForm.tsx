'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLE_OPTIONS = [
  'commander',
  'duty_officer',
  'field_officer',
  'office_officer',
  'village_officer',
  'superior_officer',
  'superior_commander',
  'system_operator',
] as const;

export function CreateUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('field_officer');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/identity/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, name, role, password }),
      });
      const result = (await response.json().catch(() => null)) as unknown;
      if (!response.ok || !result || typeof result !== 'object') {
        const code =
          result && typeof result === 'object' && 'error' in result
            ? String(result.error)
            : 'USER_CREATE_FAILED';
        setError(
          code === 'FORBIDDEN'
            ? 'Tài khoản hiện tại không được tạo User.'
            : 'Không thể tạo User. Kiểm tra dữ liệu và thử lại.',
        );
        return;
      }
      setNotice('Đã tạo User.');
      setEmail('');
      setName('');
      setPassword('');
      router.refresh();
    } catch {
      setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20"
    >
      <p className="text-sm font-medium text-white">Tạo User mới</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Chỉ Trưởng Công an xã được tạo User. Role được máy chủ kiểm tra lại,
        request client không thể tự nâng quyền.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-slate-200">
          Tên
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 transition outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <label className="block text-sm text-slate-200">
          Email
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 transition outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <label className="block text-sm text-slate-200">
          Role
          <select
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-200">
          Mật khẩu (tối thiểu 8 ký tự)
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 transition outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-4 text-sm text-emerald-300" role="status">
          {notice}
        </p>
      ) : null}
      <button
        className="mt-6 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
        type="submit"
        disabled={saving}
      >
        {saving ? 'Đang tạo…' : 'Tạo User'}
      </button>
    </form>
  );
}
