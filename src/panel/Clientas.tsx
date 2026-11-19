import { useMemo, useState } from 'react';
import { ChevronDown, MessageCircle, Search, Users } from 'lucide-react';
import { ARTISTS } from '../lib/config';
import { fmtDateShort, fmtTime, todayISO } from '../lib/dates';
import { waLink } from '../lib/actions';
import { Appointment, Client, KEYS, useStored } from '../lib/store';
import { STATUS_LABEL } from './AppointmentDetail';

export default function Clientas() {
  const [clients] = useStored<Client[]>(KEYS.clients, []);
  const [appointments] = useStored<Appointment[]>(KEYS.appointments, []);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const today = todayISO();
    const term = q.trim().toLowerCase();
    return clients
      .filter((c) => !term || c.name.toLowerCase().includes(term) || c.whatsapp.includes(term.replace(/\D/g, '') || '§'))
      .map((c) => {
        const history = appointments
          .filter((a) => a.clientId === c.id)
          .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
        const visits = history.filter((a) => a.status === 'asistio');
        const noShows = history.filter((a) => a.status === 'no_vino').length;
        const next = [...history].reverse().find((a) => a.status === 'confirmada' && a.date >= today);
        return { c, history, visits: visits.length, last: visits[0]?.date, noShows, next };
      })
      .sort((a, b) => a.c.name.localeCompare(b.c.name, 'es'));
  }, [clients, appointments, q]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Clientas</p>
          <h1>Tus clientas</h1>
          <p className="page-sub">Se agregan solas cuando alguien reserva o envía una solicitud.</p>
        </div>
        {clients.length > 0 && (
          <div className="search">
            <Search aria-hidden />
            <input
              className="input"
              placeholder="Buscar por nombre o WhatsApp"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar clienta"
            />
          </div>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">
            <Users aria-hidden />
          </span>
          <h3>Aún no hay clientas</h3>
          <p style={{ maxWidth: 'none' }}>Aparecerán aquí con su historial de citas.</p>
        </div>
      ) : rows.length === 0 ? (
        <p className="muted" style={{ fontSize: 14 }}>
          No se encontró ninguna clienta con &quot;{q}&quot;.
        </p>
      ) : (
        <div className="card">
          {rows.map(({ c, history, visits, last, noShows, next }) => {
            const isOpen = open === c.id;
            return (
              <div className="client" key={c.id}>
                <button className="client-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)}>
                  <span className="client-name">
                    <strong>{c.name}</strong>
                    <small>{c.whatsapp.replace(/(\d{4})(\d{4})/, '$1 $2')}</small>
                  </span>
                  <span className="client-stat">
                    {visits} visita{visits === 1 ? '' : 's'}
                    {noShows > 0 && <em> · {noShows} no vino</em>}
                  </span>
                  <span className="client-stat">
                    {next ? `Próxima: ${fmtDateShort(next.date)}` : last ? `Última: ${fmtDateShort(last)}` : '—'}
                  </span>
                  <ChevronDown aria-hidden className={isOpen ? 'rot' : ''} />
                </button>
                {isOpen && (
                  <div className="client-detail">
                    <a
                      className="btn btn--ghost"
                      href={waLink(c.whatsapp, `Hola ${c.name.split(' ')[0]}, te saludamos de Velore Salon.`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle aria-hidden /> Escribir por WhatsApp
                    </a>
                    {c.email && <span className="muted"> {c.email}</span>}
                    {history.length === 0 ? (
                      <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
                        Sin citas todavía.
                      </p>
                    ) : (
                      <ul className="history">
                        {history.map((a) => (
                          <li key={a.id}>
                            <span>{fmtDateShort(a.date)}</span>
                            <span>{fmtTime(a.start)}</span>
                            <span>{a.serviceName}</span>
                            <span>{ARTISTS.find((x) => x.id === a.artistId)?.name}</span>
                            <span className={`pill pill--${a.status}`}>{STATUS_LABEL[a.status]}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
