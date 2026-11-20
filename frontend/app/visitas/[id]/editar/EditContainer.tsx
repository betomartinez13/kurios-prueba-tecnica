"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/Button/Button";
import { ErrorState } from "@/components/ErrorState/ErrorState";
import { NotFound } from "@/components/NotFound/NotFound";
import { VisitForm } from "@/components/VisitForm/VisitForm";
import { ApiError } from "@/lib/api/errors";
import type { Visit, VisitInput } from "@/lib/api/types";
import { useSchools, useTeachers } from "@/lib/queries/catalog";
import { useUpdateVisit, useVisit } from "@/lib/queries/visits";

import styles from "../../FormPage.module.scss";

export function EditContainer() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  // Se conservan los filtros del listado para que "Volver a visitas" regrese al listado filtrado.
  const query = new URLSearchParams();
  for (const key of ["school", "visit_type"]) {
    const value = searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  const qs = query.size > 0 ? `?${query.toString()}` : "";

  if (!/^\d+$/.test(params.id)) return <NotFound backHref={`/${qs}`} />;
  return <Edit id={Number(params.id)} qs={qs} />;
}

const isNotFound = (error: unknown) => error instanceof ApiError && error.kind === "not_found";

function Edit({ id, qs }: { id: number; qs: string }) {
  const visit = useVisit(id);
  // Si al guardar la API responde 404 (se eliminó desde otra pestaña), también se muestra NotFound.
  const [gone, setGone] = useState(false);
  const detailHref = `/visitas/${id}${qs}`;

  if (gone) return <NotFound backHref={`/${qs}`} />;
  // Solo si no hay datos: un refetch fallido en segundo plano no debe tirar lo que se edita.
  if (visit.isError && !visit.data) {
    if (isNotFound(visit.error)) return <NotFound backHref={`/${qs}`} />;
    return (
      <ErrorState
        message="No se pudo conectar con el servidor. Revisa que el backend esté en marcha y vuelve a intentarlo."
        onRetry={() => void visit.refetch()}
      />
    );
  }

  return (
    <div className={styles.page}>
      <Button variant="ghost" href={detailHref} className={styles.back}>
        <ArrowLeft aria-hidden="true" size="1.25em" />
        Volver a la visita
      </Button>
      <h1>Editar visita</h1>
      {visit.data ? (
        // Se monta una vez con la visita cargada: un refetch no pisa lo que se está editando.
        <EditForm
          key={id}
          visit={visit.data}
          detailHref={detailHref}
          onGone={() => setGone(true)}
        />
      ) : (
        <div className={styles.loading} role="status">
          <span className="visually-hidden">Cargando visita…</span>
        </div>
      )}
    </div>
  );
}

type EditFormProps = { visit: Visit; detailHref: string; onGone: () => void };

function EditForm({ visit, detailHref, onGone }: EditFormProps) {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<number | null>(visit.school);
  const schools = useSchools();
  const teachers = useTeachers(schoolId);
  const update = useUpdateVisit(visit.id);

  const submit = async (input: VisitInput) => {
    try {
      await update.mutateAsync(input);
      toast.success("Cambios guardados");
      router.push(detailHref);
    } catch (error) {
      // El resto de errores queda en update.error y el formulario los pinta.
      if (isNotFound(error)) onGone();
    }
  };

  return (
    <VisitForm
      mode="edit"
      defaultValues={{
        school: String(visit.school),
        teacher: String(visit.teacher),
        visit_date: visit.visit_date,
        visit_type: visit.visit_type,
        observations: visit.observations,
      }}
      // El docente de la visita puede haber cambiado de colegio: se ofrece igualmente en la
      // lista del colegio de la visita. `school` es el de la visita (la API no da el actual
      // del docente) y solo decide en qué lista aparece, no si se limpia.
      extraTeacher={{
        id: visit.teacher,
        full_name: visit.teacher_name,
        first_name: "",
        last_name: "",
        school: visit.school,
      }}
      schools={schools.data ?? []}
      schoolsError={schools.isError}
      onRetrySchools={() => void schools.refetch()}
      teachers={teachers.data ?? []}
      teachersLoading={schoolId !== null && teachers.isPending}
      teachersError={teachers.isError}
      onRetryTeachers={() => void teachers.refetch()}
      onSchoolChange={setSchoolId}
      onSubmit={submit}
      // El cliente de API siempre lanza ApiError.
      serverError={update.error instanceof ApiError ? update.error : null}
      saved={update.isSuccess}
      onCancelHref={detailHref}
    />
  );
}
