/**
 * Motor de disponibilidad: decide qué horas están libres.
 * Aquí vive la regla que evita las citas dobles.
 */
import { WEEKDAYS } from './config';
import { nowMin, todayISO, toMin, weekdayIndex } from './dates';
import {
  Appointment,
  Block,
  defaultSchedules,
  KEYS,
  read,
  Schedules,
  Service,
  TimeOff,
} from './store';

export type Interval = { start: number; end: number };

export const SLOT_STEP = 30; // las clientas ven horas cada 30 min
export const MIN_NOTICE = 60; // no se puede reservar con menos de 1 h de anticipación
export const BOOKING_DAYS = 21; // la clienta puede reservar hasta 3 semanas adelante

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/** Motivo si la artista tiene el día libre / vacaciones, si no null. */
export function timeOffFor(artistId: string, date: string): TimeOff | null {
  return (
    read<TimeOff[]>(KEYS.timeOff, []).find(
      (t) => t.artistId === artistId && date >= t.from && date <= t.to,
    ) ?? null
  );
}

/** Horario de trabajo de ese día, o null si no trabaja. */
export function workingHours(artistId: string, date: string): Interval | null {
  if (timeOffFor(artistId, date)) return null;
  const all = read<Schedules>(KEYS.schedules, defaultSchedules());
  const week = all[artistId] ?? defaultSchedules()[artistId];
  const day = week?.[WEEKDAYS[weekdayIndex(date)]];
  if (!day?.enabled) return null;
  return { start: toMin(day.start), end: toMin(day.end) };
}

/** Citas activas + bloqueos de esa artista en ese día. */
export function busyIntervals(artistId: string, date: string, ignoreAppointmentId?: string): Interval[] {
  const appts = read<Appointment[]>(KEYS.appointments, []).filter(
    (a) =>
      a.artistId === artistId &&
      a.date === date &&
      a.status !== 'cancelada' &&
      a.id !== ignoreAppointmentId,
  );
  const blocks = read<Block[]>(KEYS.blocks, []).filter((b) => b.artistId === artistId && b.date === date);
  return [...appts, ...blocks].map(({ start, end }) => ({ start, end }));
}

export function isFree(artistId: string, date: string, start: number, end: number, ignoreId?: string) {
  return !busyIntervals(artistId, date, ignoreId).some((b) => overlaps(b, { start, end }));
}

/** Horas de inicio libres para una duración dada. */
export function freeSlots(
  artistId: string,
  date: string,
  durationMin: number,
  opts: { ignoreHours?: boolean; forClient?: boolean; step?: number } = {},
): number[] {
  const today = todayISO();
  if (date < today) return [];
  const hours = opts.ignoreHours ? { start: 7 * 60, end: 21 * 60 } : workingHours(artistId, date);
  if (!hours) return [];
  const step = opts.step ?? SLOT_STEP;
  const minStart = date === today ? (opts.forClient ? nowMin() + MIN_NOTICE : nowMin()) : -1;
  const busy = busyIntervals(artistId, date);
  const out: number[] = [];
  for (let t = hours.start; t + durationMin <= hours.end; t += step) {
    if (t < minStart) continue;
    if (!busy.some((b) => overlaps(b, { start: t, end: t + durationMin }))) out.push(t);
  }
  return out;
}

/**
 * Horas disponibles para la clienta. Si eligió "Cualquiera",
 * junta las horas de todas las artistas que hacen el servicio
 * y asigna la primera libre.
 */
export function clientSlots(service: Service, artistPref: string, date: string) {
  const artists = artistPref === 'any' ? service.artistIds : [artistPref];
  const map = new Map<number, string>(); // hora → artista asignada
  artists.forEach((id) => {
    freeSlots(id, date, service.durationMin, { forClient: true }).forEach((t) => {
      if (!map.has(t)) map.set(t, id);
    });
  });
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([start, artistId]) => ({ start, artistId }));
}
