"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/Button/Button";
import { VisitForm } from "@/components/VisitForm/VisitForm";
import { ApiError } from "@/lib/api/errors";
import type { VisitInput } from "@/lib/api/types";
import { useSchools, useTeachers } from "@/lib/queries/catalog";
import { useCreateVisit } from "@/lib/queries/visits";

import styles from "../FormPage.module.scss";

export function NewVisitContainer() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const schools = useSchools();
  const teachers = useTeachers(schoolId);
  const create = useCreateVisit();

  const submit = async (input: VisitInput) => {
    try {
      const visit = await create.mutateAsync(input);
      toast.success("Visita registrada");
      router.push(`/visitas/${visit.id}`);
    } catch {
      // El error queda en create.error y el formulario lo pinta.
    }
  };

  return (
    <div className={styles.page}>
      <Button variant="ghost" href="/" className={styles.back}>
        <ArrowLeft aria-hidden="true" size="1.25em" />
        Volver a visitas
      </Button>
      <h1>Registrar visita</h1>
      <VisitForm
        mode="create"
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
        serverError={create.error instanceof ApiError ? create.error : null}
        saved={create.isSuccess}
        onCancelHref="/"
      />
    </div>
  );
}
