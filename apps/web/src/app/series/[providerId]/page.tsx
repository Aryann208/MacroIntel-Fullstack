import Link from 'next/link';
import { MacroSeriesDetails } from '../../../components/macro-series-details';

interface PageProps {
  params: Promise<{ providerId: string }>;
}
export default async function SeriesPage({ params }: PageProps) {
  const providerSeriesId = (await params).providerId;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <nav aria-label="Page navigation" className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-teal-700 hover:text-teal-300"
        >
          ← Back to overview
        </Link>
        <Link
          href="/series"
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-teal-700 hover:text-teal-300"
        >
          Browse indicators
        </Link>
      </nav>
      <header className="mt-8">
        <p className="text-xs font-medium tracking-widest text-teal-300 uppercase">
          MacroIntel / Indicator details
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Series details
        </h1>
        <p className="mt-2 font-mono text-sm text-slate-500">
          {providerSeriesId}
        </p>
      </header>
      <div className="mt-6">
        <MacroSeriesDetails providerSeriesId={providerSeriesId} />
      </div>
    </main>
  );
}
