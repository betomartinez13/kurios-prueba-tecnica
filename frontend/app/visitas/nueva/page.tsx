import type { Metadata } from "next";
import { Suspense } from "react";

import { NewVisitContainer } from "./NewVisitContainer";

export const metadata: Metadata = { title: "Nueva visita" };

export default function NewVisitPage() {
  return (
    // Mismo patrón que el resto de páginas: el contenedor cliente va dentro de Suspense.
    <Suspense>
      <NewVisitContainer />
    </Suspense>
  );
}
