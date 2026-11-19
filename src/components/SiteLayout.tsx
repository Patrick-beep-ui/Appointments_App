import type { ReactNode } from 'react';
import Link from 'next/link';
import { SALON } from '../lib/config';
import { Logo } from './Logo';
import PublicNav from './PublicNav';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link href="/" aria-label="Velore Salon, inicio">
            <Logo />
          </Link>
          <PublicNav />
        </div>
      </header>

      <main className="site-main">
        {children}
      </main>

      <footer className="site-footer">
        <div className="container">
          <span>
            © {SALON.year} {SALON.name} Salon · {SALON.location}
          </span>
          <Link href="/panel">Acceso del salón</Link>
        </div>
      </footer>
    </>
  );
}
