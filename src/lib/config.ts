// Datos fijos del salón. Cambiar aquí se refleja en todo el sitio.

export const SALON = {
  name: 'Velore',
  location: 'Diriamba, Carazo, Nicaragua',
  year: 2026,
};

export type Artist = { id: string; name: string; role: string };

export const ARTISTS: Artist[] = [
  { id: 'cintia', name: 'Cintia', role: 'Fundadora y estilista' },
  { id: 'roberta', name: 'Roberta', role: 'Estilista' },
];

export const WEEKDAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;
