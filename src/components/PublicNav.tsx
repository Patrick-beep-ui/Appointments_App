'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PublicNav() {
  const pathname = usePathname();
  return (
    <nav className="site-nav">
      {[{ href: '/', label: 'Inicio' }, { href: '/reservar', label: 'Reservar' }].map(({ href, label }) => {
        const active = href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>{label}</Link>;
      })}
    </nav>
  );
}
