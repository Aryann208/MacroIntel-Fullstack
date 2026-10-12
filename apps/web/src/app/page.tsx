import { UpcomingEvents } from '../components/upcoming-event';
import { Watchlist } from '../components/watchlist';
import { LatestMacroObservation } from '../components/latest-macro-observation';

export default function Overview() {
  return (
    <main className="mx-auto max-w-6xl space-y-7 p-6 lg:p-10">
          <div>
            <p className="text-xs tracking-widest text-teal-300 uppercase">
              Macro research
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Overview</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Track US economic indicators, recent observations, upcoming
              release dates, and the series you follow.
            </p>
          </div>
          <section className="rounded-xl border border-slate-800 bg-[#111720] p-5 sm:p-6">
            <h2 className="text-lg font-medium">Latest observations</h2>
            <LatestMacroObservation />
          </section>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-800 bg-[#111720] p-6">
              <h2 className="text-lg font-medium">Watchlist</h2>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Save indicators to follow their latest stored observations.
              </p>
              <Watchlist />
            </section>
            <section className="rounded-xl border border-slate-800 bg-[#111720] p-6">
              <h2 className="text-lg font-medium">Upcoming events</h2>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Published release dates for tracked indicators. FRED lists dates
                here, not exact release times.
              </p>
              <UpcomingEvents />
            </section>
          </div>
          <p className="text-xs text-slate-500">
            Macro observations and release dates are sourced from FRED. Data
            reflects the most recent import.
          </p>
    </main>
  );
}
