import { OfflineQueueStatus } from '@/components/field/OfflineQueueStatus';

export default function OfflinePage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
          Đồng bộ
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--civicos-text)]">
          Trạng thái thiết bị
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--civicos-text-muted)]">
          Thao tác tại hiện trường được giữ cục bộ cho đến khi máy chủ xác nhận.
        </p>
      </div>
      <OfflineQueueStatus />
    </section>
  );
}
