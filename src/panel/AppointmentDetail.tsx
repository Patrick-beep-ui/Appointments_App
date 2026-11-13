import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import Modal from '../components/Modal';
import { ARTISTS } from '../lib/config';
import { cap, fmtDateLong, fmtDuration, fmtPrice, fmtTime } from '../lib/dates';
import { setAppointmentStatus, waLink } from '../lib/actions';
import { Appointment, AppointmentStatus } from '../lib/store';

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmada: 'Confirmada',
  asistio: 'Asistió',
  no_vino: 'No vino',
  cancelada: 'Cancelada',
};

export default function AppointmentDetail({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState('');
  const artist = ARTISTS.find((a) => a.id === appt.artistId)?.name;

  const reminder =
    `Hola ${appt.clientName.split(' ')[0]}, te recordamos tu cita en Velore Salon ` +
    `el ${fmtDateLong(appt.date)} a las ${fmtTime(appt.start)} para ${appt.serviceName}. ¡Te esperamos!`;

  const set = (s: AppointmentStatus) => {
    const res = setAppointmentStatus(appt.id, s);
    if (!res.ok) return setError(res.error);
    onClose();
  };

  return (
    <Modal title={appt.clientName} onClose={onClose}>
      <span className={`pill pill--${appt.status}`}>{STATUS_LABEL[appt.status]}</span>

      <dl className="detail-list">
        <dt>Servicio</dt>
        <dd>{appt.serviceName}</dd>
        <dt>Cuándo</dt>
        <dd>
          {cap(fmtDateLong(appt.date))}, {fmtTime(appt.start)} – {fmtTime(appt.end)}
        </dd>
        <dt>Duración</dt>
        <dd>{fmtDuration(appt.end - appt.start)}</dd>
        <dt>Artista</dt>
        <dd>{artist}</dd>
        {appt.price != null && (
          <>
            <dt>Precio</dt>
            <dd>{fmtPrice(appt.price)}</dd>
          </>
        )}
        <dt>WhatsApp</dt>
        <dd>{appt.whatsapp.replace(/(\d{4})(\d{4})/, '$1 $2')}</dd>
        {appt.notes && (
          <>
            <dt>Notas</dt>
            <dd>{appt.notes}</dd>
          </>
        )}
        <dt>Reservó</dt>
        <dd>{appt.source === 'web' ? 'Desde la página web' : 'Desde el panel'}</dd>
      </dl>

      <a className="btn btn--ghost btn--wide" href={waLink(appt.whatsapp, reminder)} target="_blank" rel="noreferrer">
        <MessageCircle aria-hidden /> Enviar recordatorio por WhatsApp
      </a>

      {error && <p className="form-error" style={{ marginTop: 12 }}>{error}</p>}

      <div className="modal-actions">
        {appt.status === 'confirmada' ? (
          confirmCancel ? (
            <>
              <span className="confirm-q">¿Cancelar esta cita?</span>
              <button className="btn btn--ghost" onClick={() => setConfirmCancel(false)}>
                No
              </button>
              <button className="btn btn--danger" onClick={() => set('cancelada')}>
                Sí, cancelar
              </button>
            </>
          ) : (
            <>
              <button className="btn btn--danger-ghost" onClick={() => setConfirmCancel(true)}>
                Cancelar cita
              </button>
              <span style={{ flex: 1 }} />
              <button className="btn btn--ghost" onClick={() => set('no_vino')}>
                No vino
              </button>
              <button className="btn btn--gold" onClick={() => set('asistio')}>
                Asistió
              </button>
            </>
          )
        ) : (
          <button className="btn btn--ghost" onClick={() => set('confirmada')}>
            Volver a "Confirmada"
          </button>
        )}
      </div>
    </Modal>
  );
}
