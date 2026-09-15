import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/providers';
export const metadata: Metadata = {
  title: 'MacroIntel | Overview',
  description: 'Macro research workspace foundation',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
