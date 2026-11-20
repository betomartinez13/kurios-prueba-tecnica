"use client";

import { useSearchParams } from "next/navigation";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect } from "react";

import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { ErrorState } from "@/components/ErrorState/ErrorState";
import { VisitFilters } from "@/components/VisitFilters/VisitFilters";
import { VisitTable } from "@/components/VisitTable/VisitTable";
import { ApiError } from "@/lib/api/errors";
import type { Visit, VisitFilters as Filters } from "@/lib/api/types";
import { useSchools } from "@/lib/queries/catalog";
import { useVisits } from "@/lib/queries/visits";

import styles from "./ListContainer.module.scss";

const filterParsers = {
  school: parseAsInteger,
  visit_type: parseAsStringLiteral(["CLASSROOM", "MEETING"] as const),
};

export function ListContainer() {
  const [filters, setFilters] = useQueryStates(filterParsers);
  const searchParams = useSearchParams();
  const schools = useSchools();

  // Un colegio de la URL que no está en la lista cargada es obsoleto (id inexistente): se
  // descarta sin pedirlo a la API. Si la lista de colegios falla no se bloquea el listado.
  const schoolKnown =
    filters.school === null ||
    schools.isError ||
    schools.data?.some((s) => s.id === filters.school);
  const schoolStale = filters.school !== null && schools.data !== undefined && !schoolKnown;
  const visits = useVisits(filters, schoolKnown === true);

  // Un valor inválido escrito a mano en la URL se ignora y se quita de ella.
  const rawSchool = searchParams.get("school");
  const rawType = searchParams.get("visit_type");
  useEffect(() => {
    const stale: Partial<Filters> = {};
    if (rawSchool !== null && (filters.school === null || schoolStale)) stale.school = null;
    if (rawType !== null && filters.visit_type === null) stale.visit_type = null;
    if (Object.keys(stale).length > 0) void setFilters(stale, { history: "replace" });
  }, [rawSchool, rawType, filters.school, filters.visit_type, schoolStale, setFilters]);

  const hasFilters = filters.school !== null || filters.visit_type !== null;
  const clear = () => void setFilters({ school: null, visit_type: null });

  const query = new URLSearchParams();
  if (filters.school !== null) query.set("school", String(filters.school));
  if (filters.visit_type !== null) query.set("visit_type", filters.visit_type);
  const qs = query.size > 0 ? `?${query.toString()}` : "";
  const hrefFor = (v: Visit) => `/visitas/${v.id}${qs}`;

  const count = visits.data?.length;

  let body;
  if (visits.isError) {
    const connection =
      visits.error instanceof ApiError &&
      (visits.error.kind === "network" || visits.error.kind === "server");
    body = (
      <ErrorState
        message={
          connection
            ? "No se pudo conectar con el servidor. Revisa que el backend esté en marcha y vuelve a intentarlo."
            : "No se pudieron cargar las visitas. Inténtalo de nuevo."
        }
        onRetry={() => void visits.refetch()}
      />
    );
  } else if (visits.isPending) {
    body = <VisitTable visits={[]} hrefFor={hrefFor} loading />;
  } else if (visits.data.length === 0) {
    body = hasFilters ? (
      <EmptyState
        message="No hay visitas que coincidan con estos filtros."
        action={
          <Button variant="secondary" onClick={clear}>
            Limpiar filtros
          </Button>
        }
      />
    ) : (
      <EmptyState
        message="Todavía no hay visitas registradas."
        action={<Button href="/visitas/nueva">Registrar visita</Button>}
      />
    );
  } else {
    body = <VisitTable visits={visits.data} hrefFor={hrefFor} />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Visitas</h1>
        <p className={styles.count} aria-live="polite">
          {count === undefined ? " " : count === 1 ? "1 visita" : `${count} visitas`}
        </p>
      </header>
      <VisitFilters
        schools={schools.data ?? []}
        value={filters}
        onChange={(next) => void setFilters(next)}
        onClear={clear}
      />
      {schools.isError && (
        <ErrorState
          message="No se pudo cargar la lista de colegios. Vuelve a intentarlo."
          onRetry={() => void schools.refetch()}
        />
      )}
      {body}
    </div>
  );
}
