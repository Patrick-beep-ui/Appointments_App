import { expect, test, type Page } from '@playwright/test';

const service = { id: 'cut', name: 'Corte de prueba', price: 250, durationMin: 60, artistIds: ['cintia', 'roberta'], active: true };

async function seed(page: Page, owner = false) {
  await page.addInitScript(({ service, owner }) => {
    if (!localStorage.getItem('velore:services')) localStorage.setItem('velore:services', JSON.stringify([service]));
    if (owner && !localStorage.getItem('velore:session')) {
      localStorage.setItem('velore:session', JSON.stringify({ email: 'duena@velore.local' }));
      localStorage.setItem('velore:ownerEmail', JSON.stringify('duena@velore.local'));
    }
  }, { service, owner });
}

test.beforeEach(async ({ page }) => {
  // Stable local date/time so availability and agenda assertions do not depend
  // on the machine timezone, midnight, or Sunday opening hours.
  await page.clock.setFixedTime(new Date('2026-11-19T14:00:00-06:00'));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /hydration|did not match|Minified React/i.test(message.text())) errors.push(message.text());
  });
  // Keep a live reference for assertions after the entire flow, not a snapshot.
  runtimeErrors.set(page, errors);
});

const runtimeErrors = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? [], 'No runtime or hydration errors').toEqual([]);
});

test('public routes render HTML, preserve navigation and fit the viewport', async ({ page, request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('Tu momento de');
  expect(html).toContain('Velore Salon · Diriamba');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('belleza');
  await expect(page.getByRole('img')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'Reservar cita', exact: true }).click();
  await expect(page).toHaveURL(/\/reservar$/);
  await expect(page.getByRole('link', { name: 'Reservar', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Reservar cita', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('belleza');
});

test('owner creates a service and client books it without losing stored data', async ({ page }) => {
  await page.goto('/panel#servicios');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).first().click();
  await page.getByRole('button', { name: 'Soy la dueña, continuar' }).click();
  await expect(page.getByRole('heading', { name: 'Precios y duración' })).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo servicio', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Nombre', { exact: true }).fill(service.name);
  await page.getByLabel('Precio (C$)').fill('250');
  await page.getByLabel('Duración', { exact: true }).selectOption('60');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(service.name, { exact: true })).toBeVisible();
  await page.goto('/reservar');
  await page.getByRole('button', { name: /Corte de prueba/ }).click();
  await page.getByRole('button', { name: /^Cintia/ }).click();
  const firstSlot = page.locator('.slot').first();
  const time = await firstSlot.innerText();
  await firstSlot.click();
  await page.getByRole('button', { name: 'Confirmar cita', exact: true }).click();
  await expect(page.getByText('Escribe tu nombre.', { exact: true })).toBeVisible();
  await page.getByLabel('Tu nombre', { exact: true }).fill('Clienta Prueba');
  await page.getByLabel('WhatsApp', { exact: true }).fill('123');
  await page.getByRole('button', { name: 'Confirmar cita', exact: true }).click();
  await expect(page.getByText('Escribe tu número de WhatsApp de 8 dígitos.', { exact: true })).toBeVisible();
  await page.getByLabel('WhatsApp', { exact: true }).fill('88881111');
  await page.getByRole('button', { name: 'Confirmar cita', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¡Te esperamos, Clienta!' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('velore:appointments') ?? '[]').length)).toBe(1);
  await page.getByRole('button', { name: 'Reservar otra cita' }).click();
  await page.getByRole('button', { name: /Corte de prueba/ }).click();
  await page.getByRole('button', { name: /^Cintia/ }).click();
  await expect(page.locator('.slot').getByText(time, { exact: true })).toHaveCount(0);
  await page.goto('/panel#clientas');
  await expect(page.getByText('Clienta Prueba', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cargar datos de ejemplo' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Acceso del salón' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Acceso del salón' })).toBeVisible();
});

test('stored owner session, hash deep links and portal dialogs survive hydration', async ({ page }) => {
  await seed(page, true);
  await page.goto('/panel#servicios');
  await expect(page.getByRole('heading', { name: 'Precios y duración' })).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo servicio', exact: true }).click();
  await expect(page.getByLabel('Nombre', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await page.getByRole('button', { name: 'Agenda', exact: true }).click();
  await expect(page).toHaveURL(/#agenda$/);
  await page.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Bloquear horario', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Horarios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Horario de trabajo' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Horario de trabajo' })).toBeVisible();
  await page.evaluate(() => { location.hash = 'solicitudes'; });
  await expect(page.getByRole('heading', { name: 'Servicios personalizados' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Horario de trabajo' })).toBeVisible();
});

test('custom requests persist and reach the owner panel', async ({ page }) => {
  await seed(page, true);
  await page.goto('/reservar');
  await page.getByRole('button', { name: 'Solicitar servicio personalizado' }).click();
  await page.getByLabel('¿Qué servicio deseas?', { exact: true }).fill('Balayage de prueba');
  await page.getByLabel('Tu nombre', { exact: true }).fill('Clienta Solicitud');
  await page.getByLabel('WhatsApp', { exact: true }).fill('88882222');
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¡Solicitud enviada!' })).toBeVisible();
  await page.goto('/panel#solicitudes');
  await expect(page.getByText('Balayage de prueba', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Clienta Solicitud', { exact: true })).toBeVisible();
});

test('catalog updates from another tab without reload', async ({ page, context }) => {
  await seed(page, true);
  await page.goto('/reservar');
  await expect(page.getByRole('button', { name: /Corte de prueba/ })).toBeVisible();
  const ownerPage = await context.newPage();
  await ownerPage.goto('/panel#servicios');
  await ownerPage.getByRole('switch', { name: `${service.name} visible para clientas` }).click();
  await expect(page.getByRole('button', { name: /Corte de prueba/ })).toHaveCount(0);
  await expect(page.getByText('Pronto publicaremos nuestros servicios.')).toBeVisible();
  await ownerPage.close();
});

test('invalid stored JSON uses fallback instead of breaking hydration', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('velore:services', '{invalid'));
  await page.goto('/reservar');
  await expect(page.getByText('Pronto publicaremos nuestros servicios.')).toBeVisible();
});

test('unknown routes retain the original redirect to home', async ({ page }) => {
  await page.goto('/ruta-inexistente');
  await expect(page).toHaveURL('http://127.0.0.1:3000/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('belleza');
});
