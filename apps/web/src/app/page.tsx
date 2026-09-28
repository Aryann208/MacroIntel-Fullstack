import Link from 'next/link';
import { HealthStatus } from '../components/health-status';
import { UpcomingEvents } from '../components/upcoming-event';
import { AuthPanel } from '../components/auth-panel';
import { Watchlist } from '../components/watchlist';
import { LatestMacroObservation } from '../components/latest-macro-observation';

const sections = [
  {
    title: 'Watchlist',
    badge: 'Personal watchlist',
    description: 'Forex, gold and index instruments will appear here.',
    sample: 'Sample data: EUR/USD, XAU/USD, S&P 500',
  },
  {
    title: 'Upcoming Events',
    badge: 'FRED release dates',

    description:
      'Published release dates for the indicators tracked here. Exact release times are not provided.',
    sample: 'Sample data: Central bank decision, inflation release',
  },
  {
    title: 'Daily Brief',
    badge: 'Placeholder',

    description: 'Your daily macro research summary will live here.',
    sample: 'Sample data: Brief placeholder. No AI summary has been generated.',
  },
];

export default function Overview() {
  return (
    <div className="min-h-screen md:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-slate-900 focus:p-4"
      >
        Skip to content
      </a>
      <aside className="border-b border-slate-800 bg-[#111720] p-5 md:min-h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="text-xl font-semibold tracking-tight">
          Macro<span className="text-teal-300">Intel</span>
        </div>
        <p className="mt-1 text-xs tracking-widest text-slate-500 uppercase">
          Research terminal
        </p>
        <nav aria-label="Main navigation" className="mt-6">
          <Link
            aria-current="page"
            href="/"
            className="block rounded-lg border border-teal-900 bg-teal-950/40 px-3 py-2 text-sm text-teal-200"
          >
            Overview
          </Link>
          <Link
            href="/series"
            className="mt-2 block rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-teal-300"
          >
            Browse indicators
          </Link>
        </nav>
        <p className="mt-6 text-xs text-slate-500 md:mt-12">
          Day 1 foundation
          <br />
          Local development workspace
        </p>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <span className="text-sm text-slate-400">Workspace / Overview</span>
          <div className="w-full sm:w-auto">
            <AuthPanel />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl space-y-7 p-6 lg:p-10">
          <div>
            <p className="text-xs tracking-widest text-teal-300 uppercase">
              Macro research
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Overview</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              A focused workspace for forex, gold and index research. Macro
              observations and release dates come from FRED. The daily brief
              remains a placeholder.
            </p>
          </div>
          <HealthStatus />
          <section className="rounded-xl border border-slate-800 bg-[#111720] p-5 sm:p-6">
            <h2 className="text-lg font-medium">Latest Macro Data</h2>
            <LatestMacroObservation />
          </section>
          <div className="grid gap-5 lg:grid-cols-2">
            {sections.map((section) => (
              <section
                key={section.title}
                className={
                  'rounded-xl border border-slate-800 bg-[#111720] p-6 ' +
                  (section.title === 'Daily Brief' ? 'lg:col-span-2' : '')
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-medium">{section.title}</h2>
                  <span className="text-xs text-slate-500">
                    {section.badge}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {section.description}
                </p>
                {section.title === 'Watchlist' ? (
                  <Watchlist />
                ) : section.title === 'Upcoming Events' ? (
                  <UpcomingEvents />
                ) : (
                  <p className="mt-6 rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-500 ">
                    {section.sample}
                  </p>
                )}
              </section>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Macro observations and release dates are sourced from FRED. The
            daily brief is currently a placeholder.
          </p>
        </main>
      </div>
    </div>
  );
}
