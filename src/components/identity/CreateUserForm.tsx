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
      className="rounded-2xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-6"
    >
      <p className="text-sm font-medium text-[var(--civicos-text)]">
        Tạo User mới
      </p>
      <p className="mt-2 text-sm leading-6 break-words text-[var(--civicos-text-muted)]">
        Chỉ Trưởng Công an xã được tạo User. Role được máy chủ kiểm tra lại,
        request client không thể tự nâng quyền.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-[var(--civicos-text)]">
          Tên
          <input
            className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] transition outline-none focus:border-[var(--civicos-accent)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <label className="block text-sm text-[var(--civicos-text)]">
          Email
          <input
            className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] transition outline-none focus:border-[var(--civicos-accent)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <label className="block text-sm text-[var(--civicos-text)]">
          Role
          <select
            className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
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
        <label className="block text-sm text-[var(--civicos-text)]">
          Mật khẩu (tối thiểu 8 ký tự)
          <input
            className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] transition outline-none focus:border-[var(--civicos-accent)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
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
        <p
          className="mt-4 text-sm break-words text-[var(--civicos-danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          className="mt-4 text-sm break-words text-[var(--civicos-success)]"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      <button
        className="mt-6 min-h-[44px] rounded-lg bg-[var(--civicos-accent)] px-4 py-3 text-sm font-semibold text-[var(--civicos-accent-contrast)] transition hover:bg-[var(--civicos-accent-hover)] active:translate-y-px disabled:cursor-wait disabled:opacity-60"
        type="submit"
        disabled={saving}
      >
        {saving ? 'Đang tạo…' : 'Tạo User'}
      </button>
    </form>
  );
}
