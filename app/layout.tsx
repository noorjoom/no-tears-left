import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, UnifrakturCook } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const display = UnifrakturCook({
  subsets: ['latin'],
  weight: '700',
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'No Tears Left',
  description: 'Fortnite Zero Build competitive community and tournament platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${display.variable}`}>
      <body className="bg-bg-base text-text-primary font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
