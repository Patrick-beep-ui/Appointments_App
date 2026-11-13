// Utilidades de fechas y horas. Las fechas se manejan como 'YYYY-MM-DD'
// y las horas como minutos desde medianoche (9:30 → 570).

export const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayISO = () => toISO(new Date());

export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

/** 0 = lunes … 6 = domingo (igual que WEEKDAYS) */
export const weekdayIndex = (iso: string) => (fromISO(iso).getDay() + 6) % 7;

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const fromMin = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

export const nowMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** 570 → "9:30 a. m." */
export const fmtTime = (min: number) => {
  const h = Math.floor(min / 60);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${pad(min % 60)} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};

/** "jueves, 12 de noviembre" */
export const fmtDateLong = (iso: string) =>
  fromISO(iso).toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' });

/** Primera letra en mayúscula: "Jueves, 12 de noviembre" */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "12 nov 2026" */
export const fmtDateShort = (iso: string) =>
  fromISO(iso).toLocaleDateString('es-NI', { day: 'numeric', month: 'short', year: 'numeric' });

export const fmtWeekdayShort = (iso: string) =>
  fromISO(iso).toLocaleDateString('es-NI', { weekday: 'short' }).replace('.', '');

export const fmtMonthShort = (iso: string) =>
  fromISO(iso).toLocaleDateString('es-NI', { month: 'short' }).replace('.', '');

export const fmtDuration = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

export const fmtPrice = (n: number) => `C$ ${n.toLocaleString('es-NI')}`;

export const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360];
