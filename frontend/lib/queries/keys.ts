import type { VisitFilters } from "@/lib/api/types";

export const visitKeys = {
  all: ["visits"] as const,
  list: (f: VisitFilters) => [...visitKeys.all, "list", f] as const,
  detail: (id: number) => [...visitKeys.all, "detail", id] as const,
};

export const catalogKeys = {
  schools: ["schools"] as const,
  teachers: (schoolId: number) => ["teachers", schoolId] as const,
};
