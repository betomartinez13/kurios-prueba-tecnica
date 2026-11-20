import { Button } from "@/components/Button/Button";
import { visitTypeLabels } from "@/components/TypeBadge/TypeBadge";
import type { School, VisitFilters as Filters, VisitType } from "@/lib/api/types";

import styles from "./VisitFilters.module.scss";

type Props = {
  schools: School[];
  value: Filters;
  onChange: (next: Filters) => void;
  onClear: () => void;
};

export function VisitFilters({ schools, value, onChange, onClear }: Props) {
  const active = value.school !== null || value.visit_type !== null;

  return (
    <div className={styles.filters}>
      <div className={styles.field}>
        <label htmlFor="filtro-colegio">Colegio</label>
        <select
          id="filtro-colegio"
          className={styles.select}
          value={value.school ?? ""}
          onChange={(e) =>
            onChange({ ...value, school: e.target.value === "" ? null : Number(e.target.value) })
          }
        >
          <option value="">Todos los colegios</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="filtro-tipo">Tipo</label>
        <select
          id="filtro-tipo"
          className={styles.select}
          value={value.visit_type ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              visit_type: e.target.value === "" ? null : (e.target.value as VisitType),
            })
          }
        >
          <option value="">Todos los tipos</option>
          {(Object.keys(visitTypeLabels) as VisitType[]).map((type) => (
            <option key={type} value={type}>
              {visitTypeLabels[type]}
            </option>
          ))}
        </select>
      </div>
      {active && (
        <Button variant="ghost" onClick={onClear}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
