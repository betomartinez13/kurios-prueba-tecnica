import type { Metadata } from "next";
import { Suspense } from "react";

import { ListContainer } from "./ListContainer";

export const metadata: Metadata = {
  // La plantilla "%s · Kurios" del layout raíz solo se aplica a los segmentos hijos,
  // no a la página de su mismo segmento, así que aquí se escribe el título completo.
  title: { absolute: "Visitas · Kurios" },
};

export default function VisitsPage() {
  return (
    // useQueryStates / useSearchParams leen la URL: con cacheComponents necesitan Suspense.
    <Suspense>
      <ListContainer />
    </Suspense>
  );
}
