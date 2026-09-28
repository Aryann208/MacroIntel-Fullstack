'use client';

import { useState } from 'react';
import { useMacroSeriesQuery } from '../../lib/use-macro-series-query';

import Link from 'next/link';

const seriesCategories = [
  { value: 'all', name: 'All categories' },
  { value: 'inflation', name: 'Inflation' },
  { value: 'employment', name: 'Employment' },
  { value: 'growth', name: 'Growth' },
  { value: 'rates', name: 'Rates' },
];

export default function Page() {
  const seriesQuery = useMacroSeriesQuery();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  if (seriesQuery.isPending) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <p
          className="rounded-xl border border-slate-800 bg-[#111720] p-6 text-sm text-slate-400"
          aria-live="polite"
        >
          Loading indicators...
        </p>
      </main>
    );
  }

  if (seriesQuery.isError) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <p
          className="rounded-xl border border-amber-900 bg-amber-950/20 p-6 text-sm text-amber-300"
          role="alert"
        >
          Could not load indicators.
        </p>
      </main>
    );
  }

  const searchText = search.trim().toLowerCase();

  const filteredSeries = seriesQuery.data.items.filter((series) => {
    const matchesName = series.name.toLowerCase().includes(searchText);
    const matchesShortName = series.shortName
      .toLowerCase()
      .includes(searchText);
    const matchesId = series.providerSeriesId
      .toLowerCase()
      .includes(searchText);

    const matchesSearch = matchesName || matchesShortName || matchesId;
    const matchesCategory = category === 'all' || series.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <Link
          href="/"
          className="inline-flex rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-teal-700 hover:text-teal-300"
        >
          ← Back to overview
        </Link>
        <p className="mt-8 text-xs font-medium tracking-widest text-teal-300 uppercase">
          MacroIntel / Indicators
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Browse indicators
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Explore available economic indicators. Open a series to inspect its
          latest value and recent history, then save it to your watchlist.
        </p>
      </header>

      <section
        aria-label="Indicator filters"
        className="mt-8 grid gap-4 rounded-xl border border-slate-800 bg-[#111720] p-5 sm:grid-cols-[minmax(0,1fr)_14rem] sm:p-6"
      >
        <div className="min-w-0">
          <label
            htmlFor="series-search"
            className="mb-2 block text-xs font-medium text-slate-400"
          >
            Search indicators
          </label>
          <input
            id="series-search"
            type="search"
            placeholder="Search by name or identifier"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <div>
          <label
            htmlFor="series-category"
            className="mb-2 block text-xs font-medium text-slate-400"
          >
            Category
          </label>
          <select
            id="series-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          >
            {seriesCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Available indicators</h2>
        <p className="text-sm text-slate-500" aria-live="polite">
          {filteredSeries.length} indicators
        </p>
      </div>

      {filteredSeries.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          No indicators match your search.
        </p>
      )}

      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {filteredSeries.map((series) => (
          <li
            className="rounded-xl border border-slate-800 bg-[#111720] p-5 transition hover:border-slate-600 sm:p-6"
            key={series.providerSeriesId}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-xs text-slate-500">
                FRED · {series.providerSeriesId}
              </p>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 capitalize">
                {series.category}
              </span>
            </div>
            <Link
              href={`/series/${encodeURIComponent(series.providerSeriesId)}`}
              className="mt-4 block rounded-sm text-lg font-medium leading-7 text-slate-100 transition hover:text-teal-300"
            >
              {series.name}
              <span className="mt-2 block text-sm font-normal text-teal-300">
                View latest value and history →
              </span>
            </Link>
            <dl className="mt-5 space-y-3 border-t border-slate-800 pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Country</dt>
                <dd className="text-slate-300">{series.country}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Frequency</dt>
                <dd className="text-slate-300 capitalize">
                  {series.frequency}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-slate-500">Unit</dt>
                <dd className="min-w-0 wrap-break-word text-right text-slate-300">
                  {series.unit}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </main>
  );
}
