import { expect, test } from "@playwright/test";
import { createVisitViaApi, deleteVisitViaApi } from "./helpers";

test("los helpers crean y borran una visita a través del proxy", async ({ request }) => {
  const visit = await createVisitViaApi(request);
  expect(visit.id).toBeGreaterThan(0);
  expect(visit.observations).toMatch(/^e2e-/);
  await deleteVisitViaApi(request, visit.id);
  const gone = await request.get(`/api/visits/${visit.id}/`);
  expect(gone.status()).toBe(404);
});
