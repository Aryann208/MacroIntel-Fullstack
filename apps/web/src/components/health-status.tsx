'use client';

import { useHealthQuery } from '../lib/use-health-query';

export function HealthStatus() {
  const query = useHealthQuery();

  if (query.isPending) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-400">
        Connecting to API…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm">
        <span className="text-amber-300">
          API unavailable. Check the API process on port 4000.
        </span>
        <button
          className="text-teal-300 underline"
          onClick={() => void query.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-teal-300">
      API operational{' '}
      <span className="text-slate-400">
        · {query.data.service} · v{query.data.version}
      </span>
    </div>
  );
}
