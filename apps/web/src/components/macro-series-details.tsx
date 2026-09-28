'use client';
import { useState } from 'react';
import { useLatestMacroObservationQuery } from '../lib/use-latest-macro-observation-query';
import { useMacroSeriesHistoryQuery } from '../lib/use-macro-series-history-query';
import SeriesWatchlistButton from './series-watchlist-button';

type MacroSeriesDetailsProps = {
  providerSeriesId: string;
};

const observationHistoryValues = [12, 24, 60];
export function MacroSeriesDetails({
  providerSeriesId,
}: MacroSeriesDetailsProps) {
  const [historyLimit, setHistoryLimit] = useState(12);
  const observationQuery = useLatestMacroObservationQuery(providerSeriesId);
  const seriesHistoricalQuery = useMacroSeriesHistoryQuery(
    providerSeriesId,
    historyLimit,
  );

  const previousObservation = seriesHistoricalQuery.data?.items.at(-2);
  const seriesPreviousValue = previousObservation?.value;
  const seriesCurrentValue = observationQuery?.data?.value;

  let seriesChange: number | null = null;

  if (seriesPreviousValue !== undefined && seriesCurrentValue !== undefined) {
    seriesChange = Number(
      (seriesCurrentValue - seriesPreviousValue).toFixed(2),
    );
  }

  return (
    <div className="space-y-5">
      {observationQuery.isPending && (
        <p
          className="rounded-xl border border-slate-800 bg-[#111720] p-5 text-sm text-slate-400"
          aria-live="polite"
        >
          Loading observation...
        </p>
      )}

      {observationQuery.isError && (
        <p
          className="rounded-xl border border-amber-900 bg-amber-950/20 p-5 text-sm text-amber-300"
          role="alert"
        >
          Could not load the selected observation.
        </p>
      )}

      {observationQuery.data && (
        <div className="rounded-xl border border-slate-800 bg-[#111720] p-5 sm:p-6">
          <p className="text-xs font-medium tracking-widest text-slate-500 uppercase">
            Latest observation
          </p>
          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-medium leading-7">
                {observationQuery.data.name}
              </h2>
              <p className="mt-2 font-mono text-xs text-slate-500">
                FRED - {observationQuery.data.providerSeriesId}
              </p>
            </div>

            <div className="min-w-0 sm:max-w-64 sm:text-right">
              <p className="text-3xl font-semibold text-teal-300 tabular-nums">
                {observationQuery.data.value}
              </p>
              <p className="mt-2 wrap-break-word text-xs leading-5 text-slate-400">
                {observationQuery.data.unit}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Observed{' '}
            {new Date(observationQuery.data.observedAt).toLocaleDateString(
              'en-US',
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              },
            )}
          </p>
          <div className="mt-5 border-t border-slate-800 pt-5">
            {seriesHistoricalQuery.isPending && (
              <p className="text-sm text-slate-400" aria-live="polite">
                Loading comparison...
              </p>
            )}
            {seriesHistoricalQuery.isError && (
              <p className="text-sm text-amber-300" role="alert">
                Could not load the previous observation.
              </p>
            )}
            {seriesHistoricalQuery.isSuccess &&
              (previousObservation && seriesChange !== null ? (
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                    <dt className="text-xs text-slate-400">Previous value</dt>
                    <dd className="mt-2 text-xl font-medium text-slate-100 tabular-nums">
                      {seriesPreviousValue}
                    </dd>
                    <dd className="mt-2 text-xs text-slate-500">
                      {new Date(
                        previousObservation.observedAt,
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </dd>
                  </div>
                  <div className="min-w-0 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                    <dt className="text-xs leading-5 text-slate-400">
                      Change from previous observation
                    </dt>
                    <dd className="mt-2 text-xl font-medium text-slate-100 tabular-nums">
                      {seriesChange === 0
                        ? 'No change'
                        : (seriesChange > 0 ? '+' : '') +
                          seriesChange.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                    </dd>
                    <dd className="mt-2 wrap-break-word text-xs leading-5 text-slate-500">
                      {observationQuery.data.unit}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-slate-400">
                  Not enough history to compare.
                </p>
              ))}
          </div>
        </div>
      )}
      <SeriesWatchlistButton providerSeriesId={providerSeriesId} />
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#111720]">
        <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-medium">Recent history</h3>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="History length"
            >
              {observationHistoryValues.map((limit) => (
                <button
                  type="button"
                  aria-pressed={historyLimit === limit}
                  onClick={() => {
                    setHistoryLimit(limit);
                  }}
                  key={limit}
                  className={
                    'cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition ' +
                    (historyLimit === limit
                      ? 'border-teal-700 bg-teal-950/60 text-teal-200'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-slate-200')
                  }
                >
                  Last {limit}
                  <span className="sr-only"> observations</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Observation periods are shown from oldest to newest.
          </p>
        </div>

        {seriesHistoricalQuery.isPending && (
          <p className="p-5 text-sm text-slate-400" aria-live="polite">
            Loading history...
          </p>
        )}

        {seriesHistoricalQuery.isError && (
          <p className="p-5 text-sm text-amber-300" role="alert">
            Could not load history.
          </p>
        )}

        {seriesHistoricalQuery.isSuccess &&
          (seriesHistoricalQuery.data.items.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">No history available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-64 text-left text-sm">
                <caption className="px-5 py-3 text-left text-xs leading-5 text-slate-400 sm:px-6">
                  Unit: {seriesHistoricalQuery.data.unit}
                </caption>
                <thead className="bg-slate-900/60 text-xs text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium sm:px-6">
                      Period
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right font-medium sm:px-6"
                    >
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {seriesHistoricalQuery.data.items.map((observation) => (
                    <tr
                      key={observation.observedAt}
                      className="border-t border-slate-800 transition hover:bg-slate-900/40"
                    >
                      <td className="px-5 py-3 text-slate-300 sm:px-6">
                        {new Date(observation.observedAt).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'UTC',
                          },
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-200 tabular-nums sm:px-6">
                        {observation.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </section>
    </div>
  );
}
