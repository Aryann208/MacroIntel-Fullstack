'use client';

import { useState } from 'react';
import { useMacroSeriesQuery } from '../lib/use-macro-series-query';
import { MacroSeriesDetails } from './macro-series-details';

export function LatestMacroObservation() {
  const [selectedSeriesId, setSelectedSeriesId] = useState('CPIAUCSL');

  const seriesQuery = useMacroSeriesQuery();

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
    <div className="mt-5 space-y-5">
      <div>
        <label
          htmlFor="series"
          className="mb-2 block text-xs font-medium text-slate-400"
        >
          Select series
        </label>

        <select
          id="series"
          value={selectedSeriesId}
          onChange={(event) => setSelectedSeriesId(event.target.value)}
          className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
        >
          {seriesQuery.data.items.map((series) => (
            <option
              key={series.providerSeriesId}
              value={series.providerSeriesId}
            >
              {series.shortName} - {series.country}
            </option>
          ))}
        </select>
      </div>
      <MacroSeriesDetails providerSeriesId={selectedSeriesId} />
    </div>
  );
}
