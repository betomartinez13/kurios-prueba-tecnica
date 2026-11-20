import type { components } from "./schema";

export type Visit = components["schemas"]["VisitOutput"];
export type VisitInput = components["schemas"]["VisitInputRequest"];
export type School = components["schemas"]["School"];
export type Teacher = components["schemas"]["Teacher"];
export type VisitType = Visit["visit_type"];

export type VisitFilters = {
  school: number | null;
  visit_type: VisitType | null;
};
