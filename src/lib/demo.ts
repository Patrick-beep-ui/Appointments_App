/**
 * Datos de ejemplo SOLO para desarrollo (botón visible en `npm run dev`).
 * Los precios son inventados.
 */
import { createAppointment, addBlock, addRequest } from './actions';
import { addDays, todayISO } from './dates';
import { clearAll, KEYS, Service, uid, write } from './store';

export function loadDemo() {
  clearAll();
  const services: Service[] = [
    { id: uid(), name: 'Corte de cabello', price: 250, durationMin: 45, artistIds: ['cintia', 'roberta'], active: true },
    { id: uid(), name: 'Lavado y secado', price: 200, durationMin: 45, artistIds: ['cintia', 'roberta'], active: true },
    { id: uid(), name: 'Alisado', price: 1200, durationMin: 150, artistIds: ['cintia', 'roberta'], active: true },
    { id: uid(), name: 'Tinte completo', price: 900, durationMin: 120, artistIds: ['cintia'], active: true },
    { id: uid(), name: 'Manicure', price: 250, durationMin: 60, artistIds: ['roberta'], active: true },
  ];
  write(KEYS.services, services);

  const d0 = todayISO();
  const d1 = addDays(d0, 1);
  const [corte, lavado, alisado, tinte, mani] = services;
  const book = (artistId: string, date: string, h: number, s: Service, name: string, wa: string) =>
    createAppointment({
      artistId,
      date,
      start: h * 60,
      durationMin: s.durationMin,
      serviceId: s.id,
      serviceName: s.name,
      price: s.price,
      client: { name, whatsapp: wa },
      source: 'web',
    });

  book('cintia', d0, 9, corte, 'Ana Martínez', '88112233');
  book('cintia', d0, 10, tinte, 'Karla Ruiz', '87654321');
  book('roberta', d0, 9.5, alisado, 'Sofía Gutiérrez', '85551234');
  book('roberta', d0, 14, mani, 'Ana Martínez', '88112233');
  book('cintia', d1, 11, alisado, 'Daniela Pérez', '89998877');
  book('roberta', d1, 15, lavado, 'Karla Ruiz', '87654321');
  addBlock({ artistId: 'cintia', date: d0, start: 12 * 60, end: 13 * 60, reason: 'Almuerzo' });
  addBlock({ artistId: 'roberta', date: d0, start: 12.5 * 60, end: 13.5 * 60, reason: 'Almuerzo' });

  addRequest({
    description: 'Mechas balayage y corte, para una boda el sábado',
    clientName: 'María López',
    whatsapp: '88888888',
    artistId: 'cintia',
    date: addDays(d0, 3),
    timeOfDay: 'manana',
  });
}

export function resetData() {
  clearAll();
}
