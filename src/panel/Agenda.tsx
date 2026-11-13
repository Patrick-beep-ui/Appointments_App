import { MouseEvent, useMemo, useState } from 'react';
import { CalendarOff, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { ARTISTS } from '../lib/config';
import { addDays, fmtDateLong, fmtTime, nowMin, todayISO } from '../lib/dates';
import { timeOffFor, workingHours } from '../lib/availability';
import { removeBlock } from '../lib/actions';
import { Appointment, Block, KEYS, useDataVersion, useStored } from '../lib/store';
import Modal from '../components/Modal';
import AppointmentForm, { AppointmentPrefill } from './AppointmentForm';
import AppointmentDetail from './AppointmentDetail';
import BlockForm from './BlockForm';

const PX_PER_MIN = 1.1; // alto de la agenda: 1 h ≈ 66 px

export default function Agenda() {
  const [day, setDay] = useState(todayISO);
  const [appointments] = useStored<Appointment[]>(KEYS.appointments, []);
  const [blocks] = useStored<Block[]>(KEYS.blocks, []);
  const version = useDataVersion();

  const [newAppt, setNewAppt] = useState<AppointmentPrefill | null>(null);
  const [showBlock, setShowBlock] = useState(false);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [blockDetail, setBlockDetail] = useState<Block | null>(null);

  const dayAppts = appointments.filter((a) => a.date === day && a.status !== 'cancelada');
  const cancelled = appointments.filter((a) => a.date === day && a.status === 'cancelada').length;
  const dayBlocks = blocks.filter((b) => b.date === day);

  // Rango visible: desde la primera hora de trabajo hasta la última (o las citas fuera de horario)
  const { from, to, hours } = useMemo(() => {
    const hours = Object.fromEntries(ARTISTS.map((a) => [a.id, workingHours(a.id, day)]));
    const starts = [...Object.values(hours).filter(Boolean).map((h) => h!.start), ...dayAppts.map((a) => a.start)];
    const ends = [...Object.values(hours).filter(Boolean).map((h) => h!.end), ...dayAppts.map((a) => a.end)];
    const from = Math.floor((starts.length ? Math.min(...starts) : 9 * 60) / 60) * 60;
    const to = Math.ceil((ends.length ? Math.max(...ends) : 18 * 60) / 60) * 60;
    return { from, to, hours };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, version]);

  const height = (to - from) * PX_PER_MIN;
  const y = (min: number) => (Math.max(min, from) - from) * PX_PER_MIN;
  const hourMarks = [];
  for (let m = from; m <= to; m += 60) hourMarks.push(m);
  const isToday = day === todayISO();
  const now = nowMin();

  const title = fmtDateLong(day);

  function onColumnClick(e: MouseEvent<HTMLDivElement>, artistId: string) {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const min = from + Math.floor((e.clientY - rect.top) / PX_PER_MIN / 30) * 30;
    setNewAppt({ artistId, date: day, start: min });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Agenda</p>
          <h1 className="agenda-title">{title}</h1>
        </div>
        <div className="agenda-controls">
          <button className="btn btn--icon" aria-label="Día anterior" onClick={() => setDay(addDays(day, -1))}>
            <ChevronLeft />
          </button>
          <input
            className="input"
            type="date"
            value={day}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            aria-label="Elegir día"
          />
          <button className="btn btn--icon" aria-label="Día siguiente" onClick={() => setDay(addDays(day, 1))}>
            <ChevronRight />
          </button>
          <button className="btn btn--ghost" onClick={() => setDay(todayISO())}>
            Hoy
          </button>
        </div>
      </div>

      <div className="agenda-actions">
        <button className="btn btn--gold" onClick={() => setNewAppt({ date: day < todayISO() ? todayISO() : day })}>
          <Plus aria-hidden /> Nueva cita
        </button>
        <button className="btn btn--ghost" onClick={() => setShowBlock(true)}>
          <CalendarOff aria-hidden /> Bloquear horario
        </button>
        <span className="agenda-count">
          {dayAppts.length === 0 ? 'Sin citas' : dayAppts.length === 1 ? '1 cita' : `${dayAppts.length} citas`}
          {cancelled > 0 && ` · ${cancelled} cancelada${cancelled > 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="tl card">
        <div className="tl-head">
          <div />
          {ARTISTS.map((a) => (
            <div className="card-head" key={a.id}>
              <h2>{a.name}</h2>
            </div>
          ))}
        </div>

        <div className="tl-body" style={{ height }}>
          <div className="tl-gutter">
            {hourMarks.map((m) => (
              <span key={m} style={{ top: y(m) }}>
                {fmtTime(m).replace(':00', '')}
              </span>
            ))}
          </div>

          {ARTISTS.map((a) => {
            const wh = hours[a.id];
            const off = timeOffFor(a.id, day);
            return (
              <div
                key={a.id}
                className="tl-col"
                style={{ backgroundSize: `100% ${60 * PX_PER_MIN}px` }}
                onClick={(e) => onColumnClick(e, a.id)}
                title="Toca un espacio vacío para crear una cita"
              >
                {/* Fuera de horario */}
                {wh ? (
                  <>
                    {wh.start > from && <div className="tl-off" style={{ top: 0, height: y(wh.start) }} />}
                    {wh.end < to && <div className="tl-off" style={{ top: y(wh.end), bottom: 0 }} />}
                  </>
                ) : (
                  <div className="tl-off tl-off--full" style={{ top: 0, bottom: 0 }}>
                    <span>{off ? off.reason || 'Día libre' : 'No trabaja este día'}</span>
                  </div>
                )}

                {dayBlocks
                  .filter((b) => b.artistId === a.id)
                  .map((b) => (
                    <button
                      key={b.id}
                      className="tl-block"
                      style={{ top: y(b.start), height: Math.max(y(Math.min(b.end, to)) - y(b.start) - 2, 18) }}
                      onClick={() => setBlockDetail(b)}
                    >
                      {b.reason || 'Bloqueado'}
                    </button>
                  ))}

                {dayAppts
                  .filter((ap) => ap.artistId === a.id)
                  .map((ap) => {
                    const h = (ap.end - ap.start) * PX_PER_MIN - 3;
                    return (
                      <button
                        key={ap.id}
                        className={`tl-appt tl-appt--${ap.status}${h < 44 ? ' tl-appt--short' : ''}`}
                        style={{ top: y(ap.start) + 1, height: h }}
                        onClick={() => setDetail(ap)}
                      >
                        <span className="tl-time">
                          {fmtTime(ap.start)} – {fmtTime(ap.end)}
                        </span>
                        <strong>{ap.clientName}</strong>
                        <span className="tl-svc">{ap.serviceName}</span>
                      </button>
                    );
                  })}

                {isToday && now > from && now < to && <div className="tl-now" style={{ top: y(now) }} />}
              </div>
            );
          })}
        </div>
      </div>

      {newAppt && <AppointmentForm prefill={newAppt} onClose={() => setNewAppt(null)} />}
      {showBlock && <BlockForm date={day} onClose={() => setShowBlock(false)} />}
      {detail && <AppointmentDetail appt={detail} onClose={() => setDetail(null)} />}
      {blockDetail && (
        <Modal title="Horario bloqueado" onClose={() => setBlockDetail(null)}>
          <p className="muted" style={{ fontSize: 14 }}>
            {ARTISTS.find((a) => a.id === blockDetail.artistId)?.name} ·{' '}
            {blockDetail.start === 0 && blockDetail.end >= 24 * 60
              ? 'Todo el día'
              : `${fmtTime(blockDetail.start)} – ${fmtTime(blockDetail.end)}`}
            {blockDetail.reason && ` · ${blockDetail.reason}`}
          </p>
          <div className="modal-actions">
            <button
              className="btn btn--danger-ghost"
              onClick={() => {
                removeBlock(blockDetail.id);
                setBlockDetail(null);
              }}
            >
              <X aria-hidden /> Quitar bloqueo
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
