import type { Metadata } from "next";
import { Suspense } from "react";

import { EditContainer } from "./EditContainer";

export const metadata: Metadata = { title: "Editar visita" };

export default function EditVisitPage() {
  return (
    // useParams lee la ruta: con cacheComponents necesita Suspense.
    <Suspense>
      <EditContainer />
    </Suspense>
  );
}
