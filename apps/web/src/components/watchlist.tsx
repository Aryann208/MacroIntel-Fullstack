'use client';

import { useState } from 'react';
import { useMacroSeriesQuery } from '../lib/use-macro-series-query';
import { useWatchlist } from '../lib/use-watchlist';
import { useWatchlistChanges } from '../lib/use-watchlist-changes';
import { useAuth } from './auth-provider';
import Link from 'next/link';

type AuthenticatedWatchlistProps = {
  token: string;
};

export function Watchlist() {
  const { token, isCheckingSession } = useAuth();

  if (isCheckingSession) {
    return (
      <p className="mt-6 rounded-lg border border-slate-700 p-4 text-sm text-slate-400">
        Verifying your session...
      </p>
    );
  }

  if (!token) {
    return (
      <p className="mt-6 rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">
        Sign in to create and manage your personal watchlist.
      </p>
    );
  }

  return <AuthenticatedWatchlist token={token} />;
}

export function AuthenticatedWatchlist({ token }: AuthenticatedWatchlistProps) {
  const { watchlistQuery, addMutation, removeMutation } = useWatchlist(token);
  const { changesQuery, startMutation, markSeenMutation } =
    useWatchlistChanges(token);
  const macroSeries = useMacroSeriesQuery();
  const [providerSeriesId, setProviderSeriesId] = useState('');

  function handleAddMutation(seriesId: string) {
    addMutation.mutate(seriesId);
  }

  function handleRemoveMutation(seriesId: string) {
    removeMutation.mutate(seriesId);
  }

  if (macroSeries.isError) {
    return (
      <p
        className="mt-6 rounded-lg border border-amber-900 p-4 text-sm text-amber-300"
        role="alert"
      >
        Could not load the available macro series.
      </p>
    );
  }

  if (macroSeries.isPending) {
    return (
      <p className="mt-6 text-sm text-slate-400" aria-live="polite">
        Loading macro series...
      </p>
    );
  }

  if (watchlistQuery.isError) {
    return (
      <p
        className="mt-6 rounded-lg border border-amber-900 p-4 text-sm text-amber-300"
        role="alert"
      >
        Could not load your watchlist.
      </p>
    );
  }

  if (watchlistQuery.isPending) {
    return (
      <p className="mt-6 text-sm text-slate-400" aria-live="polite">
        Loading your watchlist...
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <div>
        <label
          htmlFor="macro-series"
          className="mb-2 block text-xs font-medium tracking-wide text-slate-400 uppercase"
        >
          Add macro series
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            name="macro-series"
            id="macro-series"
            value={providerSeriesId}
            onChange={(event) => setProviderSeriesId(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          >
            <option disabled hidden value="">
              Select a series
            </option>
            {macroSeries.data.items.map((series) => (
              <option
                value={series.providerSeriesId}
                key={series.providerSeriesId}
              >
                {series.name} ({series.shortName})
              </option>
            ))}
          </select>
          <button
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={addMutation.isPending || providerSeriesId.length === 0}
            onClick={() => handleAddMutation(providerSeriesId)}
          >
            {addMutation.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {addMutation.isError && (
        <p className="text-sm text-amber-300" role="alert">
          Could not add this series. Please try again.
        </p>
      )}
      {removeMutation.isError && (
        <p className="text-sm text-amber-300" role="alert">
          Could not remove this series. Please try again.
        </p>
      )}

      <section
        aria-label="Changes since you last looked"
        className="rounded-lg border border-slate-700 bg-slate-900/40 p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-slate-200">
            Changes since you last looked
          </h3>
          {changesQuery.data &&
            !changesQuery.data.needsBaseline &&
            changesQuery.data.items.length > 0 && (
              <button
                type="button"
                onClick={() => markSeenMutation.mutate(changesQuery.data.asOf)}
                disabled={markSeenMutation.isPending}
                className="rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-medium text-teal-200 hover:bg-teal-950/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markSeenMutation.isPending ? 'Marking...' : 'Mark all as seen'}
              </button>
            )}
        </div>

        {changesQuery.isPending && (
          <p className="mt-3 text-sm text-slate-400" role="status">
            Checking for changes...
          </p>
        )}
        {changesQuery.isError && (
          <p className="mt-3 text-sm text-amber-300" role="alert">
            Could not load changes. Please try again.
          </p>
        )}
        {changesQuery.data?.needsBaseline && (
          <p className="mt-3 text-sm text-slate-400" role="status">
            Starting change tracking. New updates will appear here.
          </p>
        )}
        {startMutation.isError && changesQuery.data?.needsBaseline && (
          <button
            type="button"
            onClick={() => startMutation.mutate(changesQuery.data.asOf)}
            className="mt-2 text-sm text-amber-300 underline underline-offset-4"
          >
            Try starting change tracking again
          </button>
        )}
        {changesQuery.data &&
          !changesQuery.data.needsBaseline &&
          changesQuery.data.items.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">
              No new changes in your watchlist.
            </p>
          )}
        {changesQuery.data &&
          !changesQuery.data.needsBaseline &&
          changesQuery.data.items.length > 0 && (
            <ul className="mt-3 space-y-2">
              {changesQuery.data.items.map((change) => (
                <li
                  key={change.providerSeriesId}
                  className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-3 text-sm"
                >
                  <p className="font-medium text-slate-100">{change.name}</p>
                  <p className="mt-1 text-slate-300">
                    {change.value} {change.unit} for the period{' '}
                    {new Date(change.observedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Imported {new Date(change.ingestedAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        {markSeenMutation.isError && (
          <p className="mt-3 text-sm text-amber-300" role="alert">
            Could not mark changes as seen. Please try again.
          </p>
        )}
      </section>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-slate-200">
            Saved watchlist
          </h3>
          <span className="text-xs text-slate-500">
            {watchlistQuery.data.items.length} series
          </span>
        </div>

        {watchlistQuery.data.items.length > 0 ? (
          <ul className="space-y-2">
            {watchlistQuery.data.items.map((item) => {
              const isRemoving =
                removeMutation.isPending &&
                removeMutation.variables === item.providerSeriesId;
              const hasUnreadChange =
                changesQuery.data?.items.some(
                  (change) => change.providerSeriesId === item.providerSeriesId,
                ) ?? false;

              return (
                <li
                  className={`flex flex-col gap-3 rounded-lg border ${hasUnreadChange ? 'border-amber-700' : 'border-slate-700'} bg-slate-900/60 p-3 sm:flex-row sm:items-center sm:justify-between`}
                  key={item.providerSeriesId}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <Link
                        href={`/series/${encodeURIComponent(item.providerSeriesId)}`}
                        className="text-slate-100 hover:text-teal-300 hover:underline"
                      >
                        {item.name}
                      </Link>
                      {hasUnreadChange && (
                        <span className="rounded-full border border-amber-700 bg-amber-950/40 px-2 py-0.5 text-xs text-amber-300">
                          Updated
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-col gap-1 text-sm text-slate-300">
                      {item.latestObservation ? (
                        <>
                          <span>Value: {item.latestObservation?.value}</span>
                          <span>Unit: {item.unit}</span>
                          <span>
                            Period:{' '}
                            {new Intl.DateTimeFormat('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              timeZone: 'UTC',
                            }).format(
                              new Date(item.latestObservation?.observedAt),
                            )}
                          </span>
                        </>
                      ) : (
                        <span>No observation available</span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.shortName} · {item.country} · {item.category}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-800 hover:bg-red-950/40 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={removeMutation.isPending}
                    onClick={() => handleRemoveMutation(item.providerSeriesId)}
                  >
                    {isRemoving ? 'Removing...' : 'Remove'}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-500">
            Your watchlist is empty. Select a macro series above to add it.
          </p>
        )}
      </div>
    </div>
  );
}
