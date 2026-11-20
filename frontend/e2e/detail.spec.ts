import { expect, test } from "@playwright/test";

import { createVisitViaApi } from "./helpers";

test("delete with confirmation hides the visit and its URL shows not found", async ({
  page,
  request,
}) => {
  const v = await createVisitViaApi(request);
  await page.goto(`/visitas/${v.id}`);
  await page.getByRole("button", { name: "Eliminar visita" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await dialog.getByRole("button", { name: "Eliminar visita" }).click();
  await expect(page.getByText("Visita eliminada")).toBeVisible();
  await expect(page).toHaveURL(/\/$|\/\?/);
  // El listado nunca muestra observaciones: se comprueba que no quede enlace a la visita
  // (con `?` o fin exacto, nunca un prefijo: el id 1 coincidiría con 10..19).
  await expect(
    page.locator(`a[href^="/visitas/${v.id}?"], a[href="/visitas/${v.id}"]`),
  ).toHaveCount(0);
  await page.goto(`/visitas/${v.id}`);
  await expect(page.getByText("Esta visita no existe o fue eliminada.")).toBeVisible();
});

test("back link keeps list filters", async ({ page, request }) => {
  const v = await createVisitViaApi(request, { school: 2 });
  await page.goto(`/visitas/${v.id}?school=2`);
  await page.getByRole("link", { name: "Volver a visitas" }).click();
  await expect(page).toHaveURL(/school=2/);
});

test("edit keeps list filters through save and back to the list", async ({ page, request }) => {
  const v = await createVisitViaApi(request, { school: 2 });
  await page.goto(`/visitas/${v.id}?school=2`);
  await page.getByRole("link", { name: "Editar" }).click();
  await expect(page).toHaveURL(new RegExp(`/visitas/${v.id}/editar\\?school=2`));
  await page.getByRole("button", { name: /guardar/i }).click();
  await expect(page).toHaveURL(new RegExp(`/visitas/${v.id}\\?school=2`));
  await page.getByRole("link", { name: "Volver a visitas" }).click();
  await expect(page).toHaveURL(/\/\?school=2/);
});

test("non-numeric id shows not found", async ({ page }) => {
  await page.goto("/visitas/abc");
  await expect(page.getByText("Esta visita no existe o fue eliminada.")).toBeVisible();
});
