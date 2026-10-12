'use client';
import { useFetchHistoricalPositions } from '../../components/use-fetch-historical-positions';
import { useFetchMT5Snapshot } from '../../components/use-fetch-mt5-snapshot-provider';

export default function IntegrationsPage() {
  const snapshotQuery = useFetchMT5Snapshot();
  const login = snapshotQuery.data?.account.login;
  const server = snapshotQuery.data?.account.server;

  const historicalPositionsQuery = useFetchHistoricalPositions(login, server);
  const snapshotStatus = snapshotQuery.isPending
    ? 'Loading'
    : snapshotQuery.isError
      ? 'Error'
      : 'Live';
  const statusColor = snapshotQuery.isPending
    ? 'border-slate-700 bg-slate-900/70 text-slate-300'
    : snapshotQuery.isError
      ? 'border-red-900/70 bg-red-950/40 text-red-200'
      : 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
  const statusDotColor = snapshotQuery.isPending
    ? 'bg-slate-400'
    : snapshotQuery.isError
      ? 'bg-red-400'
      : 'bg-emerald-300';
  const toCamelCase = (word: string) => {
    if (word.length === 0) return word;
    const firstChar = word.slice(0, 1);
    const restChars = word.slice(1, word.length);
    return firstChar.toUpperCase() + restChars;
  };
  const accountMetrics = Object.entries(snapshotQuery.data?.account ?? {}).map(
    ([key, value]) => ({
      label: toCamelCase(key),
      value: value,
    }),
  );
  const positions = snapshotQuery.data?.positions;
  const history = historicalPositionsQuery.data;
  const formatNumber = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <main className="mx-auto max-w-6xl space-y-7 p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-teal-300 uppercase">
            Connections
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Integrations</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            View account activity from your connected trading platform.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${statusColor}`}
        >
          <span className={`h-2 w-2 rounded-full ${statusDotColor}`} />
          {snapshotStatus}
        </span>
      </div>

      <section className="rounded-xl border border-slate-800 bg-[#111720] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-slate-500 uppercase">
              Connected account
            </p>
            <h2 className="mt-2 text-xl font-semibold">MetaTrader 5</h2>
            <p className="mt-1 text-sm text-slate-400">
              MT5 server <span className="px-1 text-slate-600">·</span>{' '}
              {snapshotQuery.isPending ? (
                <span
                  aria-label="Loading server"
                  className="inline-block h-4 w-36 animate-pulse rounded bg-slate-700 align-middle"
                />
              ) : (
                (snapshotQuery.data?.account.server ?? 'Unavailable')
              )}
            </p>
          </div>
          <span
            className={`rounded-md border px-2.5 py-1 text-xs ${statusColor}`}
          >
            {snapshotStatus}
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {snapshotQuery.isPending
            ? Array.from({ length: 8 }, (_, index) => (
                <div
                  key={`account-skeleton-${index}`}
                  aria-hidden="true"
                  className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
                >
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-700" />
                  <div className="mt-3 h-6 w-32 animate-pulse rounded bg-slate-800" />
                </div>
              ))
            : accountMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
                >
                  <p className="text-sm text-slate-400">{metric.label}</p>
                  <p className="mt-2 text-xl font-medium tabular-nums text-slate-100">
                    {metric.value}
                  </p>
                </div>
              ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#111720]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-medium">Open positions</h2>
            <p className="mt-1 text-sm text-slate-500">
              {snapshotQuery.isPending
                ? 'Loading positions...'
                : `${snapshotQuery.data?.positions.length ?? 0} positions`}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs ${statusColor}`}
          >
            {snapshotQuery.isPending
              ? 'Loading snapshot'
              : snapshotQuery.isError
                ? 'Snapshot unavailable'
                : 'Live snapshot'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-950/40 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">Symbol</th>
                <th className="px-4 py-3 font-medium">Side</th>
                <th className="px-4 py-3 text-right font-medium">Volume</th>
                <th className="px-4 py-3 text-right font-medium">Open price</th>
                <th className="px-4 py-3 text-right font-medium">Current</th>
                <th className="px-4 py-3 text-right font-medium">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {snapshotQuery.isPending ? (
                Array.from({ length: 3 }, (_, rowIndex) => (
                  <tr key={`position-skeleton-${rowIndex}`} aria-hidden="true">
                    <td className="px-5 py-4 sm:px-6">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                      <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-5 w-12 animate-pulse rounded bg-slate-700" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="ml-auto h-4 w-12 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="ml-auto h-4 w-14 animate-pulse rounded bg-slate-800" />
                    </td>
                  </tr>
                ))
              ) : positions && positions.length > 0 ? (
                positions.map((position) => (
                  <tr key={position.ticket}>
                    <td className="px-5 py-4 sm:px-6">
                      <span className="font-medium text-slate-100">
                        {position.symbol}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Ticket {position.ticket}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300">
                        {position.side}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">
                      {position.volume}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">
                      {position.priceOpen}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">
                      {position.priceCurrent}
                    </td>
                    <td
                      className={`px-4 py-4 text-right font-medium tabular-nums ${position.profit > 0 ? 'text-emerald-300' : 'text-red-300'}`}
                    >
                      {position.profit}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    {snapshotQuery.isError && !snapshotQuery.data
                      ? 'Snapshot unavailable. Check the MT5 connection.'
                      : 'No open positions.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500 sm:px-6">
          {snapshotQuery.data
            ? `Last snapshot captured ${new Date(snapshotQuery.data.capturedAt).toLocaleString()}${snapshotQuery.isError ? ' - this snapshot may be stale' : ''}`
            : snapshotQuery.isError
              ? 'No snapshot is currently available.'
              : 'Waiting for the first snapshot.'}
        </p>
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#111720]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-medium">Completed positions</h2>
            <p className="mt-1 text-sm text-slate-500">
              {historicalPositionsQuery.isPending
                ? 'Loading history...'
                : `${history?.positions.length ?? 0} positions`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {historicalPositionsQuery.isPending
                ? 'Checking sync time...'
                : history?.historySyncedAt
                  ? `Last synced ${new Date(history.historySyncedAt).toLocaleString()}`
                  : 'Not synced yet'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => historicalPositionsQuery.refetch()}
            disabled={historicalPositionsQuery.isFetching}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-teal-700 hover:text-teal-200 disabled:cursor-wait disabled:opacity-60"
          >
            {historicalPositionsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {historicalPositionsQuery.isPending ? (
          <div
            className="space-y-3 p-5 sm:p-6"
            aria-label="Loading completed positions"
          >
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={`history-skeleton-${index}`}
                aria-hidden="true"
                className="grid grid-cols-3 gap-4 md:grid-cols-10"
              >
                {Array.from({ length: 10 }, (_, cellIndex) => (
                  <div
                    key={`history-skeleton-${index}-${cellIndex}`}
                    className="h-4 animate-pulse rounded bg-slate-800"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : historicalPositionsQuery.isError ? (
          <div className="px-6 py-12 text-center" role="alert">
            <p className="text-sm text-red-200">Could not load completed positions.</p>
            <button
              type="button"
              onClick={() => historicalPositionsQuery.refetch()}
              className="mt-3 text-sm text-teal-300 hover:text-teal-200"
            >
              Try again
            </button>
          </div>
        ) : history && history.positions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-950/40 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium sm:px-6">Opened</th>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Side</th>
                  <th className="px-4 py-3 text-right font-medium">Volume</th>
                  <th className="px-4 py-3 text-right font-medium">Open price</th>
                  <th className="px-4 py-3 font-medium">Closed</th>
                  <th className="px-4 py-3 text-right font-medium">Close price</th>
                  <th className="px-4 py-3 text-right font-medium">Profit</th>
                  <th className="px-5 py-3 text-right font-medium sm:px-6">
                    Position ID
                  </th>
                  <th className="px-5 py-3 text-right font-medium sm:px-6">
                    Magic number
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {history.positions.map((position) => (
                  <tr key={position.positionId} className="hover:bg-slate-950/30">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400 sm:px-6">
                      {new Date(position.openedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-100">
                      {position.symbol}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300">
                        {position.side}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">
                      {formatNumber(position.volume)}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">
                      {formatNumber(position.openPrice)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-400">
                      {new Date(position.closedAt).toLocaleString()}
                    </td>
                    <td
                      className="px-4 py-4 text-right tabular-nums text-slate-300"
                    >
                      {formatNumber(position.closedPrice)}
                    </td>
                    <td
                      className={`px-4 py-4 text-right font-medium tabular-nums ${position.grossProfit > 0 ? 'text-emerald-300' : position.grossProfit < 0 ? 'text-red-300' : 'text-slate-400'}`}
                    >
                      {formatNumber(position.grossProfit)}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-400 sm:px-6">
                      {position.positionId}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-300 sm:px-6">
                      {position.magic ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-12 text-center text-sm text-slate-400">
            No completed positions are available yet.
          </p>
        )}
      </section>
    </main>
  );
}
