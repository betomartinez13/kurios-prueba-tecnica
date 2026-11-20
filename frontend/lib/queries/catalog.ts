import { useQuery } from "@tanstack/react-query";
import { listSchools, listTeachers } from "@/lib/api/client";
import { catalogKeys } from "./keys";

const FIVE_MINUTES = 5 * 60 * 1000;

export function useSchools() {
  return useQuery({
    queryKey: catalogKeys.schools,
    queryFn: listSchools,
    staleTime: FIVE_MINUTES,
  });
}

export function useTeachers(schoolId: number | null) {
  return useQuery({
    queryKey: catalogKeys.teachers(schoolId ?? -1),
    queryFn: () => listTeachers(schoolId as number),
    enabled: schoolId !== null,
    staleTime: FIVE_MINUTES,
  });
}
