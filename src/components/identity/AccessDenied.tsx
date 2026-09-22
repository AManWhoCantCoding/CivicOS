export function AccessDenied({
  message = 'Hồ sơ này không thuộc nhiệm vụ hoặc phạm vi chỉ huy của tài khoản hiện tại.',
}: {
  message?: string;
}) {
  return (
    <section
      className="civicos-surface p-6"
      style={{ borderColor: 'var(--civicos-danger)' }}
    >
      <h2 className="font-semibold">Không có quyền truy cập</h2>
      <p
        className="mt-2 text-sm leading-6"
        style={{ color: 'var(--civicos-text-muted)' }}
      >
        {message}
      </p>
    </section>
  );
}
