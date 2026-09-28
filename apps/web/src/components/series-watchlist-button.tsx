'use client';
import Link from 'next/link';
import { useAuth } from './auth-provider';
import { useWatchlist } from '../lib/use-watchlist';

type SeriesWatchlistButtonProps = {
  providerSeriesId: string;
};
type AuthenticatedSeriesWatchlistButtonProps = {
  token: string;
  providerSeriesId: string;
};

export default function SeriesWatchlistButton({
  providerSeriesId,
}: SeriesWatchlistButtonProps) {
  const { token, isCheckingSession } = useAuth();
  if (isCheckingSession) {
    return (
      <p className="text-sm text-slate-400" aria-live="polite">
        Checking session...
      </p>
    );
  }
  if (!token) {
    return (
      <Link
        href="/"
        className="inline-flex w-full items-center justify-center rounded-lg border border-dashed border-slate-600 px-4 py-3 text-sm text-slate-300 transition hover:border-teal-600 hover:text-teal-300 sm:w-auto"
      >
        Sign in to save the indicator →
      </Link>
    );
  }

  return (
    <AuthenticatedSeriesWatchlistButton
      token={token}
      providerSeriesId={providerSeriesId}
    />
  );
}

export function AuthenticatedSeriesWatchlistButton({
  token,
  providerSeriesId,
}: AuthenticatedSeriesWatchlistButtonProps) {
  const { watchlistQuery, addMutation, removeMutation } = useWatchlist(token);
  if (watchlistQuery.isPending) {
    return (
      <p className="text-sm text-slate-400" aria-live="polite">
        Checking your watchlist...
      </p>
    );
  }

  if (watchlistQuery.isError) {
    return (
      <p
        className="rounded-lg border border-amber-900 bg-amber-950/20 p-3 text-sm text-amber-300"
        role="alert"
      >
        Could not load your watchlist.
      </p>
    );
  }
  const isSaved = watchlistQuery.data.items.some(
    (item) => item.providerSeriesId === providerSeriesId,
  );

  function handleClick() {
    if (isSaved) {
      removeMutation.mutate(providerSeriesId);
    } else {
      addMutation.mutate(providerSeriesId);
    }
  }
  const isUpdating = addMutation.isPending || removeMutation.isPending;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isUpdating}
        className="inline-flex w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
      </button>

      {isUpdating && (
        <p className="text-sm text-slate-400" aria-live="polite">
          Updating watchlist...
        </p>
      )}

      {(addMutation.isError || removeMutation.isError) && (
        <p
          className="rounded-lg border border-amber-900 bg-amber-950/20 p-3 text-sm text-amber-300"
          role="alert"
        >
          Could not update your watchlist. Please try again.
        </p>
      )}
    </div>
  );
}
