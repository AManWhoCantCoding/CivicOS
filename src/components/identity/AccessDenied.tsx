export function AccessDenied({
  message = 'Hồ sơ này không thuộc nhiệm vụ hoặc phạm vi chỉ huy của tài khoản hiện tại.',
}: {
  message?: string;
}) {
  return (
    <section className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-6 text-rose-100">
      <h2 className="font-semibold">Không có quyền truy cập</h2>
      <p className="mt-2 text-sm leading-6 text-rose-200/80">{message}</p>
    </section>
  );
}
