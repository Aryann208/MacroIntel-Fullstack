import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/providers';
import { DashboardShell } from '../components/dashboard-shell';
export const metadata: Metadata = {
  title: 'MacroIntel | Overview',
  description:
    'Track US economic indicators, release dates, and your watchlist.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <DashboardShell>{children}</DashboardShell>
        </Providers>
      </body>
    </html>
  );
}
