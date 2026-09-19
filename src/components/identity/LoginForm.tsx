'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('truong@civicos.local');
  const [password, setPassword] = useState('civicos-dev');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json().catch(() => null)) as unknown;
      if (!response.ok || !result || typeof result !== 'object') {
        setError('Email hoặc mật khẩu không hợp lệ.');
        return;
      }
      if (!('user' in result) || !result.user) {
        setError('Phiên đăng nhập chưa được tạo. Vui lòng thử lại.');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Không thể kết nối máy chủ xác thực. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20"
    >
      <div className="mb-6">
        <p className="text-sm font-medium text-white">Đăng nhập nội bộ</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Development account: mật khẩu mặc định `civicos-dev`.
        </p>
      </div>
      <div className="space-y-4">
        <label className="block text-sm text-slate-200">
          Email
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 transition outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm text-slate-200">
          Mật khẩu
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 transition outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="mt-6 w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Đang xác thực…' : 'Đăng nhập'}
      </button>
    </form>
  );
}
