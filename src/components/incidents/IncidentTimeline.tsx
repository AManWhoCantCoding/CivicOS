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
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-semibold text-white">Timeline</h2>
      <ol className="mt-5 space-y-4">
        {events.map((event) => (
          <li
            key={event.eventId}
            className="flex gap-4 border-l border-slate-700 pl-4"
          >
            <div>
              <p className="text-sm text-slate-200">{event.eventType}</p>
              <p className="mt-1 text-xs text-slate-500">
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
