/**
 * Acciones que modifican datos. Validan antes de guardar.
 * Al conectar un backend, estas funciones se convierten en llamadas a la API.
 */
import { isFree } from './availability';
import { fmtDateShort, fmtTime } from './dates';
import {
  Appointment,
  AppointmentStatus,
  Block,
  Client,
  CustomRequest,
  KEYS,
  read,
  TimeOff,
  uid,
  write,
} from './store';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const onlyDigits = (s: string) => s.replace(/\D/g, '').replace(/^505(?=\d{8}$)/, '');

/** Crea o actualiza la clienta usando su WhatsApp como identificador. */
export function upsertClient(data: { name: string; whatsapp: string; email?: string }): Client {
  const clients = read<Client[]>(KEYS.clients, []);
  const whatsapp = onlyDigits(data.whatsapp);
  const existing = clients.find((c) => c.whatsapp === whatsapp);
  if (existing) {
    existing.name = data.name.trim() || existing.name;
    if (data.email) existing.email = data.email;
    write(KEYS.clients, clients);
    return existing;
  }
  const client: Client = {
    id: uid(),
    name: data.name.trim(),
    whatsapp,
    email: data.email || undefined,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.clients, [...clients, client]);
  return client;
}

export function createAppointment(input: {
  artistId: string;
  date: string;
  start: number;
  durationMin: number;
  serviceId?: string;
  serviceName: string;
  price?: number;
  client: { name: string; whatsapp: string; email?: string };
  source: Appointment['source'];
  notes?: string;
}): Result<Appointment> {
  const end = input.start + input.durationMin;
  if (!isFree(input.artistId, input.date, input.start, end)) {
    return { ok: false, error: 'Ese horario ya está ocupado. Elige otra hora.' };
  }
  const client = upsertClient(input.client);
  const appt: Appointment = {
    id: uid(),
    createdAt: new Date().toISOString(),
    artistId: input.artistId,
    date: input.date,
    start: input.start,
    end,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    price: input.price,
    clientId: client.id,
    clientName: client.name,
    whatsapp: client.whatsapp,
    status: 'confirmada',
    source: input.source,
    notes: input.notes?.trim() || undefined,
  };
  write(KEYS.appointments, [...read<Appointment[]>(KEYS.appointments, []), appt]);
  return { ok: true, value: appt };
}

export function setAppointmentStatus(id: string, status: AppointmentStatus): Result<null> {
  const list = read<Appointment[]>(KEYS.appointments, []);
  const appt = list.find((a) => a.id === id);
  if (!appt) return { ok: false, error: 'No se encontró la cita.' };
  // Reactivar una cita cancelada solo si el espacio sigue libre
  if (appt.status === 'cancelada' && status !== 'cancelada') {
    if (!isFree(appt.artistId, appt.date, appt.start, appt.end, appt.id)) {
      return { ok: false, error: 'Ese horario ya fue ocupado por otra cita.' };
    }
  }
  appt.status = status;
  write(KEYS.appointments, list);
  return { ok: true, value: null };
}

export function addBlock(b: Omit<Block, 'id'>): Result<Block> {
  if (b.end <= b.start) return { ok: false, error: 'La hora final debe ser después de la inicial.' };
  const clash = read<Appointment[]>(KEYS.appointments, []).find(
    (a) =>
      a.artistId === b.artistId &&
      a.date === b.date &&
      a.status !== 'cancelada' &&
      a.start < b.end &&
      b.start < a.end,
  );
  if (clash) {
    return {
      ok: false,
      error: `Hay una cita a las ${fmtTime(clash.start)} (${clash.clientName}). Cancélala o muévela primero.`,
    };
  }
  const block: Block = { ...b, id: uid() };
  write(KEYS.blocks, [...read<Block[]>(KEYS.blocks, []), block]);
  return { ok: true, value: block };
}

export function removeBlock(id: string) {
  write(
    KEYS.blocks,
    read<Block[]>(KEYS.blocks, []).filter((b) => b.id !== id),
  );
}

export function addTimeOff(t: Omit<TimeOff, 'id'>): Result<TimeOff> {
  if (t.to < t.from) return { ok: false, error: 'La fecha final debe ser igual o posterior a la inicial.' };
  const clash = read<Appointment[]>(KEYS.appointments, []).find(
    (a) => a.artistId === t.artistId && a.status === 'confirmada' && a.date >= t.from && a.date <= t.to,
  );
  if (clash) {
    return {
      ok: false,
      error: `Hay una cita el ${fmtDateShort(clash.date)} con ${clash.clientName}. Cancélala o muévela primero.`,
    };
  }
  const item: TimeOff = { ...t, id: uid() };
  write(KEYS.timeOff, [...read<TimeOff[]>(KEYS.timeOff, []), item]);
  return { ok: true, value: item };
}

export function removeTimeOff(id: string) {
  write(
    KEYS.timeOff,
    read<TimeOff[]>(KEYS.timeOff, []).filter((t) => t.id !== id),
  );
}

export function addRequest(r: Omit<CustomRequest, 'id' | 'createdAt' | 'status'>) {
  upsertClient({ name: r.clientName, whatsapp: r.whatsapp, email: r.email });
  const list = read<CustomRequest[]>(KEYS.requests, []);
  list.unshift({ ...r, id: uid(), createdAt: new Date().toISOString(), status: 'pendiente' });
  write(KEYS.requests, list);
}

export function setRequestStatus(id: string, status: CustomRequest['status'], appointmentId?: string) {
  const list = read<CustomRequest[]>(KEYS.requests, []);
  const r = list.find((x) => x.id === id);
  if (!r) return;
  r.status = status;
  if (appointmentId) r.appointmentId = appointmentId;
  write(KEYS.requests, list);
}

/** Enlace de WhatsApp a un número de Nicaragua con mensaje opcional. */
export const waLink = (digits: string, text?: string) =>
  `https://wa.me/505${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
