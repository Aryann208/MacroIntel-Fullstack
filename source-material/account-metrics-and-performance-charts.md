# Account metrics and performance charts

This guide explains the account metrics section on the Integrations page: what the numbers mean, where they are calculated, and why cursor pagination does not make those numbers page-specific.

## What the page shows

The page has two kinds of account information:

- **Live account values** such as balance, equity, margin, and free margin come from the latest MT5 snapshot. They describe the account now. A historical date or trade filter does not change them.
- **Historical performance metrics** come from completed positions reconstructed from MT5 deals. They use the selected history filters and describe the matching completed positions.

Keeping these separate matters. For example, filtering history to XAUUSD buy positions should change the historical win rate and P&L, but it should not change the broker's current account balance.

## Data flow

```text
MT5 deals saved in MongoDB
        |
        v
API groups deals by positionId and builds completed positions
        |
        v
Apply date, symbol, magic number, side, and outcome filters
        |
        +----> Calculate metrics over every matching position
        +----> Group profit by UTC close date and build chart series
        |
        v
Apply the cursor and return one table page plus the full-result metrics
        |
        v
Zod validates the response -> React Query loads it -> page renders cards/charts/table
```

The cursor is only for choosing which rows appear in the table response. Metrics and chart data are calculated before cursor slicing, so page 1 and page 2 show the same totals for the same filters.

## Metric definitions

For each matching position, `grossProfit` is the sum of its stored deal `profit` values.

```text
winner:    grossProfit > 0
loser:     grossProfit < 0
breakeven: grossProfit = 0

win rate = winners / (winners + losers) * 100
profit factor = sum(winner profit) / absolute(sum(loser profit))
average win = sum(winner profit) / winners
average loss = sum(loser profit) / losers
total trade P&L = sum(grossProfit for every matching position)
```

Breakeven positions are excluded from the win-rate denominator. If there are no wins or losses, win rate is `null` and the UI displays `—`. Profit factor is also `null` when there is no loss amount to divide by. Average win or average loss is `null` when that outcome has no positions.

Filters apply before these calculations. Therefore, if the user selects `outcome=profit`, all positions in that filtered set are winners and its win rate is 100% (or `—` if the set is empty). To compare wins with losses, clear the outcome filter.

## Chart definitions

The API groups matching positions by the UTC calendar date of `closedAt`:

- `profit` is the sum of position P&L closed on that UTC day.
- `cumulativeProfit` is the running sum of those daily values in ascending date order.

The **Daily trade P&L** bar chart displays `profit`. The **Cumulative trade P&L** area chart displays `cumulativeProfit`. A position belongs to the day it closed, because that is when the completed result became known.

The charts use Recharts. `ResponsiveContainer` needs a parent with a real height (the page gives it a 16rem chart area). The chart receives already-grouped points from the API; it does not recalculate position outcomes in the browser.

## Files and responsibilities

- `apps/api/src/modules/integrations/integrations.route.ts` reconstructs positions, applies filters, calculates full-filter metrics and daily performance, then cursor-slices the table rows.
- `packages/contracts/src/trading.ts` defines the Zod shapes for metrics, daily chart points, and the complete history response. This is runtime response validation, not just TypeScript checking.
- `apps/web/src/lib/api.ts` makes the HTTP request and parses the response with the shared contract.
- `apps/web/src/components/use-fetch-historical-positions.tsx` keys the React Query cache by account, filters, and cursor, and refreshes history periodically.
- `apps/web/src/app/integrations/page.tsx` renders live snapshot values, metric cards, loading/error/empty states, charts, and the cursor-paginated table.
- `apps/web/src/components/history-performance-charts.tsx` renders the daily bars and cumulative area chart with Recharts.

## Scope and current limitation

This implementation keeps position reconstruction and filtering in the API route, matching the current project scale and existing code. The route currently loads an account's deals and builds the complete position set in application memory for each history request. Cursor pagination limits the table payload, but does not yet limit the MongoDB read or that in-memory calculation. That is acceptable for the current demo-sized history; if account histories grow substantially, move the reconstruction/filtering/aggregation closer to MongoDB before adding more layers.

The deal contract stores a `profit` value but not separate commission, swap, or fee fields. These charts and totals therefore represent the stored deal-profit sum; they should not be described as a complete net account ledger until those costs are captured and included.
