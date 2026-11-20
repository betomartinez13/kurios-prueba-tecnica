import Link from "next/link";

import { TypeBadge } from "@/components/TypeBadge/TypeBadge";
import type { Visit } from "@/lib/api/types";
import { formatShortDate } from "@/lib/format";

import styles from "./VisitTable.module.scss";

type Props = {
  visits: Visit[];
  hrefFor: (v: Visit) => string;
  loading?: boolean;
};

const GHOST_ROWS = [0, 1, 2];

export function VisitTable({ visits, hrefFor, loading = false }: Props) {
  return (
    <div className={styles.card}>
      <table className={styles.table} aria-busy={loading}>
        <thead className={styles.head}>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Colegio</th>
            <th scope="col">Docente</th>
            <th scope="col">Tipo</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? GHOST_ROWS.map((i) => (
                <tr key={i} className={styles.row} aria-hidden="true">
                  <td className={styles.date}>
                    <span className={styles.ghost} />
                  </td>
                  <td className={styles.school}>
                    <span className={styles.ghost} />
                  </td>
                  <td className={styles.teacher}>
                    <span className={styles.ghost} />
                  </td>
                  <td className={styles.type}>
                    <span className={styles.ghost} />
                  </td>
                </tr>
              ))
            : visits.map((v) => {
                const date = formatShortDate(v.visit_date);
                return (
                  <tr key={v.id} className={`${styles.row} ${styles.interactive}`}>
                    <td className={styles.date}>
                      <Link
                        href={hrefFor(v)}
                        className={styles.link}
                        aria-label={`${date}, ver visita`}
                      >
                        {date}
                      </Link>
                    </td>
                    <td className={styles.school}>{v.school_name}</td>
                    <td className={styles.teacher}>{v.teacher_name}</td>
                    <td className={styles.type}>
                      <TypeBadge type={v.visit_type} />
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
