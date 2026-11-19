# Migración de Velore Salon a Next.js

## Referencia y alcance

- Origen: `5612612cf9901aa74ebe4ccc858039108a1c8257` (`main`).
- Destino: `migrate-to-next`, PR hacia `main`.
- El build original (`tsc && vite build`) pasa en Node 24.22.3.
- No hay instrucciones AGENTS.md ni suite de tests existente en el repositorio.
- Se preservan diseño, textos, imagen, fuentes, disponibilidad, reglas de citas,
  claves `velore:*`, login simulado, panel y utilidades de desarrollo.
- No hay Supabase, secretos, API ni autenticación real que migrar. El dominio
  de producción no está configurado; no se inventan canonical ni sitemap.

## Inventario y decisiones

| Origen | Destino | Comprobación |
| --- | --- | --- |
| `/` | `app/(site)/page.tsx` | HTML público, CTA, diseño móvil/escritorio. |
| `/reservar` | `app/(site)/reservar/page.tsx` | Catálogo local, reserva, solicitud y persistencia. |
| `/panel` y hashes | `app/panel/page.tsx` | Sesión simulada, pestañas, refresh y deep links. |
| Catch-all → inicio | `app/not-found.tsx` → inicio | Se mantiene el fallback existente. |
| `BrowserRouter` / `Link` / `NavLink` | App Router / `next/link` / navegación activa | No queda un router SPA dentro de Next. |
| `index.html`, bootstrap | Root layout y metadata | Español, título, descripción y fuentes existentes. |
| `#root` | Wrapper `.app-root` | Mantener flex y altura del diseño sin un root SPA. |
| Estado local y DOM | Fronteras de cliente y lectura tras hidratación | No leer storage/hash durante SSR ni mostrar sesiones falsas. |

Se utiliza Next.js 16 estable, con versiones exactas registradas en el lockfile,
React compatible y Node >=20.9.0. Se conserva CSS normal, sin agregar Tailwind
ni cambiar el sistema visual. La home y el layout público se renderizan en
servidor; las reservas y el panel siguen siendo interactivas y usan el mismo
almacenamiento provisional. El panel espera el montaje antes de resolver la
sesión y el hash; no se desactiva SSR globalmente.

## Secuencia de commits

1. Inventario, alcance y plan con referencia recuperable.
2. Base Next.js, TypeScript, scripts, lint y configuración reproducible.
3. Rutas App Router, layout, enlaces, metadata y conservación de estilos.
4. Adaptaciones SSR de storage, sesión, hash y modales.
5. Pruebas de flujos, documentación final y CI.

## Riesgos y límites conservados

Los datos viven en un navegador y origen concretos; cambiar de dominio/puerto
no transfiere localStorage automáticamente. Se conservan nombres y formato de
las claves. La sesión de demostración no es autenticación y la validación de
disponibilidad del navegador no impide concurrencia entre clientes reales.
La aplicación sigue siendo un prototipo hasta conectar un backend adecuado.

Las fuentes siguen cargándose desde Google Fonts como en el prototipo. No se
requieren descargas de fuentes durante el build. Las imágenes conservan sus
rutas públicas y su comportamiento responsive.

## Validación final

| Control ejecutado | Resultado |
| --- | --- |
| `pnpm lint` | Pasa, sin errores ni warnings. |
| `pnpm typecheck` | Pasa, incluidos configuración y tests E2E. |
| `next build` | Pasa; `/`, `/reservar` y `/panel` prerenderizan sin acceso al DOM en servidor. |
| `pnpm test:e2e` | 14 pruebas pasan contra build + servidor de producción. |
| Navegación y refresh | Enlaces activos, back, entrada directa y fallback a inicio conservados. |
| Dueña → servicio → reserva → clienta | Validación de campos, confirmación, persistencia y horario ocupado comprobados. |
| Solicitud personalizada → panel | Comprobada tras navegación y refresh. |
| Sesión guardada, hashes y modales | Deep links, cambio de hash, cierre con Escape, foco y scroll del body comprobados. |
| Storage | Cambios de catálogo entre pestañas y JSON inválido comprobados. |
| Producción | Botones de cargar/borrar datos de desarrollo ausentes. |
| Consola | Sin errores de ejecución o hidratación detectados por los flujos E2E. |
| Comparación visual | 8 pares de capturas idénticos píxel a píxel en el entorno de prueba. |

La comparación visual se realizó contra `dist` generado por el build Vite
original antes de modificar el código. Se compararon inicio, catálogo de
reservas, agenda y servicios del panel a 1280 y 390 px, con iguales fixtures,
fecha/hora y zona `America/Managua`. No prueba todas las pantallas ni otros
navegadores. Los tests usan Chromium y contextos aislados; no envían mensajes
reales ni modifican datos de usuarios.

En este entorno el Chromium del sistema no pudo arrancar por restricciones de
sockets. Las pruebas se ejecutaron con Chrome Headless Shell instalado desde
un paquete de npm y `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium`.
Ese ejecutable y sus dependencias temporales no forman parte de la aplicación.
CI instala el Chromium estándar mediante Playwright.

Se conservaron dos efectos puntuales de Booking que seleccionan automáticamente
el día e invalidan una hora ocupada; sus excepciones de lint están documentadas
en esas líneas, sin desactivar reglas globales ni controles de TypeScript. Los
cambios de entidades HTML de tres textos no alteran su presentación.

### Detalles del destino

- Next.js `16.4.6`, React/React DOM `19.3.1`; dependencias reproducibles con pnpm y `pnpm-lock.yaml`.
- La carpeta `src/pages` se renombró a `src/views` para no crear accidentalmente
  rutas del Pages Router al conservar los componentes de vista.
- `useSyncExternalStore` utiliza un snapshot de servidor estable y strings de
  storage para evitar discrepancias de hidratación y snapshots de objeto inestables.
- El panel espera la hidratación antes de presentar su sesión local y agenda.
- Los cambios de hash preservan el estado de navegación de Next.
- Los portales solo acceden a `document.body` después del montaje.
- La imagen usa sus dimensiones originales y conserva la URL pública sin
  optimización remota; la comparación visual confirma el mismo recorte.
- No hay runtime Vite, React Router, `import.meta.env`, catch-all SPA ni
  `ignoreBuildErrors` en el destino.

El resultado sigue siendo una demo local: esta PR no implementa backend,
autenticación real, sincronización entre dispositivos ni despliegue productivo.

## Gestor de paquetes

El proyecto usa pnpm `10.34.9`, fijado en `packageManager`. El lockfile original
se convierte con `pnpm import` antes de retirar `package-lock.json`. Local y CI
usan `pnpm install --frozen-lockfile`; los tests arrancan Next con pnpm.
`pnpm-workspace.yaml` permite únicamente los instaladores nativos de `sharp`
y `unrs-resolver`. El cambio no requiere modificar la versión mínima de Node.

## Reversión del framework

Antes de mergear, cerrar la PR deja `main` intacta. Después de mergear, revertir
la PR y desplegar el artefacto anterior. No hay cambios de esquema ni datos
remotos. No borrar localStorage como parte de una reversión.
