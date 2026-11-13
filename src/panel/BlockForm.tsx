import { FormEvent, useState } from 'react';
import Modal from '../components/Modal';
import { SelectField, Switch } from '../components/Fields';
import { ARTISTS } from '../lib/config';
import { todayISO, toMin } from '../lib/dates';
import { addBlock, removeBlock } from '../lib/actions';

/** Ventana "Bloquear horario": almuerzos, diligencias, salidas. */
export default function BlockForm({ date: initialDate, onClose }: { date?: string; onClose: () => void }) {
  const [who, setWho] = useState<string>('all');
  const [date, setDate] = useState(initialDate ?? todayISO());
  const [allDay, setAllDay] = useState(false);
  const [from, setFrom] = useState('12:00');
  const [to, setTo] = useState('13:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const artists = who === 'all' ? ARTISTS.map((a) => a.id) : [who];
    const start = allDay ? 0 : toMin(from);
    const end = allDay ? 24 * 60 : toMin(to);
    const created: string[] = [];
    for (const artistId of artists) {
      const res = addBlock({ artistId, date, start, end, reason: reason.trim() || undefined });
      if (!res.ok) {
        // Si falla para una, deshacer lo creado para no dejarlo a medias
        created.forEach(removeBlock);
        const name = ARTISTS.find((a) => a.id === artistId)?.name;
        return setError(artists.length > 1 ? `${name}: ${res.error}` : res.error);
      }
      created.push(res.value.id);
    }
    onClose();
  }

  return (
    <Modal title="Bloquear horario" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p className="form-hint" style={{ marginTop: 0 }}>
          Las clientas no podrán reservar en ese espacio.
        </p>
        <div className="row-2">
          <div className="field">
            <label htmlFor="bl-who">Artista</label>
            <SelectField id="bl-who" value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="all">Ambas</option>
              {ARTISTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="field">
            <label htmlFor="bl-date">Día</label>
            <input
              id="bl-date"
              className="input"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="inline-switch">
          <Switch checked={allDay} onChange={setAllDay} label="Todo el día" />
          Todo el día
        </div>

        {!allDay && (
          <div className="row-2">
            <div className="field">
              <label htmlFor="bl-from">Desde</label>
              <input id="bl-from" className="input" type="time" step={900} value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="bl-to">Hasta</label>
              <input id="bl-to" className="input" type="time" step={900} value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="bl-reason">
            Motivo<span className="opt">(opcional)</span>
          </label>
          <input
            id="bl-reason"
            className="input"
            placeholder="Almuerzo, cita médica…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--gold">
            Bloquear
          </button>
        </div>
      </form>
    </Modal>
  );
}
