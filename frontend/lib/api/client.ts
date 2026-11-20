import createClient from "openapi-fetch";

import { normalizeError } from "./errors";
import type { paths } from "./schema";
import type { School, Teacher, Visit, VisitFilters, VisitInput } from "./types";

export const api = createClient<paths>({ baseUrl: "" });

type Result<T> = { data?: T; error?: unknown; response: Response };

async function call<T>(request: () => Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await request();
  } catch (thrown) {
    throw normalizeError({ thrown });
  }
  if (!result.response.ok) {
    throw normalizeError({
      response: result.response,
      error: result.error,
    });
  }
  return result.data as T;
}

export function listVisits(f: VisitFilters): Promise<Visit[]> {
  const query: { school?: number; visit_type?: Visit["visit_type"] } = {};
  if (f.school !== null) query.school = f.school;
  if (f.visit_type !== null) query.visit_type = f.visit_type;
  return call(() => api.GET("/api/visits/", { params: { query } }));
}

export function getVisit(id: number): Promise<Visit> {
  return call(() => api.GET("/api/visits/{id}/", { params: { path: { id } } }));
}

export function createVisit(body: VisitInput): Promise<Visit> {
  return call(() => api.POST("/api/visits/", { body }));
}

export function updateVisit(id: number, body: VisitInput): Promise<Visit> {
  return call(() => api.PUT("/api/visits/{id}/", { params: { path: { id } }, body }));
}

export async function deleteVisit(id: number): Promise<void> {
  await call(() => api.DELETE("/api/visits/{id}/", { params: { path: { id } } }));
}

export function listSchools(): Promise<School[]> {
  return call(() => api.GET("/api/schools/"));
}

export function listTeachers(schoolId: number): Promise<Teacher[]> {
  return call(() => api.GET("/api/teachers/", { params: { query: { school: schoolId } } }));
}
