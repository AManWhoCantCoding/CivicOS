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
      <ol className="mt-5 space-y-4">
        {events.map((event) => (
          <li
            key={event.eventId}
            className="flex gap-4 border-l border-[var(--civicos-border)] pl-4"
          >
            <div>
              <p className="text-sm text-[var(--civicos-text)]">
                {event.eventType}
              </p>
              <p className="mt-1 text-xs text-[var(--civicos-text-muted)]">
                v{event.aggregateVersion} ·{' '}
                {new Date(event.occurredAt).toLocaleString('vi-VN')}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
