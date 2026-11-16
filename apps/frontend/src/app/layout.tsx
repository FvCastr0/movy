import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MOVY | SDR Lead Engine & Sales Platform',
  description: 'Painel comercial e motor de qualificação de leads para assessoria em delivery MOVY.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-surface-canvas text-text-primary antialiased selection:bg-brand selection:text-white">
        {children}
      </body>
    </html>
  );
}
