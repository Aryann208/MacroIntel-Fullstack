'use client';

import { useState } from 'react';
import { useMacroSeriesQuery } from '../lib/use-macro-series-query';
import { useLatestMacroObservationQuery } from '../lib/use-latest-macro-observation-query';

export function LatestMacroObservation() {
  const [selectedSeriesId, setSelectedSeriesId] = useState('CPIAUCSL');

  const seriesQuery = useMacroSeriesQuery();
  const observationQuery = useLatestMacroObservationQuery(selectedSeriesId);
  if (seriesQuery.isPending) {
    return (
      <p className="mt-6 rounded-lg border border-slate-700 p-4 text-sm text-slate-400">
        Loading Series...
      </p>
    );
  }

  if (seriesQuery.isError) {
    return (
      <p className="mt-6 rounded-lg border border-amber-900 p-4 text-sm text-amber-300">
        Could not load the series list.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <label htmlFor="series" className="mb-2 block text-xs text-slate-400">
        Select series
      </label>

      <select
        id="series"
        value={selectedSeriesId}
        onChange={(event) => setSelectedSeriesId(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
      >
        {seriesQuery.data.items.map((series) => (
          <option key={series.providerSeriesId} value={series.providerSeriesId}>
            {series.shortName} - {series.country}
          </option>
        ))}
      </select>

      {observationQuery.isPending && (
        <p className="mt-4 text-sm text-slate-400">Loading observation...</p>
      )}

      {observationQuery.isError && (
        <p className="mt-4 text-sm text-amber-300">
          Could not load the selected observation.
        </p>
      )}

      {observationQuery.data && (
        <div className="mt-4 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{observationQuery.data.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                Local seeded data - {observationQuery.data.providerSeriesId}
              </p>
            </div>

            <p className="text-lg font-semibold text-teal-300">
              {observationQuery.data.value} {observationQuery.data.unit}
            </p>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Observed{' '}
            {new Date(observationQuery.data.observedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
