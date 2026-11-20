import type { Metadata } from "next";
import { Suspense } from "react";

import { DetailContainer } from "./DetailContainer";

export const metadata: Metadata = { title: "Visita" };

export default function VisitDetailPage() {
  return (
    // useParams / useSearchParams leen la ruta: con cacheComponents necesitan Suspense.
    <Suspense>
      <DetailContainer />
    </Suspense>
  );
}
