import type { APIRequestContext, Page } from "@playwright/test";
import type { Visit, VisitInput } from "../lib/api/types";

export function uniqueText(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random()}`;
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export async function createVisitViaApi(
  request: APIRequestContext,
  overrides: Partial<VisitInput> = {},
): Promise<Visit> {
  const response = await request.post("/api/visits/", {
    data: {
      school: 2,
      teacher: 4,
      visit_date: yesterdayISO(),
      visit_type: "MEETING",
      observations: uniqueText("e2e"),
      ...overrides,
    },
  });
  if (!response.ok()) {
    throw new Error(`createVisitViaApi: ${response.status()} ${await response.text()}`);
  }
  return (await response.json()) as Visit;
}

export async function deleteVisitViaApi(request: APIRequestContext, id: number): Promise<void> {
  const response = await request.delete(`/api/visits/${id}/`);
  if (!response.ok()) {
    throw new Error(`deleteVisitViaApi: ${response.status()}`);
  }
}

export async function fillValidForm(
  page: Page,
  overrides: {
    school?: string;
    teacher?: string;
    date?: string;
    type?: "Visita en aula" | "Encuentro";
    observations?: string;
  } = {},
): Promise<void> {
  const {
    school = "U.E. Monte Claro",
    teacher = "José Medina",
    date = "2026-11-02",
    type = "Visita en aula",
    observations = uniqueText("form"),
  } = overrides;
  await page.getByLabel("Colegio").selectOption({ label: school });
  await page.getByLabel("Docente visitado").selectOption({ label: teacher });
  await page.getByLabel("Fecha de la visita").fill(date);
  await page.getByLabel(type).check();
  await page.getByLabel("Observaciones").fill(observations);
}
