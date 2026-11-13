import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut } from 'lucide-react';
import { Logo } from '../components/SiteLayout';
import { CustomRequest, KEYS, Session, useStored } from '../lib/store';
import { loadDemo, resetData } from '../lib/demo';
import Agenda from './Agenda';
import Solicitudes from './Solicitudes';
import Servicios from './Servicios';
import Horarios from './Horarios';
import Clientas from './Clientas';

const TABS = [
  { id: 'agenda', label: 'Agenda', Comp: Agenda },
  { id: 'solicitudes', label: 'Solicitudes', Comp: Solicitudes },
  { id: 'servicios', label: 'Servicios', Comp: Servicios },
  { id: 'horarios', label: 'Horarios', Comp: Horarios },
  { id: 'clientas', label: 'Clientas', Comp: Clientas },
] as const;

type TabId = (typeof TABS)[number]['id'];

const tabFromHash = (): TabId => {
  const h = window.location.hash.replace('#', '');
  return (TABS.find((t) => t.id === h)?.id ?? 'agenda') as TabId;
};

/**
 * Flujo de acceso (provisional, sin backend):
 * 1. Sin sesión → "Acceso del salón" + Iniciar sesión.
 * 2. Con sesión pero sin dueña registrada → "Configura tu salón".
 * 3. Dueña → panel con pestañas.
 *
 * TODO backend: reemplazar el login simulado por autenticación real
 * (p. ej. Google o correo + enlace mágico).
 */
export default function Panel() {
  const [session, setSession] = useStored<Session>(KEYS.session, null);
  const [ownerEmail, setOwnerEmail] = useStored<string | null>(KEYS.ownerEmail, null);
  const [requests] = useStored<CustomRequest[]>(KEYS.requests, []);
  const [tab, setTabState] = useState<TabId>(tabFromHash);

  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setTab = (id: TabId) => {
    history.replaceState(null, '', `#${id}`);
    setTabState(id);
  };

  const login = () => setSession({ email: 'duena@velore.local' });
  const logout = () => setSession(null);

  const isOwner = !!session && ownerEmail === session.email;
  const pendingCount = requests.filter((r) => r.status === 'pendiente').length;
  const Current = TABS.find((t) => t.id === tab)!.Comp;

  return (
    <>
      <header className="panel-header">
        <div className="container">
          <Link to="/" aria-label="Ir al sitio público">
            <Logo suffix="Panel" />
          </Link>
          {session ? (
            <button className="btn btn--link" onClick={logout}>
              <LogOut aria-hidden /> Salir
            </button>
          ) : (
            <button className="btn btn--link" onClick={login}>
              <LogIn aria-hidden /> Iniciar sesión
            </button>
          )}
        </div>
      </header>

      {!session && (
        <div className="panel-center container">
          <h1>Acceso del salón</h1>
          <p>Inicia sesión para ver la agenda y administrar el salón.</p>
          <button className="btn btn--gold" onClick={login}>
            <LogIn aria-hidden /> Iniciar sesión
          </button>
        </div>
      )}

      {session && !ownerEmail && (
        <div className="panel-center container">
          <h1>Configura tu salón</h1>
          <p>Eres la primera persona en entrar. Al continuar, esta cuenta será la dueña del salón.</p>
          <button className="btn btn--gold" onClick={() => setOwnerEmail(session.email)}>
            Soy la dueña, continuar
          </button>
        </div>
      )}

      {session && ownerEmail && !isOwner && (
        <div className="panel-center container">
          <h1>Sin acceso</h1>
          <p>Esta cuenta no tiene permiso para administrar el salón.</p>
        </div>
      )}

      {isOwner && (
        <>
          <nav className="panel-tabs" aria-label="Secciones del panel">
            <div className="container">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={tab === t.id ? 'active' : ''}
                  aria-current={tab === t.id ? 'page' : undefined}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                  {t.id === 'solicitudes' && pendingCount > 0 && (
                    <span className="tab-badge" aria-label={`${pendingCount} pendientes`}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>
          <main className="panel-body">
            <div className="container">
              <Current />
            </div>
          </main>

          {import.meta.env.DEV && (
            <div className="dev-bar container">
              Solo en desarrollo:
              <button className="btn btn--link" onClick={loadDemo}>
                Cargar datos de ejemplo
              </button>
              <button className="btn btn--link" onClick={resetData}>
                Borrar datos
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
