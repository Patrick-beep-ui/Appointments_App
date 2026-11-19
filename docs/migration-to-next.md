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

Pendiente durante la implementación. Se registrarán aquí los comandos y los
flujos verificados, incluidos build y servidor de producción, persistencia,
hashes, modales, consola y controles de desarrollo.

## Reversión

Antes de mergear, cerrar la PR deja `main` intacta. Después de mergear, revertir
la PR y desplegar el artefacto anterior. No hay cambios de esquema ni datos
remotos. No borrar localStorage como parte de una reversión.
