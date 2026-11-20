"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/Button/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { ErrorState } from "@/components/ErrorState/ErrorState";
import { NotFound } from "@/components/NotFound/NotFound";
import { VisitDetail } from "@/components/VisitDetail/VisitDetail";
import { ApiError } from "@/lib/api/errors";
import { useDeleteVisit, useVisit } from "@/lib/queries/visits";

import styles from "./DetailContainer.module.scss";

export function DetailContainer() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  // Solo se conservan los filtros del listado; el resto de la query se descarta.
  const query = new URLSearchParams();
  for (const key of ["school", "visit_type"]) {
    const value = searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  const qs = query.size > 0 ? `?${query.toString()}` : "";

  if (!/^\d+$/.test(params.id)) return <NotFound backHref={`/${qs}`} />;
  return <Detail id={Number(params.id)} qs={qs} />;
}

function Detail({ id, qs }: { id: number; qs: string }) {
  const router = useRouter();
  const visit = useVisit(id);
  const remove = useDeleteVisit();
  const [confirming, setConfirming] = useState(false);

  const backHref = `/${qs}`;

  const confirmDelete = () =>
    remove.mutate(id, {
      onSuccess: () => {
        toast.success("Visita eliminada");
        router.push(backHref);
      },
      onError: () => {
        setConfirming(false);
        toast.error("No se pudo eliminar la visita. Inténtalo de nuevo.");
      },
    });

  // Tras eliminar, la invalidación vuelve a pedir la visita y recibiría un 404: se sigue
  // mostrando el detalle hasta que la navegación al listado termine.
  const deleted = remove.isSuccess;

  if (!deleted && visit.isError) {
    if (visit.error instanceof ApiError && visit.error.kind === "not_found") {
      return <NotFound backHref={backHref} />;
    }
    return (
      <ErrorState
        message="No se pudo conectar con el servidor. Revisa que el backend esté en marcha y vuelve a intentarlo."
        onRetry={() => void visit.refetch()}
      />
    );
  }

  return (
    <div className={styles.page}>
      <Button variant="ghost" href={backHref} className={styles.back}>
        <ArrowLeft aria-hidden="true" size="1.25em" />
        Volver a visitas
      </Button>
      {visit.data ? (
        <>
          <VisitDetail visit={visit.data} />
          <div className={styles.actions}>
            <Button href={`/visitas/${id}/editar`}>Editar</Button>
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              Eliminar visita
            </Button>
          </div>
          <ConfirmDialog
            open={confirming}
            title="¿Eliminar esta visita?"
            body="Dejará de aparecer en el listado."
            confirmLabel="Eliminar visita"
            onConfirm={confirmDelete}
            onCancel={() => setConfirming(false)}
            busy={remove.isPending || deleted}
          />
        </>
      ) : (
        <div className={styles.loading} aria-busy="true" aria-label="Cargando visita" />
      )}
    </div>
  );
}
