export function AccessDenied({
  message = 'Hồ sơ này không thuộc nhiệm vụ hoặc phạm vi chỉ huy của tài khoản hiện tại.',
}: {
  message?: string;
}) {
  return (
    <section
      className="civicos-surface p-5"
      style={{
        borderLeft: '3px solid var(--civicos-danger)',
        borderRadius: 'var(--civicos-radius-md)',
      }}
    >
      <h2
        className="text-sm font-semibold"
        style={{ color: 'var(--civicos-danger)' }}
      >
        <span aria-hidden="true">⊘ </span>
        Không có quyền truy cập
      </h2>
      <p
        className="mt-2 text-sm leading-6 break-words"
        style={{ color: 'var(--civicos-text-muted)' }}
      >
        {message}
      </p>
    </section>
  );
}
