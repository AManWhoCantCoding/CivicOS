import type { DemoTargetGuardResult } from '@/modules/demo/target-guard';

export function DemoTargetStatus({
  result,
  onStart,
}: {
  result: DemoTargetGuardResult;
  onStart?: () => void;
}) {
  const ready = result.state === 'ready';
  const actionable = ready && result.canStart && onStart !== undefined;
  const stateColor = ready
    ? 'var(--civicos-success)'
    : 'var(--civicos-danger)';
  return (
    <section
      className="civicos-surface p-4"
      style={{
        borderLeft: `3px solid ${stateColor}`,
        borderRadius: 'var(--civicos-radius-md)',
      }}
    >
      <div role="status" aria-live="polite">
        <h2
          className="text-sm font-semibold"
          style={{ color: stateColor }}
        >
          <span aria-hidden="true">{ready ? '● ' : '⊘ '}</span>
          {ready ? 'Demo đã sẵn sàng kiểm tra' : 'Demo bị chặn'}
        </h2>
        <p className="mt-1 text-sm leading-6 break-words text-[var(--civicos-text-muted)]">
          {ready
            ? `Target: ${result.target}. ${result.message}`
            : result.message}
        </p>
      </div>
      {ready && actionable ? (
        <button
          type="button"
          onClick={onStart}
          className="mt-3 min-h-[44px] rounded-lg px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--civicos-accent)] motion-safe:duration-150 hover:bg-[var(--civicos-accent-hover)] active:translate-y-px"
          style={{
            background: 'var(--civicos-accent)',
            borderRadius: 'var(--civicos-radius-sm)',
            color: 'var(--civicos-accent-contrast)',
          }}
        >
          Bắt đầu demo
        </button>
      ) : (
        <button
          type="button"
          disabled={!actionable}
          onClick={onStart}
          className="mt-3 min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold transition focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--civicos-accent)] disabled:cursor-not-allowed disabled:opacity-50 motion-safe:duration-150"
          style={{
            borderColor: 'var(--civicos-border)',
            borderRadius: 'var(--civicos-radius-sm)',
            color: 'var(--civicos-text-muted)',
            background: 'var(--civicos-surface)',
          }}
        >
          Chưa thể bắt đầu demo
        </button>
      )}
    </section>
  );
}
