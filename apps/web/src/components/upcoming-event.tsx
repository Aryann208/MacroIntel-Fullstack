'use client';

import { useUpcomingEventsQuery } from './use-upcoming-events-query';

export function UpcomingEvents() {
  const query = useUpcomingEventsQuery();
  if (query.isPending) {
    return <p className="mt-6 text-sm text-slate-400">Loading events...</p>;
  }

  if (query.isError) {
    return (
      <p className="mt-6 text-sm text-amber-300">
        Could not load upcoming events.
      </p>
    );
  }

  if (query.data.events.length === 0) {
    return <p className="mt-6 text-sm text-slate-400">No upcoming events.</p>;
  }

  return (
    <ul className="mt-6 space-y-3">
      {query.data.events.map((event) => (
        <li key={event.id} className="rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium">{event.name}</p>
            <span className="text-xs uppercase text-amber-300">
              {event.importance}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {event.country} - {new Date(event.scheduledAt).toLocaleString()}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Forecast: {event.forecast ?? 'Unavailable'} {event.unit}
          </p>
        </li>
      ))}
    </ul>
  );
}
