import { Link, NavLink, Outlet } from 'react-router-dom';
import { SALON } from '../lib/config';

export function Logo({ suffix = 'Salon' }: { suffix?: string }) {
  return (
    <span className="logo">
      {SALON.name} <em>{suffix}</em>
    </span>
  );
}

export default function SiteLayout() {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link to="/" aria-label="Velore Salon, inicio">
            <Logo />
          </Link>
          <nav className="site-nav">
            <NavLink to="/" end>
              Inicio
            </NavLink>
            <NavLink to="/reservar">Reservar</NavLink>
          </nav>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <span>
            © {SALON.year} {SALON.name} Salon · {SALON.location}
          </span>
          <Link to="/panel">Acceso del salón</Link>
        </div>
      </footer>
    </>
  );
}
