import { FormEvent, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { SelectField, Switch } from '../components/Fields';
import { ARTISTS, Artist, WEEKDAYS } from '../lib/config';
import { fmtDateShort, todayISO } from '../lib/dates';
import { addTimeOff, removeTimeOff } from '../lib/actions';
import { defaultSchedules, KEYS, Schedules, TimeOff, useStored, WeekSchedule } from '../lib/store';

export default function Horarios() {
  const [schedules, setSchedules] = useStored<Schedules>(KEYS.schedules, defaultSchedules());

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Horarios</p>
          <h1>Horario de trabajo</h1>
          <p className="page-sub">
            Las clientas solo podrán reservar dentro de estos horarios. Para almuerzos o días libres, usa
            &quot;Bloquear horario&quot; en la Agenda.
          </p>
        </div>
      </div>

      <div className="cols-2">
        {ARTISTS.map((a) => (
          <ArtistSchedule
            key={a.id}
            artist={a}
            initial={schedules[a.id] ?? defaultSchedules()[a.id]}
            onSave={(week) => setSchedules({ ...schedules, [a.id]: week })}
          />
        ))}
      </div>

      <TimeOffSection />
    </>
  );
}

function ArtistSchedule({
  artist,
  initial,
  onSave,
}: {
  artist: Artist;
  initial: WeekSchedule;
  onSave: (w: WeekSchedule) => void;
}) {
  const [week, setWeek] = useState<WeekSchedule>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const update = (day: (typeof WEEKDAYS)[number], patch: Partial<WeekSchedule[typeof day]>) => {
    setSaved(false);
    setWeek({ ...week, [day]: { ...week[day], ...patch } });
  };

  const save = () => {
    const bad = WEEKDAYS.find((d) => week[d].enabled && week[d].end <= week[d].start);
    if (bad) return setError(`${bad}: la hora de cierre debe ser después de la de inicio.`);
    setError('');
    onSave(week);
    setSaved(true);
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2>{artist.name}</h2>
      </div>

      {WEEKDAYS.map((day) => {
        const d = week[day];
        return (
          <div className="sched-row" key={day}>
            <div className="sched-day">
              <Switch
                checked={d.enabled}
                onChange={(v) => update(day, { enabled: v })}
                label={`${day} ${d.enabled ? 'abierto' : 'cerrado'}`}
              />
              {day}
            </div>
            {d.enabled ? (
              <div className="sched-times">
                <input
                  className="input"
                  type="time"
                  value={d.start}
                  aria-label={`${day}, hora de inicio`}
                  onChange={(e) => update(day, { start: e.target.value })}
                />
                a
                <input
                  className="input"
                  type="time"
                  value={d.end}
                  aria-label={`${day}, hora de cierre`}
                  onChange={(e) => update(day, { end: e.target.value })}
                />
              </div>
            ) : (
              <div className="sched-times">Cerrado</div>
            )}
          </div>
        );
      })}

      <div className="sched-foot">
        <button className="btn btn--gold" onClick={save}>
          Guardar horario
        </button>
        {saved && <span className="saved-note">Guardado</span>}
        {error && <span className="form-error" style={{ margin: 0 }}>{error}</span>}
      </div>
    </section>
  );
}

function TimeOffSection() {
  const [items] = useStored<TimeOff[]>(KEYS.timeOff, []);
  const [who, setWho] = useState('all');
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const upcoming = items.filter((t) => t.to >= todayISO()).sort((a, b) => a.from.localeCompare(b.from));

  function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const ids = who === 'all' ? ARTISTS.map((a) => a.id) : [who];
    const created: string[] = [];
    for (const artistId of ids) {
      const res = addTimeOff({ artistId, from, to, reason: reason.trim() || undefined });
      if (!res.ok) {
        created.forEach(removeTimeOff);
        const name = ARTISTS.find((a) => a.id === artistId)?.name;
        return setError(ids.length > 1 ? `${name}: ${res.error}` : res.error);
      }
      created.push(res.value.id);
    }
    setReason('');
  }

  return (
    <section style={{ marginTop: 40 }}>
      <p className="eyebrow">Días libres</p>
      <h2 className="section-title">Días libres y vacaciones</h2>
      <p className="page-sub" style={{ marginBottom: 16 }}>
        Esos días no aparecerán disponibles para reservar.
      </p>

      <form className="card timeoff-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="to-who">Artista</label>
          <SelectField id="to-who" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="all">Ambas (salón cerrado)</option>
            {ARTISTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="field">
          <label htmlFor="to-from">Desde</label>
          <input
            id="to-from"
            className="input"
            type="date"
            min={todayISO()}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              if (e.target.value > to) setTo(e.target.value);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="to-to">Hasta</label>
          <input id="to-to" className="input" type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="to-reason">
            Motivo<span className="opt">(opcional)</span>
          </label>
          <input
            id="to-reason"
            className="input"
            placeholder="Vacaciones, feriado…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn--gold timeoff-btn">
          Agregar
        </button>
        {error && <p className="form-error timeoff-error">{error}</p>}
      </form>

      {upcoming.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          {upcoming.map((t) => (
            <div className="timeoff-row" key={t.id}>
              <strong>{ARTISTS.find((a) => a.id === t.artistId)?.name}</strong>
              <span>
                {t.from === t.to ? fmtDateShort(t.from) : `${fmtDateShort(t.from)} – ${fmtDateShort(t.to)}`}
              </span>
              <span className="muted">{t.reason ?? ''}</span>
              <button className="btn btn--icon" aria-label="Quitar día libre" onClick={() => removeTimeOff(t.id)}>
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
