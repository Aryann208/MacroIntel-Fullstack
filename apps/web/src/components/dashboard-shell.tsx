'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AuthPanel } from './auth-panel';

const navigationItems = [
  { label: 'Overview', href: '/' },
  { label: 'Browse indicators', href: '/series' },
  { label: 'Integrations', href: '/integrations' },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen md:flex">
      <a
        href="#main-content"
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
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  isActive
                    ? 'border border-teal-900 bg-teal-950/40 text-teal-200'
                    : 'text-slate-300 hover:text-teal-300'
                } ${item.href === '/' ? '' : 'mt-2'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <span className="text-sm text-slate-400">MacroIntel workspace</span>
          <div className="w-full sm:w-auto">
            <AuthPanel />
          </div>
        </header>
        <div id="main-content">{children}</div>
      </div>
    </div>
  );
}
