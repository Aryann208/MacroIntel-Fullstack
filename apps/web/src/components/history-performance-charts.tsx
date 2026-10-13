'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DailyPerformancePoint = {
  date: string;
  profit: number;
  cumulativeProfit: number;
};

type HistoryPerformanceChartsProps = {
  dailyPerformance: DailyPerformancePoint[];
  currency: string;
};

export function HistoryPerformanceCharts({
  dailyPerformance,
  currency,
}: HistoryPerformanceChartsProps) {
  const formatAmount = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);

  const formatAxisDate = (value: string) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });

  const formatAxisAmount = (value: number) =>
    new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  if (dailyPerformance.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 px-5 py-12 text-center text-sm text-slate-400">
        No completed positions match these filters yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <article className="rounded-xl border border-slate-800 bg-slate-950/35 p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-slate-200">
            Cumulative trade P&amp;L
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Running total across the matching completed positions.
          </p>
        </div>
        <div className="h-64 w-full" role="img" aria-label="Cumulative trade profit and loss chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyPerformance} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="cumulativeProfitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#263244" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={formatAxisAmount}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                labelFormatter={(label) => formatAxisDate(String(label))}
                formatter={(value) => [formatAmount(Number(value)), 'Cumulative P&L']}
                contentStyle={{ backgroundColor: '#0b111a', borderColor: '#334155', borderRadius: 12 }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="cumulativeProfit"
                stroke="#2dd4bf"
                strokeWidth={2}
                fill="url(#cumulativeProfitFill)"
                activeDot={{ r: 4, fill: '#99f6e4', stroke: '#0f766e' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border border-slate-800 bg-slate-950/35 p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-slate-200">Daily trade P&amp;L</h3>
          <p className="mt-1 text-xs text-slate-500">
            Profit or loss grouped by the position close date.
          </p>
        </div>
        <div className="h-64 w-full" role="img" aria-label="Daily trade profit and loss chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyPerformance} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#263244" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={formatAxisAmount}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                labelFormatter={(label) => formatAxisDate(String(label))}
                formatter={(value) => [formatAmount(Number(value)), 'Daily P&L']}
                contentStyle={{ backgroundColor: '#0b111a', borderColor: '#334155', borderRadius: 12 }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <ReferenceLine y={0} stroke="#64748b" />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {dailyPerformance.map((point) => (
                  <Cell
                    key={point.date}
                    fill={point.profit >= 0 ? '#2dd4bf' : '#fb7185'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}
