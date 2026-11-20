import { expect, test } from "@playwright/test";
import { createVisitViaApi } from "./helpers";

test("filters apply on change, live in the URL and survive reload", async ({ page, request }) => {
  const v = await createVisitViaApi(request, { school: 2, teacher: 4, visit_type: "MEETING" });
  await page.goto("/");
  await page.getByLabel("Colegio").selectOption({ label: "Colegio El Ávila" });
  await page.getByLabel("Tipo").selectOption({ label: "Encuentro" });
  await expect(page).toHaveURL(/school=2/);
  await expect(page).toHaveURL(/visit_type=MEETING/);
  await page.reload();
  await expect(page.locator(`a[href^="/visitas/${v.id}"]`)).toBeVisible();
  const rows = page.getByRole("row").filter({ hasNot: page.getByRole("columnheader") });
  for (const row of await rows.all()) {
    await expect(row).toContainText("Colegio El Ávila");
    await expect(row).toContainText("Encuentro");
  }
  await expect(page.getByText(/\d+ visitas?/)).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page).not.toHaveURL(/school=/);
});

test("invalid filter in the URL is ignored and removed", async ({ page }) => {
  await page.goto("/?visit_type=XYZ");
  await expect(page).not.toHaveURL(/visit_type/);
  await expect(page.getByRole("table")).toBeVisible();
});

test("each row exposes a single link to the detail", async ({ page, request }) => {
  await createVisitViaApi(request);
  await page.goto("/");
  await page
    .getByRole("link", { name: /ver visita/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/visitas\/\d+/);
});
