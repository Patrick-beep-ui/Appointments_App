# Velore Salon — Appointment App

Sitio de citas para **Velore Salon** (Diriamba, Carazo). Vista de la clienta + panel de la dueña.

## Cómo correrlo

Requiere Node **20.9 o superior**; desarrollo y CI usan Node 24 (`.nvmrc`).

```bash
npm ci
npm run dev
```

Abre http://localhost:3000

Para compilar y ejecutar el resultado de producción:

```bash
npm run build
npm start
```

`npm run preview` también ejecuta el servidor de producción, después de compilar.

| Ruta         | Vista                                   |
| ------------ | --------------------------------------- |
| `/`          | Inicio (clienta)                        |
| `/reservar`  | Reservar cita + servicio personalizado  |
| `/panel`     | Panel de la dueña                       |

**Para probar rápido:** entra a `/panel`, inicia sesión (simulado), toca "Soy la dueña" y abajo
usa **"Cargar datos de ejemplo"** (solo aparece en `npm run dev`). Carga servicios, citas,
bloqueos y una solicitud con precios inventados.

## Stack

- Next.js 16 App Router + React 19 + TypeScript
- Rutas y layouts nativos de Next.js; no se utiliza React Router
- Íconos: lucide-react
- Estilos: un solo archivo CSS con variables (`src/styles.css`). Colores y tipografías en `:root`.
- Fuentes: Cormorant Garamond (títulos) y Jost (texto), desde Google Fonts.

## Estructura

```
src/
  app/                 Root layout, metadata y rutas de Next.js
    (site)/            Layout público, inicio y /reservar
    panel/             Ruta /panel; metadata noindex
  lib/config.ts        Datos fijos: nombre, ubicación, artistas, días
  lib/store.ts         Tipos + almacenamiento PROVISIONAL (localStorage)
  lib/availability.ts  Motor de disponibilidad: horas libres, regla anti‑choques
  lib/actions.ts       Crear citas, bloqueos, días libres, solicitudes (validan antes de guardar)
  lib/dates.ts         Formatos de fecha, hora y precio (C$)
  lib/demo.ts          Datos de ejemplo (solo desarrollo)
  components/          Layout público, modal, campos
  lib/browser.ts       Estado de hidratación del navegador
  views/               Home (servidor), Booking (cliente)
  panel/               Panel y pestañas (vista dueña)
public/images/         Imagen del hero (provisional: recortada de una captura)
tests/e2e/             Pruebas de flujos en Chromium móvil y escritorio
```

## Verificación y migración

```bash
npm run lint
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

Las pruebas levantan un **build de producción** y usan datos aislados de prueba.
Cubren navegación, reservas, solicitudes, login simulado, hashes del panel,
modales, persistencia y sincronización entre pestañas. CI ejecuta los mismos
controles. Opcionalmente, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` permite usar un
Chromium ya instalado en un entorno de pruebas restringido.

El [reporte de migración](docs/migration-to-next.md) registra la referencia Vite,
las decisiones, la validación y la reversión. El diseño y los contratos locales
se conservan. La home se genera en servidor; reservas y panel mantienen sus
fronteras de cliente. Las rutas desconocidas siguen redirigiendo al inicio.

**Persistencia provisional:** los datos y la sesión siguen en localStorage, sin
backend ni autenticación real. Las claves `velore:*` no cambian. El navegador
separa esos datos por origen: pasar de `localhost:5173` a `localhost:3000` o a
otro dominio no los transfiere automáticamente. `noindex` en el panel no es un
control de acceso. No se requiere configurar variables de entorno para esta
versión del prototipo.

## Funciones

### Clienta (`/reservar`)
1. **Servicio:** solo los visibles, con duración y precio.
2. **Artista:** "Cualquiera" o una específica (solo las que hacen ese servicio).
3. **Día y hora:** próximas 3 semanas. Días sin espacio aparecen desactivados; las horas se agrupan en
   Mañana / Tarde. Mínimo 1 h de anticipación.
4. **Datos:** nombre + WhatsApp → cita **confirmada al instante**.
- Servicio personalizado: formulario que llega a *Solicitudes*.

### Dueña (`/panel`)
- **Agenda:** día por día, columnas de Cintia y Roberta. Citas como bloques del tamaño de su duración,
  horas fuera de horario sombreadas, línea de "ahora". Tocar un espacio vacío crea una cita a esa hora.
  Tocar una cita: datos, recordatorio por WhatsApp, Asistió / No vino / Cancelar.
- **Nueva cita** (manual): solo ofrece horas libres; servicio del catálogo u "Otro / personalizado".
- **Bloquear horario:** almuerzos, salidas, todo el día. No deja bloquear encima de una cita.
- **Solicitudes:** escribir por WhatsApp, **Agendar** (abre Nueva cita con todo lleno) o descartar.
- **Servicios:** crear, editar, eliminar, ocultar; precio, duración y quién lo hace.
- **Horarios:** horario semanal por artista + **días libres y vacaciones**.
- **Clientas:** se crean solas (por WhatsApp), con historial, visitas y "no vino".

## Regla anti‑choques

`availability.ts` calcula los espacios libres por artista: horario semanal − días libres − citas
activas − bloqueos. `actions.createAppointment` vuelve a comprobar justo antes de guardar.
**Con un backend real esta regla también debe existir en la base de datos** (restricción de exclusión
o transacción), para que dos personas reservando al mismo segundo no choquen.

## Pendiente

- [ ] Backend real (base de datos + autenticación). Cambiar `read`/`write` de `store.ts`,
      las funciones de `actions.ts` y el login simulado de `panel/Panel.tsx`.
- [ ] Mover / reprogramar una cita (hoy: cancelar y crear otra).
- [ ] Recordatorios automáticos (hoy: botón manual de WhatsApp).
- [ ] Acceso propio para Roberta (si lo deciden).
- [ ] Reemplazar `public/images/hero-salon.jpg` por la imagen original en alta resolución.

## Supuestos (se pueden cambiar fácil)

| Supuesto | Dónde cambiarlo |
| --- | --- |
| Citas confirmadas al instante | `actions.createAppointment` (`status`) |
| Horas cada 30 min, 1 h de anticipación, 3 semanas | constantes en `availability.ts` |
| Sin tiempo entre citas | `freeSlots` en `availability.ts` |
| Clienta identificada por WhatsApp (8 dígitos, +505) | `actions.upsertClient` |

## Notas de la réplica

- El título de la agenda usa mayúscula en cada palabra ("Jueves, 12 De Noviembre"), igual que el original.
  En español lo correcto sería "Jueves, 12 de noviembre": quitar `text-transform` en `.agenda-title`.
- Las cajas de hora en *Horarios* se ensancharon un poco porque en el original se cortaba "AM/PM".
