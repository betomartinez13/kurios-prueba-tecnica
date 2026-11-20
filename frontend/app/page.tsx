import type { Metadata } from "next";

export const metadata: Metadata = {
  // La plantilla "%s · Kurios" del layout raíz solo se aplica a los segmentos hijos,
  // no a la página de su mismo segmento, así que aquí se escribe el título completo.
  title: { absolute: "Visitas · Kurios" },
};

export default function VisitsPage() {
  return <h1>Visitas</h1>;
}
