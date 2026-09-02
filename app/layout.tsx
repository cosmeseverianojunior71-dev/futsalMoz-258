import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'FutsalMoz 258 — Gestão de Campeonato de Futsal',
    template: '%s | FutsalMoz 258',
  },
  description:
    'Plataforma de gestão de campeonato de futsal: classificação, calendário, resultados, estatísticas, melhor marcador e guarda-redes menos batido. +258',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#022c22',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
