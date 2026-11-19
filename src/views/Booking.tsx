'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { SelectField } from '../components/Fields';
import { ARTISTS, SALON } from '../lib/config';
import {
  addDays,
  cap,
  fmtDateLong,
  fmtDuration,
  fmtMonthShort,
  fmtPrice,
  fmtTime,
  fromISO,
  todayISO,
} from '../lib/dates';
import { BOOKING_DAYS, clientSlots } from '../lib/availability';
import { addRequest, createAppointment, onlyDigits } from '../lib/actions';
import { Appointment, KEYS, Service, useDataVersion, useStored } from '../lib/store';

export default function Booking() {
  const [services] = useStored<Service[]>(KEYS.services, []);
  const version = useDataVersion();
  const available = services.filter((s) => s.active && s.artistIds.length > 0);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [artistPref, setArtistPref] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ start: number; artistId: string } | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  const service = available.find((s) => s.id === serviceId) ?? null;
  const artistOptions = service ? ARTISTS.filter((a) => service.artistIds.includes(a.id)) : [];

  // Días con al menos una hora libre (próximas 3 semanas)
  const days = useMemo(() => {
    if (!service || !artistPref) return [];
    return Array.from({ length: BOOKING_DAYS }, (_, i) => {
      const iso = addDays(todayISO(), i);
      return { iso, slots: clientSlots(service, artistPref, iso) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.id, service?.durationMin, artistPref, version]);

  const daySlots = useMemo(() => days.find((d) => d.iso === date)?.slots ?? [], [days, date]);
  const noDays = days.length > 0 && days.every((d) => d.slots.length === 0);

  // Elegir automáticamente el primer día con espacio (menos toques)
  useEffect(() => {
    if (days.length && (!date || !days.some((d) => d.iso === date))) {
      // Preserve the prototype's automatic date selection after storage changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDate(days.find((d) => d.slots.length)?.iso ?? null);
    }
  }, [days, date]);

  // Si la hora elegida se ocupó mientras tanto, se quita
  useEffect(() => {
    // Preserve clearing a selected time when another tab occupies it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (slot && !daySlots.some((s) => s.start === slot.start)) setSlot(null);
  }, [daySlots, slot]);

  const pickService = (id: string) => {
    setServiceId(id);
    const s = available.find((x) => x.id === id)!;
    setArtistPref(s.artistIds.length === 1 ? s.artistIds[0] : null);
    setDate(null);
    setSlot(null);
  };

  if (booked) return <Confirmation appt={booked} onAgain={() => window.location.reload()} />;

  return (
    <section className="booking">
      <div className="container container--narrow">
        <p className="eyebrow">Reserva en línea</p>
        <h1>Reservar cita</h1>
        <p className="booking-sub">Sigue los pasos. Solo verás los horarios disponibles.</p>

        <Step n="01" title="¿Qué servicio deseas?">
          {available.length === 0 ? (
            <div className="notice-box">Pronto publicaremos nuestros servicios.</div>
          ) : (
            <div className="choice-grid">
              {available.map((s) => (
                <Choice key={s.id} selected={s.id === serviceId} onClick={() => pickService(s.id)}>
                  <span className="choice-title">{s.name}</span>
                  <span className="choice-meta">
                    {fmtDuration(s.durationMin)} · {fmtPrice(s.price)}
                  </span>
                </Choice>
              ))}
            </div>
          )}
        </Step>

        {service && (
          <Step n="02" title="¿Con quién?" scroll>
            <div className="choice-grid">
              {artistOptions.length > 1 && (
                <Choice
                  selected={artistPref === 'any'}
                  onClick={() => {
                    setArtistPref('any');
                    setSlot(null);
                  }}
                >
                  <span className="choice-title">Cualquiera</span>
                  <span className="choice-meta">La primera disponible</span>
                </Choice>
              )}
              {artistOptions.map((a) => (
                <Choice
                  key={a.id}
                  selected={artistPref === a.id}
                  onClick={() => {
                    setArtistPref(a.id);
                    setSlot(null);
                  }}
                >
                  <span className="choice-title">{a.name}</span>
                  <span className="choice-meta">{a.role}</span>
                </Choice>
              ))}
            </div>
          </Step>
        )}

        {service && artistPref && (
          <Step n="03" title="¿Qué día y a qué hora?" scroll>
            {noDays ? (
              <div className="notice-box">
                No hay horarios libres en las próximas semanas. Envíanos una solicitud abajo y te buscamos un
                espacio.
              </div>
            ) : (
              <>
                <div className="day-strip" role="listbox" aria-label="Elige el día">
                  {days.map((d) => {
                    const disabled = d.slots.length === 0;
                    const dt = fromISO(d.iso);
                    return (
                      <button
                        key={d.iso}
                        role="option"
                        aria-selected={d.iso === date}
                        disabled={disabled}
                        className={`day-chip${d.iso === date ? ' selected' : ''}`}
                        onClick={() => {
                          setDate(d.iso);
                          setSlot(null);
                        }}
                        aria-label={fmtDateLong(d.iso) + (disabled ? ', sin horarios' : '')}
                      >
                        <small>
                          {d.iso === todayISO()
                            ? 'Hoy'
                            : dt.toLocaleDateString('es-NI', { weekday: 'short' }).replace('.', '')}
                        </small>
                        <strong>{dt.getDate()}</strong>
                        <small>{fmtMonthShort(d.iso)}</small>
                      </button>
                    );
                  })}
                </div>

                {date && (
                  <>
                    <p className="day-label">{fmtDateLong(date)}</p>
                    <SlotGroup
                      label="Mañana"
                      slots={daySlots.filter((s) => s.start < 12 * 60)}
                      selected={slot?.start}
                      onPick={setSlot}
                    />
                    <SlotGroup
                      label="Tarde"
                      slots={daySlots.filter((s) => s.start >= 12 * 60)}
                      selected={slot?.start}
                      onPick={setSlot}
                    />
                  </>
                )}
              </>
            )}
          </Step>
        )}

        {service && slot && date && (
          <Step n="04" title="Tus datos" scroll>
            <ClientForm service={service} date={date} slot={slot} onBooked={setBooked} />
          </Step>
        )}

        <hr className="divider" />

        {showCustom ? (
          <CustomRequestForm />
        ) : (
          <div className="custom-cta">
            <p>¿Buscas un servicio especial, de larga duración o no encuentras horario?</p>
            <button type="button" onClick={() => setShowCustom(true)}>
              Solicitar servicio personalizado
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Piezas ----------

function Step({ n, title, children, scroll }: { n: string; title: string; children: ReactNode; scroll?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Al aparecer un paso nuevo, se desliza hasta él (útil en celular)
    if (scroll) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [scroll]);
  return (
    <div ref={ref} className="booking-block">
      <div className="booking-step">
        <small>{n}</small>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`choice${selected ? ' selected' : ''}`} aria-pressed={selected} onClick={onClick}>
      {children}
      {selected && <Check className="choice-check" aria-hidden />}
    </button>
  );
}

function SlotGroup({
  label,
  slots,
  selected,
  onPick,
}: {
  label: string;
  slots: { start: number; artistId: string }[];
  selected?: number;
  onPick: (s: { start: number; artistId: string }) => void;
}) {
  if (slots.length === 0) return null;
  return (
    <div className="slot-group">
      <p className="slot-label">{label}</p>
      <div className="slot-grid">
        {slots.map((s) => (
          <button
            key={s.start}
            type="button"
            className={`slot${selected === s.start ? ' selected' : ''}`}
            aria-pressed={selected === s.start}
            onClick={() => onPick(s)}
          >
            {fmtTime(s.start)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ClientForm({
  service,
  date,
  slot,
  onBooked,
}: {
  service: Service;
  date: string;
  slot: { start: number; artistId: string };
  onBooked: (a: Appointment) => void;
}) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const artist = ARTISTS.find((a) => a.id === slot.artistId)!;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Escribe tu nombre.');
    if (onlyDigits(whatsapp).length !== 8) return setError('Escribe tu número de WhatsApp de 8 dígitos.');
    setSending(true);
    const res = createAppointment({
      artistId: slot.artistId,
      date,
      start: slot.start,
      durationMin: service.durationMin,
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      client: { name, whatsapp },
      source: 'web',
    });
    setSending(false);
    if (!res.ok) return setError('Esa hora se acaba de ocupar. Por favor elige otra.');
    onBooked(res.value);
  }

  return (
    <div className="form-card">
      <div className="summary">
        <div>
          <span>Servicio</span>
          <strong>{service.name}</strong>
        </div>
        <div>
          <span>Artista</span>
          <strong>{artist.name}</strong>
        </div>
        <div>
          <span>Cuándo</span>
          <strong>
            {cap(fmtDateLong(date))}, {fmtTime(slot.start)}
          </strong>
        </div>
        <div>
          <span>Precio</span>
          <strong>{fmtPrice(service.price)}</strong>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="row-2">
          <div className="field">
            <label htmlFor="bk-name">Tu nombre</label>
            <input
              id="bk-name"
              className="input"
              placeholder="María López"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="bk-wa">WhatsApp</label>
            <input
              id="bk-wa"
              className="input"
              placeholder="8888 8888"
              inputMode="tel"
              autoComplete="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-cta btn-cta--block" disabled={sending}>
          Confirmar cita
        </button>
        <p className="form-hint" style={{ textAlign: 'center', marginTop: 12 }}>
          Si no puedes asistir, avísanos por WhatsApp para darle el espacio a otra clienta.
        </p>
      </form>
    </div>
  );
}

function Confirmation({ appt, onAgain }: { appt: Appointment; onAgain: () => void }) {
  const artist = ARTISTS.find((a) => a.id === appt.artistId)?.name;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  return (
    <section className="booking">
      <div className="container container--narrow">
        <div className="confirm">
          <span className="confirm-icon">
            <Check aria-hidden />
          </span>
          <p className="eyebrow">Cita confirmada</p>
          <h1>¡Te esperamos, {appt.clientName.split(' ')[0]}!</h1>
          <div className="summary summary--center">
            <div>
              <span>Servicio</span>
              <strong>{appt.serviceName}</strong>
            </div>
            <div>
              <span>Artista</span>
              <strong>{artist}</strong>
            </div>
            <div>
              <span>Cuándo</span>
              <strong>
                {cap(fmtDateLong(appt.date))}, {fmtTime(appt.start)}
              </strong>
            </div>
            {appt.price != null && (
              <div>
                <span>Precio</span>
                <strong>{fmtPrice(appt.price)}</strong>
              </div>
            )}
          </div>
          <p className="muted" style={{ fontSize: 14, margin: '20px 0 28px' }}>
            {SALON.name} Salon · {SALON.location}. Toma una captura de pantalla para recordar tu cita.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-cta" onClick={onAgain}>
              Reservar otra cita
            </button>
            <Link href="/" className="btn-cta btn-cta--ghost">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Servicio personalizado (sin cambios de diseño) ----------

function CustomRequestForm() {
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [artistId, setArtistId] = useState('');
  const [date, setDate] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = onlyDigits(whatsapp);
    if (!description.trim() || !clientName.trim()) {
      setError('Cuéntanos qué servicio deseas y tu nombre.');
      return;
    }
    if (digits.length !== 8) {
      setError('Escribe tu número de WhatsApp de 8 dígitos.');
      return;
    }
    addRequest({
      description: description.trim(),
      clientName: clientName.trim(),
      whatsapp: digits,
      email: email.trim() || undefined,
      artistId: artistId || undefined,
      date: date || undefined,
      timeOfDay: timeOfDay || undefined,
    });
    setSent(true);
  }

  return (
    <div>
      <div className="custom-head">
        <h2>Servicio personalizado</h2>
        <p>Cuéntanos qué deseas. Te contactaremos para darte precio y agendar tu cita.</p>
      </div>

      <div className="form-card">
        {sent ? (
          <div className="form-success">
            <h3>¡Solicitud enviada!</h3>
            <p>Te escribiremos por WhatsApp muy pronto para confirmar precio y horario.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="cr-desc">¿Qué servicio deseas?</label>
              <textarea
                id="cr-desc"
                className="textarea"
                placeholder="Ej. Mechas balayage y corte, para una boda"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="row-2">
              <div className="field">
                <label htmlFor="cr-name">Tu nombre</label>
                <input
                  id="cr-name"
                  className="input"
                  placeholder="María López"
                  autoComplete="name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="cr-wa">WhatsApp</label>
                <input
                  id="cr-wa"
                  className="input"
                  placeholder="8888 8888"
                  inputMode="tel"
                  autoComplete="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="cr-email">
                Correo<span className="opt">(opcional)</span>
              </label>
              <input
                id="cr-email"
                className="input"
                type="email"
                placeholder="maria@gmail.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <p className="form-section">
              Preferencias <small>(opcional)</small>
            </p>

            <div className="row-3">
              <div className="field">
                <label htmlFor="cr-artist">Artista</label>
                <SelectField id="cr-artist" value={artistId} onChange={(e) => setArtistId(e.target.value)}>
                  <option value="">Cualquiera</option>
                  {ARTISTS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="field">
                <label htmlFor="cr-date">Día</label>
                <input
                  id="cr-date"
                  className="input"
                  type="date"
                  min={todayISO()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="cr-time">Horario</label>
                <SelectField id="cr-time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)}>
                  <option value="">Cualquiera</option>
                  <option value="manana">Mañana</option>
                  <option value="tarde">Tarde</option>
                </SelectField>
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="btn-cta btn-cta--block" style={{ marginTop: 6 }}>
              Enviar solicitud
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
