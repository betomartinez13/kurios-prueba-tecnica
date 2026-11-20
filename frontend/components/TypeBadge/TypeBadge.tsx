import type { VisitType } from "@/lib/api/types";

import styles from "./TypeBadge.module.scss";

export const visitTypeLabels: Record<VisitType, string> = {
  CLASSROOM: "Visita en aula",
  MEETING: "Encuentro",
};

export function TypeBadge({ type }: { type: VisitType }) {
  const tone = type === "CLASSROOM" ? styles.classroom : styles.meeting;
  return (
    <span className={`${styles.badge} ${tone}`}>
      <span className={styles.dot} aria-hidden="true" />
      {visitTypeLabels[type]}
    </span>
  );
}
