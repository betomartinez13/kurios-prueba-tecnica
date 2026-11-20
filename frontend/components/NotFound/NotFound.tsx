import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";

/** Pantalla común a /visitas/[id] y /visitas/[id]/editar. `backHref` conserva los filtros. */
export function NotFound({ backHref = "/" }: { backHref?: string }) {
  return (
    <EmptyState
      message="Esta visita no existe o fue eliminada."
      action={<Button href={backHref}>Volver a visitas</Button>}
    />
  );
}
