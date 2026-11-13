import { FormEvent, useState } from 'react';
import { Pencil, Plus, Scissors } from 'lucide-react';
import Modal from '../components/Modal';
import { SelectField, Switch } from '../components/Fields';
import { ARTISTS } from '../lib/config';
import { DURATIONS, fmtDuration, fmtPrice } from '../lib/dates';
import { KEYS, Service, uid, useStored } from '../lib/store';

export default function Servicios() {
  const [services, setServices] = useStored<Service[]>(KEYS.services, []);
  const [editing, setEditing] = useState<Service | 'new' | null>(null);

  const save = (s: Service) => {
    const exists = services.some((x) => x.id === s.id);
    setServices(exists ? services.map((x) => (x.id === s.id ? s : x)) : [...services, s]);
  };
  const remove = (id: string) => setServices(services.filter((x) => x.id !== id));
  const toggle = (s: Service) => save({ ...s, active: !s.active });

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Servicios</p>
          <h1>Precios y duración</h1>
        </div>
        <button className="btn btn--gold" onClick={() => setEditing('new')}>
          <Plus aria-hidden /> Nuevo servicio
        </button>
      </div>

      {services.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">
            <Scissors aria-hidden />
          </span>
          <h3>Aún no hay servicios</h3>
          <p>Agrega servicios como cortes o alisados para que las clientas puedan reservarlos.</p>
          <button className="btn btn--gold" onClick={() => setEditing('new')}>
            Agregar servicio
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="svc-row svc-row--head">
            <span>Servicio</span>
            <span>Duración</span>
            <span>Precio</span>
            <span>Visible</span>
            <span />
          </div>
          {services.map((s) => (
            <div className={`svc-row${s.active ? '' : ' svc-row--off'}`} key={s.id}>
              <div>
                <strong>{s.name}</strong>
                <small>
                  {s.artistIds.length === ARTISTS.length
                    ? 'Ambas artistas'
                    : ARTISTS.filter((a) => s.artistIds.includes(a.id))
                        .map((a) => a.name)
                        .join(', ') || 'Sin artista asignada'}
                </small>
              </div>
              <span>{fmtDuration(s.durationMin)}</span>
              <span>{fmtPrice(s.price)}</span>
              <span>
                <Switch checked={s.active} onChange={() => toggle(s)} label={`${s.name} visible para clientas`} />
              </span>
              <span>
                <button className="btn btn--icon" aria-label={`Editar ${s.name}`} onClick={() => setEditing(s)}>
                  <Pencil />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ServiceForm
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </>
  );
}

function ServiceForm({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial?: Service;
  onClose: () => void;
  onSave: (s: Service) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [duration, setDuration] = useState(initial?.durationMin ?? 60);
  const [artistIds, setArtistIds] = useState<string[]>(initial?.artistIds ?? ARTISTS.map((a) => a.id));
  const [active, setActive] = useState(initial?.active ?? true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleArtist = (id: string) =>
    setArtistIds(artistIds.includes(id) ? artistIds.filter((x) => x !== id) : [...artistIds, id]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Escribe el nombre del servicio.');
    if (!price) return setError('Escribe el precio.');
    if (artistIds.length === 0) return setError('Elige al menos una artista.');
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      price: Number(price),
      durationMin: duration,
      artistIds,
      active,
    });
    onClose();
  }

  return (
    <Modal title={initial ? 'Editar servicio' : 'Nuevo servicio'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="sv-name">Nombre</label>
          <input
            id="sv-name"
            className="input"
            placeholder="Ej. Corte de cabello"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="row-2">
          <div className="field">
            <label htmlFor="sv-price">Precio (C$)</label>
            <input
              id="sv-price"
              className="input"
              inputMode="numeric"
              placeholder="250"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="field">
            <label htmlFor="sv-dur">Duración</label>
            <SelectField id="sv-dur" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {fmtDuration(d)}
                </option>
              ))}
            </SelectField>
          </div>
        </div>

        <div className="field">
          <span className="label">¿Quién lo hace?</span>
          <div className="check-row">
            {ARTISTS.map((a) => (
              <label className="check" key={a.id}>
                <input type="checkbox" checked={artistIds.includes(a.id)} onChange={() => toggleArtist(a.id)} />
                {a.name}
              </label>
            ))}
          </div>
        </div>

        <div className="inline-switch">
          <Switch checked={active} onChange={setActive} label="Visible para las clientas" />
          Visible para las clientas
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          {initial &&
            (confirmDelete ? (
              <>
                <span className="confirm-q">¿Eliminar?</span>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => {
                    onDelete(initial.id);
                    onClose();
                  }}
                >
                  Sí, eliminar
                </button>
              </>
            ) : (
              <button type="button" className="btn btn--danger-ghost" onClick={() => setConfirmDelete(true)}>
                Eliminar
              </button>
            ))}
          <span style={{ flex: 1 }} />
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--gold">
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
