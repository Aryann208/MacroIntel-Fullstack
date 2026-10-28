'use client';
import { useState } from 'react';
import { HistoryPerformanceCharts } from '../../components/history-performance-charts';
import { useFetchHistoricalPositions } from '../../components/use-fetch-historical-positions';
import { useFetchMT5Snapshot } from '../../components/use-fetch-mt5-snapshot-provider';

export default function IntegrationsPage() {
  const snapshotQuery = useFetchMT5Snapshot();
  const login = snapshotQuery.data?.account.login;
  const server = snapshotQuery.data?.account.server;
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [symbol, setSymbol] = useState('');
  const [magicNumber, setMagicNumber] = useState('');
  const [direction, setDirection] = useState('');
  const [outcome, setOutcome] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: '',
    toDate: '',
    symbol: '',
    magicNumber: '',
    direction: '',
    outcome: '',
  });
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);

  const hasDateRange = Boolean(
    appliedFilters.fromDate && appliedFilters.toDate,
  );
  const hasPartialDateRange = Boolean(fromDate) !== Boolean(toDate);

  const historicalPositionsQuery = useFetchHistoricalPositions(
    login,
    server,
    hasDateRange ? appliedFilters.fromDate : undefined,
    hasDateRange ? appliedFilters.toDate : undefined,
    appliedFilters.magicNumber || undefined,
    appliedFilters.direction || undefined,
    appliedFilters.outcome || undefined,
    appliedFilters.symbol || undefined,
    cursor,
  );
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
  const formatMetricLabel = (key: string) => {
    const words = key.replace(/([a-z])([A-Z])/g, '$1 $2');
    return words.charAt(0).toUpperCase() + words.slice(1);
  };
  const accountMetrics = Object.entries(snapshotQuery.data?.account ?? {}).map(
    ([key, value]) => ({
      label: formatMetricLabel(key),
      value: value,
    }),
  );
  const positions = snapshotQuery.data?.positions;
  const history = historicalPositionsQuery.data;
  const metrics = history?.metrics;
  const currency = snapshotQuery.data?.account.currency ?? 'USD';
  const formatNumber = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);

  const goToNextHistoryPage = () => {
    if (!history?.nextCursor) return;

    setCursorHistory((previousCursors) => [...previousCursors, cursor]);
    setCursor(history.nextCursor);
  };

  const goToPreviousHistoryPage = () => {
    if (cursorHistory.length === 0) return;

    const previousCursor = cursorHistory[cursorHistory.length - 1] ?? null;
    setCursorHistory((previousCursors) => previousCursors.slice(0, -1));
    setCursor(previousCursor);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-5 sm:p-7 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-teal-300 uppercase">
            Connections
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Integrations
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Monitor your connected MetaTrader account and review completed
            trades.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium shadow-sm ${statusColor}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${statusDotColor} ${snapshotStatus === 'Live' ? 'animate-pulse' : ''}`}
          />
          {snapshotStatus}
        </span>
      </div>

      <section className="rounded-2xl border border-slate-800/90 bg-linear-to-br from-[#141c27] to-[#10151d] p-5 shadow-xl shadow-black/10 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
              Connected account
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              MetaTrader 5
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              MT5 server <span className="px-1 text-slate-600">/</span>{' '}
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
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {snapshotQuery.isPending
            ? Array.from({ length: 8 }, (_, index) => (
                <div
                  key={`account-skeleton-${index}`}
                  aria-hidden="true"
                  className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4 transition-colors hover:border-slate-700"
                >
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-700" />
                  <div className="mt-3 h-6 w-32 animate-pulse rounded bg-slate-800" />
                </div>
              ))
            : accountMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4 transition-colors hover:border-slate-700"
                >
                  <p className="text-sm text-slate-400">{metric.label}</p>
                  <p
                    className="mt-2 truncate text-xl font-medium tabular-nums text-slate-100"
                    title={String(metric.value)}
                  >
                    {typeof metric.value === 'number'
                      ? formatNumber(metric.value)
                      : metric.value}
                  </p>
                </div>
              ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800/90 bg-[#111720] p-5 shadow-lg shadow-black/10 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-teal-300 uppercase">
              Performance
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              Account metrics
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {metrics
                ? `Across all ${metrics.totalPositions} positions matching the applied filters.`
                : 'Metrics use the full filtered history, not only the visible table page.'}
            </p>
          </div>
          {historicalPositionsQuery.isFetching && (
            <span className="text-xs text-slate-500">Updating metrics…</span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Completed positions"
            value={metrics ? formatNumber(metrics.totalPositions) : '—'}
            detail={
              metrics
                ? `${metrics.winningPositions} wins · ${metrics.losingPositions} losses · ${metrics.breakevenPositions} breakeven`
                : 'Waiting for history'
            }
          />
          <MetricCard
            label="Win rate"
            value={metrics?.winRatePct == null ? '—' : `${metrics.winRatePct.toFixed(1)}%`}
            detail="Breakeven positions are excluded"
          />
          <MetricCard
            label="Total trade P&L"
            value={metrics ? formatCurrency(metrics.totalProfit) : '—'}
            valueClassName={
              metrics && metrics.totalProfit < 0
                ? 'text-rose-300'
                : metrics && metrics.totalProfit > 0
                  ? 'text-emerald-300'
                  : undefined
            }
            detail="Sum of completed-position profit"
          />
          <MetricCard
            label="Profit factor"
            value={metrics?.profitFactor == null ? '—' : metrics.profitFactor.toFixed(2)}
            detail="Winning profit ÷ absolute losing profit"
          />
          <MetricCard
            label="Average win"
            value={metrics?.averageWin == null ? '—' : formatCurrency(metrics.averageWin)}
            valueClassName="text-emerald-300"
            detail={`${metrics?.winningPositions ?? 0} profitable positions`}
          />
          <MetricCard
            label="Average loss"
            value={metrics?.averageLoss == null ? '—' : formatCurrency(metrics.averageLoss)}
            valueClassName="text-rose-300"
            detail={`${metrics?.losingPositions ?? 0} loss-making positions`}
          />
        </div>

        {historicalPositionsQuery.isPending ? (
          <div className="grid gap-4 xl:grid-cols-2" aria-label="Loading performance charts">
            {[0, 1].map((chart) => (
              <div
                key={chart}
                className="h-80 animate-pulse rounded-xl border border-slate-800 bg-slate-950/35"
              />
            ))}
          </div>
        ) : historicalPositionsQuery.isError ? (
          <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 px-5 py-8 text-center text-sm text-rose-200">
            Performance charts are unavailable because history could not be loaded.
          </div>
        ) : (
          <HistoryPerformanceCharts
            dailyPerformance={history?.dailyPerformance ?? []}
            currency={currency}
          />
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#111720] shadow-lg shadow-black/10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Open positions
            </h2>
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
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="border-y border-slate-800 bg-slate-950/55 text-xs uppercase tracking-wide text-slate-500">
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
                  <tr
                    key={position.ticket}
                    className="transition-colors hover:bg-slate-900/60"
                  >
                    <td className="px-5 py-4 sm:px-6">
                      <span className="font-medium text-slate-100">
                        {position.symbol}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Ticket {position.ticket}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${position.side === 'buy' ? 'border-emerald-900/80 bg-emerald-950/40 text-emerald-300' : 'border-rose-900/80 bg-rose-950/30 text-rose-300'}`}
                      >
                        {position.side}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">
                      {formatNumber(position.volume)}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">
                      {formatNumber(position.priceOpen)}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">
                      {formatNumber(position.priceCurrent)}
                    </td>
                    <td
                      className={`px-4 py-4 text-right font-medium tabular-nums ${position.profit > 0 ? 'text-emerald-300' : position.profit < 0 ? 'text-rose-300' : 'text-slate-400'}`}
                    >
                      {formatNumber(position.profit)}
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
      <section className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#111720] shadow-lg shadow-black/10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Completed positions
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {historicalPositionsQuery.isPending
                ? 'Loading history...'
                : `${history?.metrics.totalPositions ?? 0} matching ${history?.metrics.totalPositions === 1 ? 'position' : 'positions'} · showing ${history?.positions.length ?? 0} on this page`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-slate-500">
              {historicalPositionsQuery.isPending
                ? 'Checking sync time...'
                : history?.historySyncedAt
                  ? `Synced ${new Date(history.historySyncedAt).toLocaleString()}`
                  : 'Not synced yet'}
            </p>
            <button
              type="button"
              onClick={() => historicalPositionsQuery.refetch()}
              disabled={historicalPositionsQuery.isFetching}
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-teal-700 hover:text-teal-200 disabled:cursor-wait disabled:opacity-60"
            >
              {historicalPositionsQuery.isFetching
                ? 'Refreshing...'
                : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="border-b border-slate-800 bg-slate-950/25 px-5 py-5 sm:px-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-200">
              Filter history
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Combine filters, then apply to update the results.
            </p>
          </div>
          <form
            className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 xl:grid-cols-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (hasPartialDateRange) return;
              setCursor(null);
              setCursorHistory([]);
              setAppliedFilters({
                fromDate,
                toDate,
                symbol: symbol.trim(),
                magicNumber: magicNumber.trim(),
                direction,
                outcome,
              });
            }}
          >
            <label className="text-xs text-slate-400">
              <span className="mb-1 block">From</span>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/50"
              />
            </label>

            <label className="text-xs text-slate-400">
              <span className="mb-1 block">To</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/50"
              />
            </label>

            <label className="text-xs text-slate-400">
              <span className="mb-1 block">Symbol</span>
              <select
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/50"
              >
                <option value="">Any</option>
                <option value="XAUUSD">XAUUSD</option>
                <option value="XAGUSD">XAGUSD</option>
                <option value="GBPJPY">GBPJPY</option>
                <option value="EURUSD">EURUSD</option>
                <option value="USDCHF">USDCHF</option>
              </select>
            </label>

            <label className="text-xs text-slate-400">
              <span className="mb-1 block">Magic number</span>
              <input
                type="number"
                step="1"
                value={magicNumber}
                onChange={(event) => setMagicNumber(event.target.value)}
                placeholder="Any"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-teal-600 focus:ring-2 focus:ring-teal-900/50"
              />
            </label>

            <label className="text-xs text-slate-400">
              <span className="mb-1 block">Side</span>
              <select
                value={direction}
                onChange={(event) => setDirection(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/50"
              >
                <option value="">Any</option>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </label>

            <label className="text-xs text-slate-400">
              <span className="mb-1 block">Outcome</span>
              <select
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/50"
              >
                <option value="">Any</option>
                <option value="profit">Profit</option>
                <option value="loss">Loss</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={hasPartialDateRange}
              className="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply filters
            </button>

            <button
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setSymbol('');
                setMagicNumber('');
                setDirection('');
                setOutcome('');
                setCursor(null);
                setCursorHistory([]);
                setAppliedFilters({
                  fromDate: '',
                  toDate: '',
                  symbol: '',
                  magicNumber: '',
                  direction: '',
                  outcome: '',
                });
              }}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-900"
            >
              Clear filters
            </button>
            {hasPartialDateRange && (
              <p className="col-span-full text-xs text-amber-300" role="alert">
                Choose both dates, or clear both, to apply the date range.
              </p>
            )}
          </form>
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
            <p className="text-sm text-red-200">
              Could not load completed positions.
            </p>
            <button
              type="button"
              onClick={() => historicalPositionsQuery.refetch()}
              className="mt-3 text-sm text-teal-300 hover:text-teal-200"
            >
              Try again
            </button>
          </div>
        ) : history && history.positions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
            <table className="w-full min-w-300 text-left text-sm">
              <thead className="border-y border-slate-800 bg-slate-950/55 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium sm:px-6">Opened</th>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Side</th>
                  <th className="px-4 py-3 text-right font-medium">Volume</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Open price
                  </th>
                  <th className="px-4 py-3 font-medium">Closed</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Close price
                  </th>
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
                  <tr
                    key={position.positionId}
                    className="transition-colors hover:bg-slate-900/50"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400 sm:px-6">
                      {new Date(position.openedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-100">
                      {position.symbol}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${position.side === 'buy' ? 'border-emerald-900/80 bg-emerald-950/40 text-emerald-300' : 'border-rose-900/80 bg-rose-950/30 text-rose-300'}`}
                      >
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
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">
                      {formatNumber(position.closedPrice)}
                    </td>
                    <td
                      className={`px-4 py-4 text-right font-medium tabular-nums ${position.grossProfit > 0 ? 'text-emerald-300' : position.grossProfit < 0 ? 'text-rose-300' : 'text-slate-400'}`}
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
            <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={goToPreviousHistoryPage}
              disabled={cursorHistory.length === 0 || historicalPositionsQuery.isFetching}
              className="rounded-lg border border-slate-700 px-3.5 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {cursorHistory.length + 1}
            </span>
            <button
              type="button"
              onClick={goToNextHistoryPage}
              disabled={!history.hasMore || historicalPositionsQuery.isFetching}
              className="rounded-lg border border-slate-700 px-3.5 py-2 text-sm text-slate-300 transition hover:border-teal-700 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
            </div>
          </>
        ) : (
          <p className="px-6 py-12 text-center text-sm text-slate-400">
            No completed positions are available yet.
          </p>
        )}
      </section>
    </main>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  valueClassName?: string;
};

function MetricCard({
  label,
  value,
  detail,
  valueClassName,
}: MetricCardProps) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-800/90 bg-slate-950/45 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 truncate text-2xl font-semibold tabular-nums ${valueClassName ?? 'text-slate-100'}`}
        title={value}
      >
        {value}
      </p>
      <p className="mt-2 truncate text-xs text-slate-500" title={detail}>
        {detail}
      </p>
    </article>
  );
}
