import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";
import { createVisit, deleteVisit, getVisit, listVisits, updateVisit } from "@/lib/api/client";
import type { VisitFilters, VisitInput } from "@/lib/api/types";
import { visitKeys } from "./keys";

export function useVisits(f: VisitFilters, enabled = true) {
  return useQuery({
    queryKey: visitKeys.list(f),
    queryFn: () => listVisits(f),
    enabled,
  });
}

export function useVisit(id: number) {
  return useQuery({
    queryKey: visitKeys.detail(id),
    queryFn: () => getVisit(id),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.kind === "not_found") && failureCount < 1,
  });
}

function useInvalidateVisits() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: visitKeys.all });
}

export function useCreateVisit() {
  const invalidate = useInvalidateVisits();
  return useMutation({
    mutationFn: (body: VisitInput) => createVisit(body),
    onSuccess: invalidate,
  });
}

export function useUpdateVisit(id: number) {
  const invalidate = useInvalidateVisits();
  return useMutation({
    mutationFn: (body: VisitInput) => updateVisit(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteVisit() {
  const invalidate = useInvalidateVisits();
  return useMutation({
    mutationFn: (id: number) => deleteVisit(id),
    onSuccess: invalidate,
  });
}
