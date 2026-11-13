import { useState } from 'react';
import { CalendarPlus, Inbox, MessageCircle } from 'lucide-react';
import { ARTISTS } from '../lib/config';
import { fmtDateLong, fmtDateShort, todayISO } from '../lib/dates';
import { setRequestStatus, waLink } from '../lib/actions';
import { CustomRequest, KEYS, useStored } from '../lib/store';
import AppointmentForm from './AppointmentForm';

const TIME_LABEL: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde' };
const STATUS_LABEL: Record<CustomRequest['status'], string> = {
  pendiente: 'Pendiente',
  agendada: 'Agendada',
  descartada: 'Descartada',
};

export default function Solicitudes() {
  const [requests] = useStored<CustomRequest[]>(KEYS.requests, []);
  const [scheduling, setScheduling] = useState<CustomRequest | null>(null);
  const [showPast, setShowPast] = useState(false);

  const pending = requests.filter((r) => r.status === 'pendiente');
  const past = requests.filter((r) => r.status !== 'pendiente');

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Solicitudes</p>
          <h1>Servicios personalizados</h1>
          <p className="page-sub">Escribe a la clienta por WhatsApp, acuerden precio y hora, y agéndala.</p>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">
            <Inbox aria-hidden />
          </span>
          <h3>No hay solicitudes pendientes</h3>
          <p style={{ maxWidth: 'none' }}>Cuando una clienta pida un servicio especial, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="req-list">
          {pending.map((r) => (
            <RequestCard key={r.id} r={r} onSchedule={() => setScheduling(r)} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <button className="btn btn--link muted-link" onClick={() => setShowPast(!showPast)}>
            {showPast ? 'Ocultar anteriores' : `Ver anteriores (${past.length})`}
          </button>
          {showPast && (
            <div className="req-list" style={{ marginTop: 12 }}>
              {past.map((r) => (
                <RequestCard key={r.id} r={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {scheduling && (
        <AppointmentForm
          source="solicitud"
          prefill={{
            clientName: scheduling.clientName,
            whatsapp: scheduling.whatsapp,
            email: scheduling.email,
            customName: scheduling.description,
            artistId: scheduling.artistId,
            date: scheduling.date && scheduling.date >= todayISO() ? scheduling.date : undefined,
          }}
          onClose={() => setScheduling(null)}
          onSaved={(a) => setRequestStatus(scheduling.id, 'agendada', a.id)}
        />
      )}
    </>
  );
}

function RequestCard({ r, onSchedule }: { r: CustomRequest; onSchedule?: () => void }) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const artist = ARTISTS.find((a) => a.id === r.artistId)?.name ?? 'Cualquiera';
  const msg = `Hola ${r.clientName.split(' ')[0]}, te escribimos de Velore Salon por tu solicitud: "${r.description}".`;
  const isPending = r.status === 'pendiente';

  return (
    <article className={`req${isPending ? '' : ' req--past'}`}>
      <div>
        <div className="req-top">
          <h3>{r.clientName}</h3>
          {!isPending && <span className={`pill pill--${r.status}`}>{STATUS_LABEL[r.status]}</span>}
        </div>
        <p className="req-desc">{r.description}</p>
        <div className="req-meta">
          <span>WhatsApp: {r.whatsapp.replace(/(\d{4})(\d{4})/, '$1 $2')}</span>
          {r.email && <span>{r.email}</span>}
          <span>Artista: {artist}</span>
          {r.date && <span>Día: {fmtDateLong(r.date)}</span>}
          {r.timeOfDay && <span>Horario: {TIME_LABEL[r.timeOfDay]}</span>}
          <span>Recibida: {fmtDateShort(r.createdAt.slice(0, 10))}</span>
        </div>
      </div>
      {isPending && (
        <div className="req-actions">
          <a className="btn btn--ghost" href={waLink(r.whatsapp, msg)} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden /> Escribir
          </a>
          <button className="btn btn--gold" onClick={onSchedule}>
            <CalendarPlus aria-hidden /> Agendar
          </button>
          {confirmDiscard ? (
            <span className="req-confirm">
              ¿Descartar?
              <button className="btn btn--link" onClick={() => setRequestStatus(r.id, 'descartada')}>
                Sí
              </button>
              <button className="btn btn--link muted-link" onClick={() => setConfirmDiscard(false)}>
                No
              </button>
            </span>
          ) : (
            <button className="btn btn--link muted-link" onClick={() => setConfirmDiscard(true)}>
              Descartar
            </button>
          )}
        </div>
      )}
    </article>
  );
}
