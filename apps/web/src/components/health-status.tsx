'use client';
import type { HealthResponse } from '@macrointel/contracts';
import { useHealthQuery } from '../lib/use-health-query';
type HealthState =
  | { state: 'loading' }
  | { state: 'error'; retry: () => void }
  | { state: 'success'; data: HealthResponse };
export function HealthStatusView(props: HealthState) {
  return (
    <div
      className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm"
      role="status"
      aria-live="polite"
    >
      {props.state === 'loading' ? (
        <span className="text-slate-400">Connecting to API…</span>
      ) : props.state === 'error' ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-amber-300">
            API unavailable. Check the API process on port 4000.
          </span>
          <button className="text-teal-300 underline" onClick={props.retry}>
            Retry
          </button>
        </div>
      ) : (
        <span className="text-teal-300">
          API operational{' '}
          <span className="text-slate-400">
            · {props.data.service} · v{props.data.version}
          </span>
        </span>
      )}
    </div>
  );
}
export function HealthStatus() {
  const query = useHealthQuery();
  if (query.isPending) return <HealthStatusView state="loading" />;
  if (query.isError)
    return (
      <HealthStatusView state="error" retry={() => void query.refetch()} />
    );
  return <HealthStatusView state="success" data={query.data} />;
}
