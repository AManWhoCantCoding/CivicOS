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
  return (
    <section>
      <div role="status" aria-live="polite">
        <h2>{ready ? 'Demo đã sẵn sàng kiểm tra' : 'Demo bị chặn'}</h2>
        <p>
          {ready
            ? `Target: ${result.target}. ${result.message}`
            : result.message}
        </p>
      </div>
      <button
        type="button"
        disabled={!actionable}
        onClick={onStart}
        className="mt-3 min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold transition focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--civicos-accent)] disabled:cursor-not-allowed disabled:opacity-50 motion-safe:duration-150"
        style={{
          borderColor: 'var(--civicos-accent)',
          borderRadius: 'var(--civicos-radius-sm)',
          color: 'var(--civicos-accent)',
          background: 'var(--civicos-surface)',
        }}
      >
        {ready ? 'Bắt đầu demo' : 'Chưa thể bắt đầu demo'}
      </button>
    </section>
  );
}
