import { FormEvent, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { SelectField } from '../components/Fields';
import { ARTISTS } from '../lib/config';
import { DURATIONS, fmtDuration, fmtPrice, fmtTime, todayISO } from '../lib/dates';
import { freeSlots, workingHours } from '../lib/availability';
import { createAppointment, onlyDigits } from '../lib/actions';
import { Appointment, Client, KEYS, Service, useDataVersion, useStored } from '../lib/store';

export type AppointmentPrefill = {
  artistId?: string;
  date?: string;
  start?: number;
  clientName?: string;
  whatsapp?: string;
  email?: string;
  customName?: string;
  notes?: string;
};

const OTHER = '__otro';

/** Ventana "Nueva cita" del panel. Solo ofrece horas libres. */
export default function AppointmentForm({
  prefill = {},
  source = 'panel',
  onClose,
  onSaved,
}: {
  prefill?: AppointmentPrefill;
  source?: Appointment['source'];
  onClose: () => void;
  onSaved?: (a: Appointment) => void;
}) {
  const [services] = useStored<Service[]>(KEYS.services, []);
  const [clients] = useStored<Client[]>(KEYS.clients, []);
  const version = useDataVersion();

  const [clientName, setClientName] = useState(prefill.clientName ?? '');
  const [whatsapp, setWhatsapp] = useState(prefill.whatsapp ?? '');
  const [serviceId, setServiceId] = useState(prefill.customName ? OTHER : services[0]?.id ?? OTHER);
  const [customName, setCustomName] = useState(prefill.customName ?? '');
  const [customDuration, setCustomDuration] = useState(60);
  const [customPrice, setCustomPrice] = useState('');
  const [artistId, setArtistId] = useState(prefill.artistId ?? ARTISTS[0].id);
  const [date, setDate] = useState(prefill.date ?? todayISO());
  const [anyHour, setAnyHour] = useState(false);
  const [start, setStart] = useState<number | null>(prefill.start ?? null);
  const [notes, setNotes] = useState(prefill.notes ?? '');
  const [error, setError] = useState('');

  const service = services.find((s) => s.id === serviceId);
  const duration = service ? service.durationMin : customDuration;

  const slots = useMemo(
    () => freeSlots(artistId, date, duration, { ignoreHours: anyHour, step: 15 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [artistId, date, duration, anyHour, version],
  );
  const chosen = start !== null && slots.includes(start) ? start : (slots[0] ?? null);

  // Autocompletar WhatsApp al escribir el nombre de una clienta existente
  const onName = (v: string) => {
    setClientName(v);
    const match = clients.find((c) => c.name.toLowerCase() === v.trim().toLowerCase());
    if (match && !whatsapp) setWhatsapp(match.whatsapp);
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!clientName.trim()) return setError('Escribe el nombre de la clienta.');
    if (onlyDigits(whatsapp).length !== 8) return setError('El WhatsApp debe tener 8 dígitos.');
    if (!service && !customName.trim()) return setError('Escribe qué servicio se hará.');
    if (chosen === null) return setError('No hay una hora libre seleccionada.');
    const res = createAppointment({
      artistId,
      date,
      start: chosen,
      durationMin: duration,
      serviceId: service?.id,
      serviceName: service ? service.name : customName.trim(),
      price: service ? service.price : customPrice ? Number(customPrice) : undefined,
      client: { name: clientName, whatsapp, email: prefill.email },
      source,
      notes,
    });
    if (!res.ok) return setError(res.error);
    onSaved?.(res.value);
    onClose();
  }

  return (
    <Modal title="Nueva cita" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="row-2">
          <div className="field">
            <label htmlFor="ap-name">Clienta</label>
            <input
              id="ap-name"
              className="input"
              list="ap-clients"
              placeholder="Nombre"
              value={clientName}
              onChange={(e) => onName(e.target.value)}
            />
            <datalist id="ap-clients">
              {clients.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="ap-wa">WhatsApp</label>
            <input
              id="ap-wa"
              className="input"
              inputMode="tel"
              placeholder="8888 8888"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="ap-svc">Servicio</label>
          <SelectField id="ap-svc" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {fmtDuration(s.durationMin)} · {fmtPrice(s.price)}
              </option>
            ))}
            <option value={OTHER}>Otro / personalizado…</option>
          </SelectField>
        </div>

        {!service && (
          <>
            <div className="field">
              <label htmlFor="ap-custom">¿Qué servicio?</label>
              <input
                id="ap-custom"
                className="input"
                placeholder="Ej. Mechas balayage y corte"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
            <div className="row-2">
              <div className="field">
                <label htmlFor="ap-dur">Duración</label>
                <SelectField
                  id="ap-dur"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Number(e.target.value))}
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {fmtDuration(d)}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="field">
                <label htmlFor="ap-price">
                  Precio (C$)<span className="opt">(opcional)</span>
                </label>
                <input
                  id="ap-price"
                  className="input"
                  inputMode="numeric"
                  placeholder="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          </>
        )}

        <div className="row-3">
          <div className="field">
            <label htmlFor="ap-artist">Artista</label>
            <SelectField id="ap-artist" value={artistId} onChange={(e) => setArtistId(e.target.value)}>
              {ARTISTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="field">
            <label htmlFor="ap-date">Día</label>
            <input
              id="ap-date"
              className="input"
              type="date"
              min={todayISO()}
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="ap-time">Hora</label>
            <SelectField
              id="ap-time"
              value={chosen ?? ''}
              disabled={slots.length === 0}
              onChange={(e) => setStart(Number(e.target.value))}
            >
              {slots.length === 0 && <option value="">Sin horas libres</option>}
              {slots.map((t) => (
                <option key={t} value={t}>
                  {fmtTime(t)}
                </option>
              ))}
            </SelectField>
          </div>
        </div>

        <label className="check">
          <input type="checkbox" checked={anyHour} onChange={(e) => setAnyHour(e.target.checked)} />
          Permitir horas fuera del horario de trabajo
        </label>

        {slots.length === 0 && (
          <p className="form-hint">
            {!anyHour && !workingHours(artistId, date)
              ? `${ARTISTS.find((a) => a.id === artistId)?.name} no trabaja ese día. Elige otro día u otra artista.`
              : `No hay espacio libre de ${fmtDuration(duration)} ese día. Prueba otro día u otra artista.`}
          </p>
        )}

        <div className="field">
          <label htmlFor="ap-notes">
            Notas<span className="opt">(opcional)</span>
          </label>
          <textarea
            id="ap-notes"
            className="textarea"
            placeholder="Ej. Trae foto de referencia"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--gold">
            Guardar cita
          </button>
        </div>
      </form>
    </Modal>
  );
}
