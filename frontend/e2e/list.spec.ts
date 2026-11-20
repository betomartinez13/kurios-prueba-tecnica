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
  await expect(
    page.locator(`a[href="/visitas/${v.id}?school=2&visit_type=MEETING"]`),
  ).toBeVisible();
  const rows = page.getByRole("row").filter({ hasNot: page.getByRole("columnheader") });
  expect(await rows.count()).toBeGreaterThan(0);
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

test("unknown school id in the URL is ignored and removed", async ({ page }) => {
  await page.goto("/?school=999");
  await expect(page).not.toHaveURL(/school=/);
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("No se pudo conectar con el servidor")).toHaveCount(0);
});

test("each row exposes a single link to the detail", async ({ page, request }) => {
  const v = await createVisitViaApi(request);
  await page.goto("/");
  const rows = page.getByRole("row").filter({ hasNot: page.getByRole("columnheader") });
  await expect(rows.first()).toBeVisible();
  const all = await rows.all();
  expect(all.length).toBeGreaterThan(0);
  for (const row of all) {
    await expect(row.getByRole("link")).toHaveCount(1);
    await expect(row.getByRole("link")).toHaveAccessibleName(/^.+, ver visita$/);
  }
  const link = page.locator(`a[href="/visitas/${v.id}"]`);
  await expect(link).toHaveAccessibleName(/^\d{1,2} \p{L}+ \d{4}, ver visita$/u);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/visitas/${v.id}$`));
});
