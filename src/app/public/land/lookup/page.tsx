import Link from 'next/link';

import { PublicLandLookup } from '@/components/land/PublicLandLookup';

export default function PublicLandLookupPage() {
  return (
    <main className="min-h-dvh bg-[#F4F6F8] text-[#17212B]">
      <header className="border-b border-[#D8E0E6] bg-white">
        <div className="mx-auto flex min-h-[72px] max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="font-semibold tracking-tight text-[#17212B] underline-offset-4 hover:underline"
          >
            CivicOS
          </Link>
          <p className="text-sm text-[#65727E]">Tra cứu công khai</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="font-mono text-xs tracking-[0.16em] text-[#0F6B67] uppercase">
          Đất đai / Tra cứu công khai
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17212B] sm:text-4xl">
          Tra cứu hồ sơ đất đai
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#65727E]">
          Nhập mã hồ sơ hoặc mã thửa để xem trạng thái và thông tin projection
          tối thiểu.
        </p>
        <p
          role="note"
          className="mt-5 rounded-lg border border-[#2E6F95]/30 bg-[#2E6F95]/5 p-4 text-sm leading-6 text-[#285B79]"
        >
          <strong>Mô phỏng:</strong> dữ liệu hiển thị phục vụ kiểm thử, không có
          giá trị pháp lý.
        </p>

        <div className="mt-8">
          <PublicLandLookup />
        </div>
      </div>
    </main>
  );
}
