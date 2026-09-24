import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'HRIS', template: '%s | HRIS' },
  description: 'Human resources information system',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
