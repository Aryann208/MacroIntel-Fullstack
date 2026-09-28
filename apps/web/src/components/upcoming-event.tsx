'use client';

import { useState } from 'react';
import { useUpcomingEventsQuery } from './use-upcoming-events-query';

export function UpcomingEvents() {
  const [selectedView, setSelectedView] = useState<
    'nearest' | 'today' | 'week'
  >('nearest');
  const today = new Date().toISOString().slice(0, 10);

  let from: string | undefined;
  let to: string | undefined;

  if (selectedView === 'today') {
    from = today;
    to = today;
  } else if (selectedView === 'week') {
    const lastDay = new Date(`${today}T00:00:00.000Z`);
    lastDay.setUTCDate(lastDay.getUTCDate() + 6);

    from = today;
    to = lastDay.toISOString().slice(0, 10);
  }

  const query = useUpcomingEventsQuery(from, to);

  return (
    <div className="mt-6 space-y-4">
      <div
        role="group"
        aria-label="Release date range"
        className="flex flex-wrap gap-2"
      >
        <button
          type="button"
          aria-pressed={selectedView === 'nearest'}
          onClick={() => setSelectedView('nearest')}
          className={
            selectedView === 'nearest'
              ? 'rounded-lg border border-teal-800 bg-teal-950/60 px-3 py-2 text-xs font-medium text-teal-200'
              : 'rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-slate-100'
          }
        >
          Nearest releases
        </button>
        <button
          type="button"
          aria-pressed={selectedView === 'today'}
          onClick={() => setSelectedView('today')}
          className={
            selectedView === 'today'
              ? 'rounded-lg border border-teal-800 bg-teal-950/60 px-3 py-2 text-xs font-medium text-teal-200'
              : 'rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-slate-100'
          }
        >
          Today
        </button>
        <button
          type="button"
          aria-pressed={selectedView === 'week'}
          onClick={() => setSelectedView('week')}
          className={
            selectedView === 'week'
              ? 'rounded-lg border border-teal-800 bg-teal-950/60 px-3 py-2 text-xs font-medium text-teal-200'
              : 'rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-slate-100'
          }
        >
          Next 7 days
        </button>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        {selectedView === 'nearest'
          ? 'One upcoming date per publication.'
          : `All scheduled releases from ${from} to ${to} (UTC).`}
      </p>

      {query.isPending && (
        <p
          role="status"
          className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400"
        >
          Loading releases...
        </p>
      )}

      {query.isError && (
        <p
          role="alert"
          className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-300"
        >
          Could not load releases. Try another view or check back later.
        </p>
      )}

      {query.isSuccess && query.data.events.length === 0 && (
        <p
          role="status"
          className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400"
        >
          No releases available for this view.
        </p>
      )}

      {query.isSuccess && query.data.events.length > 0 && (
        <ul className="space-y-3">
          {query.data.events.map((event) => {
            const scheduledAt = new Date(event.scheduledAt);
            const dateLabel = event.dateOnly
              ? scheduledAt.toLocaleDateString(undefined, { timeZone: 'UTC' })
              : scheduledAt.toLocaleString();

            return (
              <li
                key={event.id}
                className="rounded-lg border border-slate-700 bg-slate-900/30 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="min-w-0 text-sm leading-6 font-medium text-slate-200">
                    {event.name}
                  </p>
                  {event.importance && (
                    <span className="text-xs uppercase text-amber-300">
                      {event.importance}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {event.country} · Release date: {dateLabel}
                </p>

                {event.forecast !== null && (
                  <p className="mt-2 text-xs text-slate-500">
                    Forecast: {event.forecast} {event.unit}
                  </p>
                )}

                {event.sourceUrl && (
                  <a
                    href={event.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs text-teal-300 underline-offset-4 hover:underline"
                  >
                    Source: {event.provider.toUpperCase()}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
