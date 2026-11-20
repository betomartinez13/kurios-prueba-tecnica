import { expect, test } from "@playwright/test";

import { createVisitViaApi, deleteVisitViaApi, fillValidForm, uniqueText } from "./helpers";

test("create a valid visit lands on its detail with toast and multiline text", async ({ page }) => {
  const obs = `${uniqueText("crear")}\nSegunda línea — ñ 🚀`;
  await page.goto("/visitas/nueva");
  await page.getByLabel("Colegio").selectOption({ label: "U.E. Monte Claro" });
  await page.getByLabel("Docente visitado").selectOption({ label: "José Medina" });
  await page.getByLabel("Fecha de la visita").fill("2026-11-02");
  await page.getByLabel("Visita en aula").check();
  await page.getByLabel("Observaciones").fill(obs);
  await page.getByRole("button", { name: "Registrar visita" }).click();
  await expect(page.getByText("Visita registrada")).toBeVisible();
  await expect(page).toHaveURL(/\/visitas\/\d+$/);
  await expect(page.getByText("Segunda línea — ñ 🚀")).toBeVisible();
});

test("empty submit shows field errors and focuses the first", async ({ page }) => {
  await page.goto("/visitas/nueva");
  await page.getByRole("button", { name: "Registrar visita" }).click();
  for (const msg of [
    "Elige un colegio.",
    "Elige el docente visitado.",
    "Indica la fecha de la visita.",
    "Elige un tipo de visita.",
    "Escribe las observaciones de la visita.",
  ])
    await expect(page.getByText(msg)).toBeVisible();
  await expect(page.getByLabel("Colegio")).toBeFocused();
});

test("changing school clears the teacher", async ({ page }) => {
  await page.goto("/visitas/nueva");
  await expect(page.getByLabel("Docente visitado")).toBeDisabled();
  await page.getByLabel("Colegio").selectOption({ label: "U.E. Los Samanes" });
  await page.getByLabel("Docente visitado").selectOption({ label: "Ana Pérez" });
  await page.getByLabel("Colegio").selectOption({ label: "Colegio El Ávila" });
  await expect(page.getByLabel("Docente visitado")).toHaveValue("");
});

test("server-side date error is shown on the field", async ({ page }) => {
  await page.goto("/visitas/nueva");
  // quitar el max del input y saltarse Zod no es posible desde la UI, así que se fuerza por la red:
  await page.route("**/api/visits/", (r) =>
    r.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ visit_date: ["La fecha de la visita no puede ser posterior a hoy."] }),
    }),
  );
  await fillValidForm(page);
  await page.getByRole("button", { name: "Registrar visita" }).click();
  await expect(page.getByText("La fecha de la visita no puede ser posterior a hoy.")).toBeVisible();
  await expect(page.getByLabel("Fecha de la visita")).toBeFocused();
});

test("edit saves changes and returns to detail", async ({ page, request }) => {
  const v = await createVisitViaApi(request);
  await page.goto(`/visitas/${v.id}/editar`);
  await expect(page.getByRole("heading", { name: "Editar visita" })).toBeVisible();
  await page.getByLabel("Observaciones").fill("Editada en e2e");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados")).toBeVisible();
  await expect(page.getByText("Editada en e2e")).toBeVisible();
});

test("editing a deleted visit shows not found", async ({ page, request }) => {
  const v = await createVisitViaApi(request);
  await page.goto(`/visitas/${v.id}/editar`);
  // Se espera a que el formulario cargue la visita: si se borra antes, la carga ya da 404.
  await expect(page.getByLabel("Observaciones")).toHaveValue(v.observations);
  await deleteVisitViaApi(request, v.id);
  await page.getByLabel("Observaciones").fill("tarde");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Esta visita no existe o fue eliminada.")).toBeVisible();
});
