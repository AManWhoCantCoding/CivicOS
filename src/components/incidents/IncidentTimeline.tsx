export function IncidentTimeline({
  events,
}: {
  events: Array<{
    eventId: string;
    eventType: string;
    aggregateVersion: number;
    occurredAt: string;
  }>;
}) {
  return (
    <section className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
        Timeline
      </h2>
      {events.length ? (
        <ol className="mt-5 space-y-4">
          {events.map((event) => (
            <li
              key={event.eventId}
              className="relative flex gap-4 border-l border-[var(--civicos-border)] pl-4"
            >
              <span
                aria-hidden="true"
                className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full bg-[var(--civicos-border)]"
              />
              <div className="min-w-0">
                <p className="text-sm text-[var(--civicos-text)]">
                  {event.eventType}
                </p>
                <p className="mt-1 font-mono text-xs text-[var(--civicos-text-muted)]">
                  v{event.aggregateVersion} ·{' '}
                  {new Date(event.occurredAt).toLocaleString('vi-VN')}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 text-sm text-[var(--civicos-text-muted)]">
          <span aria-hidden="true">○ </span>
          Chưa có sự kiện nào được ghi nhận trên Incident.
        </p>
      )}
    </section>
  );
}
