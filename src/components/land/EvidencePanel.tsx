import { evidencePlaceholderCopy } from '@/components/land/workspace-view';

// LND-05 Evidence metadata panel cho screen-04: placeholder chỉ đọc theo
// textual handoff. Không fetch endpoint chưa duyệt, không upload control,
// không bytes, không khóa lưu trữ, không phơi bày public/mobile.
export function EvidencePanel() {
  return (
    <section
      aria-labelledby="land-evidence-heading"
      className="rounded-xl border border-slate-800 bg-slate-950 p-4"
    >
      <h3
        id="land-evidence-heading"
        className="text-xl font-semibold text-slate-100"
      >
        Evidence (siêu dữ liệu)
      </h3>
      <p role="status" className="mt-2 text-sm leading-6 text-slate-400">
        {evidencePlaceholderCopy()}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Panel dùng chung policy nội bộ; không áp dụng tra cứu công khai hay
        mobile.
      </p>
    </section>
  );
}
