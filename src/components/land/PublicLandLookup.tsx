'use client';

import { FormEvent, useEffect, useState } from 'react';

import {
  fetchPublicLandLookup,
  type PublicLandLookup,
  type PublicLandLookupMode,
} from './land-api';

type PublicLookupError = {
  code: string;
  message: string;
  retryable: boolean;
};

const lookupFields = [
  { key: 'applicationCode', label: 'Mã hồ sơ', mono: true },
  { key: 'parcelCode', label: 'Mã thửa', mono: true },
  { key: 'mapSheetNumber', label: 'Số tờ bản đồ', mono: true },
  { key: 'parcelNumber', label: 'Số thửa', mono: true },
  { key: 'status', label: 'Trạng thái', mono: false },
  { key: 'submittedAt', label: 'Thời điểm nộp', mono: true },
  { key: 'updatedAt', label: 'Cập nhật lần cuối', mono: true },
  { key: 'completedAt', label: 'Thời điểm hoàn tất', mono: true },
] as const;

export function mapPublicLookupError(
  code: string | null,
  status: number | null,
  online: boolean,
): PublicLookupError {
  if (status === 0 || status === null) {
    return online
      ? {
          code: 'LAND_LOOKUP_NETWORK_ERROR',
          message: 'Không thể kết nối để tra cứu. Vui lòng thử lại.',
          retryable: true,
        }
      : {
          code: 'LAND_LOOKUP_OFFLINE',
          message: 'Đang ngoại tuyến. Kiểm tra kết nối rồi thử lại.',
          retryable: true,
        };
  }
  if (code === 'LAND_LOOKUP_QUERY_INVALID') {
    return {
      code,
      message: 'Cần cung cấp chính xác một mã hồ sơ hoặc mã thửa.',
      retryable: false,
    };
  }
  if (code === 'LAND_LOOKUP_NOT_FOUND' || status === 404) {
    return {
      code: 'LAND_LOOKUP_NOT_FOUND',
      message: 'Không tìm thấy kết quả tra cứu.',
      retryable: true,
    };
  }
  if (code === 'LAND_RATE_LIMITED' || status === 429) {
    return {
      code: 'LAND_RATE_LIMITED',
      message: 'Bạn đã vượt quá số lần tra cứu cho phép; vui lòng thử lại sau.',
      retryable: true,
    };
  }
  return {
    code: code ?? 'LAND_LOOKUP_FAILED',
    message: 'Không thể tải kết quả tra cứu. Vui lòng thử lại.',
    retryable: true,
  };
}

export function publicLookupStatusText(status: string): string {
  if (status === 'submitted') return 'Đã tiếp nhận';
  if (status === 'in_review') return 'Đang thẩm tra';
  if (status === 'completed') return 'Đã hoàn thành';
  if (status === 'rejected') return 'Đã từ chối';
  return 'Đang xử lý';
}

function publicLookupStatusTone(status: string): string {
  if (status === 'completed') {
    return 'border-[#2F7D50]/40 bg-[#2F7D50]/10 text-[#2F7D50]';
  }
  if (status === 'rejected') {
    return 'border-[#B54747]/40 bg-[#B54747]/10 text-[#B54747]';
  }
  return 'border-[#2E6F95]/40 bg-[#2E6F95]/10 text-[#2E6F95]';
}

export function PublicLandLookup() {
  const [mode, setMode] = useState<PublicLandLookupMode>('applicationCode');
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState<PublicLandLookup | null>(null);
  const [error, setError] = useState<PublicLookupError | null>(null);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    function updateOnline() {
      setOnline(window.navigator.onLine);
    }
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  async function submitLookup() {
    if (!code.trim()) {
      setLookup(null);
      setError(mapPublicLookupError('LAND_LOOKUP_QUERY_INVALID', 400, online));
      return;
    }
    setLoading(true);
    setLookup(null);
    setError(null);
    const result = await fetchPublicLandLookup(mode, code);
    if (result.lookup && result.simulated) {
      setLookup(result.lookup);
    } else {
      setError(
        mapPublicLookupError(result.error?.code ?? null, result.status, online),
      );
    }
    setLoading(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitLookup();
  }

  return (
    <div className="space-y-6">
      <form
        noValidate
        onSubmit={submit}
        className="rounded-2xl border border-[#D8E0E6] bg-white p-5 shadow-sm sm:p-6"
      >
        <fieldset>
          <legend className="text-sm font-semibold text-[#17212B]">
            Tra cứu theo
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-[#D8E0E6] px-3 text-sm text-[#17212B] has-[:checked]:border-[#0F6B67] has-[:checked]:bg-[#0F6B67]/5">
              <input
                type="radio"
                name="land-lookup-mode"
                value="applicationCode"
                checked={mode === 'applicationCode'}
                onChange={() => {
                  setMode('applicationCode');
                  setError(null);
                }}
                className="h-4 w-4 accent-[#0F6B67]"
              />
              Mã hồ sơ
            </label>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-[#D8E0E6] px-3 text-sm text-[#17212B] has-[:checked]:border-[#0F6B67] has-[:checked]:bg-[#0F6B67]/5">
              <input
                type="radio"
                name="land-lookup-mode"
                value="parcelCode"
                checked={mode === 'parcelCode'}
                onChange={() => {
                  setMode('parcelCode');
                  setError(null);
                }}
                className="h-4 w-4 accent-[#0F6B67]"
              />
              Mã thửa
            </label>
          </div>
        </fieldset>

        <div className="mt-5">
          <label
            htmlFor="land-lookup-code"
            className="block text-sm font-semibold text-[#17212B]"
          >
            {mode === 'applicationCode' ? 'Mã hồ sơ' : 'Mã thửa'}
          </label>
          <input
            id="land-lookup-code"
            className="mt-2 min-h-[44px] w-full rounded-lg border border-[#D8E0E6] bg-white px-3 font-mono text-base text-[#17212B] transition outline-none placeholder:text-[#65727E] focus:border-[#0F6B67] focus:ring-2 focus:ring-[#0F6B67]/20"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={
              mode === 'applicationCode'
                ? 'Ví dụ: APP-001'
                : 'Ví dụ: PARCEL-001'
            }
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'land-lookup-error' : undefined}
            required
          />
          <p className="mt-2 text-sm text-[#65727E]">
            Nhập đúng một mã để xem thông tin projection tối thiểu.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 min-h-[44px] rounded-lg bg-[#0F6B67] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0F6B67]/90 focus-visible:outline-[#0F6B67] disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? 'Đang tra cứu…' : 'Tra cứu'}
        </button>
      </form>

      {!online ? (
        <p
          role="status"
          className="rounded-lg border border-[#B7791F]/40 bg-[#B7791F]/10 p-3 text-sm text-[#7A4F0D]"
        >
          Đang ngoại tuyến. Bạn có thể thử lại khi kết nối được khôi phục.
        </p>
      ) : null}

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="rounded-2xl border border-[#D8E0E6] bg-white p-6"
        >
          <div
            aria-hidden="true"
            className="h-5 w-40 animate-pulse rounded bg-[#D8E0E6]"
          />
          <p className="mt-3 text-sm text-[#65727E]">Đang tải kết quả…</p>
        </div>
      ) : null}

      {error ? (
        <div
          id="land-lookup-error"
          role="alert"
          aria-live="assertive"
          className="rounded-2xl border border-[#B54747]/40 bg-[#B54747]/5 p-5 text-[#7A2F2F]"
        >
          <p className="text-sm leading-6">
            <strong className="font-mono">{error.code}</strong>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            {error.message}
          </p>
          {error.retryable ? (
            <button
              type="button"
              onClick={() => void submitLookup()}
              disabled={loading}
              className="mt-4 min-h-[44px] rounded-lg border border-[#B54747]/50 px-4 py-2.5 text-sm font-semibold text-[#7A2F2F] transition hover:bg-[#B54747]/10 disabled:cursor-wait disabled:opacity-60"
            >
              Thử lại
            </button>
          ) : null}
        </div>
      ) : null}

      {lookup ? (
        <section
          aria-labelledby="public-land-lookup-result"
          className="rounded-2xl border border-[#D8E0E6] bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[#65727E] uppercase">
                Kết quả tra cứu
              </p>
              <h2
                id="public-land-lookup-result"
                className="mt-2 text-xl font-semibold text-[#17212B]"
              >
                Thông tin projection
              </h2>
            </div>
            <span className="inline-flex min-h-[32px] items-center rounded-full border border-[#2E6F95]/40 bg-[#2E6F95]/10 px-3 text-xs font-semibold text-[#2E6F95]">
              Mô phỏng · simulated
            </span>
          </div>

          <dl className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {lookupFields.map(({ key, label, mono }) => (
              <div key={key}>
                <dt className="text-xs font-medium text-[#65727E]">{label}</dt>
                <dd
                  className={`mt-1 text-sm break-words text-[#17212B] ${
                    mono ? 'font-mono' : ''
                  }`}
                >
                  {key === 'status' ? (
                    <span
                      className={`inline-flex min-h-[28px] items-center rounded-full border px-2.5 text-xs font-semibold ${publicLookupStatusTone(lookup.status)}`}
                      data-status={lookup.status}
                    >
                      {publicLookupStatusText(lookup.status)}
                    </span>
                  ) : (
                    (lookup[key] ?? 'Chưa hoàn tất')
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
