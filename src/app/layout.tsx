import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles.css';

export const metadata: Metadata = {
  title: 'Velore Salon · Diriamba',
  description: 'Reserva tu cita en Velore Salon, Diriamba, Carazo.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preserve the prototype's font loading without build-time network access. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body><div className="app-root">{children}</div></body>
    </html>
  );
}
