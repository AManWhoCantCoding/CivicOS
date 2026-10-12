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
      <button type="button" disabled={!actionable} onClick={onStart}>
        {ready ? 'Bắt đầu demo' : 'Chưa thể bắt đầu demo'}
      </button>
    </section>
  );
}
