/**
 * Capa de datos PROVISIONAL.
 *
 * Todo se guarda en localStorage del navegador para poder probar el flujo
 * sin servidor. Cuando conecten un backend (Supabase, Firebase, API propia…)
 * hay que reemplazar `read`/`write` y las funciones de `actions.ts`;
 * las pantallas no deberían necesitar cambios.
 *
 * IMPORTANTE para el backend: la regla "dos citas no pueden chocar" debe
 * vivir también en la base de datos (restricción o transacción), no solo
 * en el navegador.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ARTISTS, WEEKDAYS } from './config';

// ---------- Tipos ----------

export type Service = {
  id: string;
  name: string;
  price: number; // córdobas
  durationMin: number;
  artistIds: string[]; // quién lo hace
  active: boolean; // visible para las clientas
};

export type AppointmentStatus = 'confirmada' | 'asistio' | 'no_vino' | 'cancelada';

export type Appointment = {
  id: string;
  createdAt: string;
  artistId: string;
  date: string; // YYYY-MM-DD
  start: number; // minutos desde medianoche
  end: number;
  serviceId?: string;
  serviceName: string; // copia, por si el servicio cambia después
  price?: number;
  clientId: string;
  clientName: string;
  whatsapp: string;
  status: AppointmentStatus;
  source: 'web' | 'panel' | 'solicitud';
  notes?: string;
};

/** Horas bloqueadas en un día (almuerzo, diligencia…) */
export type Block = {
  id: string;
  artistId: string;
  date: string;
  start: number;
  end: number;
  reason?: string;
};

/** Días libres o vacaciones (rango de fechas completo) */
export type TimeOff = {
  id: string;
  artistId: string;
  from: string;
  to: string;
  reason?: string;
};

export type Client = {
  id: string;
  name: string;
  whatsapp: string; // solo dígitos, sin 505
  email?: string;
  createdAt: string;
};

export type CustomRequest = {
  id: string;
  createdAt: string;
  description: string;
  clientName: string;
  whatsapp: string;
  email?: string;
  artistId?: string;
  date?: string;
  timeOfDay?: string; // 'manana' | 'tarde'
  status: 'pendiente' | 'agendada' | 'descartada';
  appointmentId?: string;
};

export type DaySchedule = { enabled: boolean; start: string; end: string };
export type WeekSchedule = Record<(typeof WEEKDAYS)[number], DaySchedule>;
export type Schedules = Record<string, WeekSchedule>; // por artistId

export type Session = { email: string } | null;

// ---------- Claves ----------

export const KEYS = {
  services: 'services',
  requests: 'requests',
  schedules: 'schedules',
  appointments: 'appointments',
  blocks: 'blocks',
  timeOff: 'timeOff',
  clients: 'clients',
  session: 'session',
  ownerEmail: 'ownerEmail',
} as const;

// ---------- Lectura / escritura ----------

const PREFIX = 'velore:';

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = readRaw(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readRaw(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible */
  }
  window.dispatchEvent(new CustomEvent('velore:change', { detail: key }));
}

export function clearAll() {
  if (typeof window === 'undefined') return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX) && !k.endsWith('session') && !k.endsWith('ownerEmail'))
    .forEach((k) => localStorage.removeItem(k));
  window.dispatchEvent(new CustomEvent('velore:change', { detail: '*' }));
}

export const uid = () => Math.random().toString(36).slice(2, 10);

function subscribe(fn: (key: string) => void) {
  const onCustom = (e: Event) => fn((e as CustomEvent).detail);
  const onStorage = (e: StorageEvent) => fn(e.key?.replace(PREFIX, '') ?? '*');
  window.addEventListener('velore:change', onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('velore:change', onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

/** Hook reactivo: se actualiza cuando cualquier pantalla cambia ese dato. */
export function useStored<T>(key: string, fallback: T) {
  const onChange = useCallback(
    (notify: () => void) => subscribe((changedKey) => {
      if (changedKey === key || changedKey === '*') notify();
    }),
    [key],
  );
  // The raw string is a stable snapshot; parsing inside getSnapshot would
  // allocate a new object on every call and cause an infinite render loop.
  const getSnapshot = useCallback(() => readRaw(key), [key]);
  const raw = useSyncExternalStore(onChange, getSnapshot, () => null);
  const value = useMemo<T>(() => {
    if (raw === null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  }, [raw, fallback]);
  const save = useCallback((v: T) => write(key, v), [key]);
  return [value, save] as const;
}

/** Número que cambia cada vez que cambia cualquier dato (para recalcular disponibilidad). */
export function useDataVersion() {
  const [v, setV] = useState(0);
  useEffect(() => subscribe(() => setV((x) => x + 1)), []);
  return v;
}

// ---------- Valores por defecto ----------

export function defaultWeek(): WeekSchedule {
  const week = {} as WeekSchedule;
  WEEKDAYS.forEach((d) => {
    week[d] = { enabled: d !== 'Domingo', start: '09:00', end: '18:00' };
  });
  return week;
}

export function defaultSchedules(): Schedules {
  return Object.fromEntries(ARTISTS.map((a) => [a.id, defaultWeek()]));
}
