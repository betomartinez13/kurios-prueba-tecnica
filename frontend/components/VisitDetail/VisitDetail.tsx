import { TypeBadge, visitTypeLabels } from "@/components/TypeBadge/TypeBadge";
import type { Visit } from "@/lib/api/types";
import { formatDateTimeShort, formatLongDate, formatShortDate } from "@/lib/format";

import styles from "./VisitDetail.module.scss";

const ONE_MINUTE_MS = 60_000;

export function VisitDetail({ visit }: { visit: Visit }) {
  const edited =
    new Date(visit.updated_at).getTime() - new Date(visit.created_at).getTime() > ONE_MINUTE_MS;

  return (
    <article className={styles.detail}>
      <header className={styles.header}>
        <h1>Visita del {formatShortDate(visit.visit_date)}</h1>
        <TypeBadge type={visit.visit_type} />
      </header>
      <dl className={styles.list}>
        <div className={styles.row}>
          <dt>Colegio</dt>
          <dd>{visit.school_name}</dd>
        </div>
        <div className={styles.row}>
          <dt>Docente visitado</dt>
          <dd>{visit.teacher_name}</dd>
        </div>
        <div className={styles.row}>
          <dt>Fecha</dt>
          <dd>{formatLongDate(visit.visit_date)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Tipo</dt>
          <dd>{visitTypeLabels[visit.visit_type]}</dd>
        </div>
        <div className={styles.row}>
          <dt>Observaciones</dt>
          <dd className={styles.observations}>{visit.observations}</dd>
        </div>
      </dl>
      <p className={styles.meta}>
        Registrada el {formatDateTimeShort(visit.created_at)}
        {edited && ` · Última edición el ${formatDateTimeShort(visit.updated_at)}`}
      </p>
    </article>
  );
}
