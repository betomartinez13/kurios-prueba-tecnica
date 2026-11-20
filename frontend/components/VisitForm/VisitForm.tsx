"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/Button/Button";
import { visitTypeLabels } from "@/components/TypeBadge/TypeBadge";
import type { ApiError } from "@/lib/api/errors";
import type { School, Teacher, VisitInput, VisitType } from "@/lib/api/types";
import {
  countChars,
  OBSERVATIONS_MAX,
  toVisitInput,
  visitSchema,
  type VisitFormOutput,
  type VisitFormValues,
} from "@/lib/forms/visitSchema";
import { todayISO } from "@/lib/today";

import styles from "./VisitForm.module.scss";

const FIELDS = ["school", "teacher", "visit_date", "visit_type", "observations"] as const;
type FieldName = (typeof FIELDS)[number];

const ids: Record<FieldName, string> = {
  school: "visita-colegio",
  teacher: "visita-docente",
  visit_date: "visita-fecha",
  visit_type: "visita-tipo",
  observations: "visita-observaciones",
};
const errorId = (field: FieldName) => `${ids[field]}-error`;
const COUNTER_ID = "visita-observaciones-contador";

const GENERIC_ERROR = "No se pudo guardar la visita. Revisa tu conexión e inténtalo de nuevo.";

const noopSubscribe = () => () => {};

type Props = {
  mode: "create" | "edit";
  defaultValues?: Partial<VisitFormValues>;
  /** Docente actual de una visita antigua: aparece aunque ya no figure en su colegio. */
  extraTeacher?: Teacher;
  schools: School[];
  /** Docentes del colegio elegido; el contenedor los carga a partir de `onSchoolChange`. */
  teachers: Teacher[];
  teachersLoading: boolean;
  onSchoolChange: (schoolId: number | null) => void;
  onSubmit: (values: VisitInput) => Promise<void>;
  serverError?: ApiError | null;
  /** Tras guardar con éxito el botón sigue bloqueado mientras se navega. */
  saved?: boolean;
  onCancelHref: string;
};

export function VisitForm({
  mode,
  defaultValues,
  extraTeacher,
  schools,
  teachers,
  teachersLoading,
  onSchoolChange,
  onSubmit,
  serverError,
  saved = false,
  onCancelHref,
}: Props) {
  const {
    control,
    register,
    handleSubmit,
    getValues,
    setError,
    setFocus,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VisitFormValues, unknown, VisitFormOutput>({
    resolver: zodResolver(visitSchema),
    mode: "onBlur",
    // RHF enfoca según el orden de registro, y Controller registra después que `register`:
    // el foco se mueve a mano siguiendo el orden visual de los campos.
    shouldFocusError: false,
    defaultValues: {
      school: "",
      teacher: "",
      visit_date: "",
      observations: "",
      ...defaultValues,
    },
  });

  // "Hoy" solo existe en el navegador: en el prerender no se fija un max.
  const today = useSyncExternalStore(noopSubscribe, todayISO, () => undefined);
  const school = useWatch({ control, name: "school" });
  const observations = useWatch({ control, name: "observations" }) ?? "";

  const teacherOptions =
    extraTeacher &&
    String(extraTeacher.school) === school &&
    !teachers.some((t) => t.id === extraTeacher.id)
      ? [...teachers, extraTeacher]
      : teachers;
  const noTeachers = school !== "" && !teachersLoading && teacherOptions.length === 0;
  const teacherDisabled = school === "" || teachersLoading || noTeachers;
  const teacherPlaceholder =
    school === ""
      ? "Primero elige un colegio"
      : teachersLoading
        ? "Cargando docentes…"
        : noTeachers
          ? "Este colegio no tiene docentes registrados"
          : "Selecciona un docente";

  const changeSchool = (next: string) => {
    onSchoolChange(next === "" ? null : Number(next));
    // El docente se limpia si no pertenece al colegio nuevo.
    const teacherId = getValues("teacher");
    const current = teacherOptions.find((t) => String(t.id) === teacherId);
    if (teacherId !== "" && String(current?.school) !== next) setValue("teacher", "");
  };

  // La barra de navegación es sticky: el campo se centra para que no quede debajo de ella.
  const focusFirst = useCallback(
    (invalidFields: Partial<Record<FieldName, unknown>>) => {
      const first = FIELDS.find((field) => invalidFields[field]);
      if (!first) return;
      setFocus(first);
      document.activeElement?.scrollIntoView({ block: "center" });
    },
    [setFocus],
  );

  // Errores de la API: los de campo van a su campo; el resto, al aviso de arriba.
  useEffect(() => {
    if (serverError?.kind !== "validation") return;
    for (const field of FIELDS) {
      const message = serverError.fields[field]?.[0];
      if (message) setError(field, { type: "server", message });
    }
    focusFirst(serverError.fields);
  }, [serverError, setError, focusFirst]);

  let notice: string[] = [];
  if (serverError?.kind === "validation") {
    const otherFields = Object.entries(serverError.fields)
      .filter(([key]) => !(FIELDS as readonly string[]).includes(key))
      .flatMap(([, messages]) => messages);
    notice = [...serverError.nonField, ...otherFields];
  } else if (serverError) {
    notice = [GENERIC_ERROR];
  }

  const invalid = (field: FieldName) => (errors[field] ? true : undefined);
  const describedBy = (field: FieldName, ...extra: string[]) =>
    [...extra, errors[field] ? errorId(field) : ""].filter(Boolean).join(" ") || undefined;

  const chars = countChars(observations);
  const busy = isSubmitting || saved;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(toVisitInput(values)), focusFirst)}
    >
      {notice.length > 0 && (
        <div className={styles.notice} role="alert">
          <CircleAlert aria-hidden="true" size="1.25em" className={styles.noticeIcon} />
          <ul className={styles.noticeList}>
            {notice.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor={ids.school} className={styles.label}>
          Colegio
          <Required />
        </label>
        <Controller
          control={control}
          name="school"
          render={({ field }) => (
            <select
              ref={field.ref}
              id={ids.school}
              name={field.name}
              className={styles.control}
              value={field.value}
              onBlur={field.onBlur}
              onChange={(e) => {
                field.onChange(e.target.value);
                changeSchool(e.target.value);
              }}
              aria-required="true"
              aria-invalid={invalid("school")}
              aria-describedby={describedBy("school")}
            >
              <option value="">Selecciona un colegio</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        />
        <FieldError id={errorId("school")} message={errors.school?.message} />
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.teacher} className={styles.label}>
          Docente visitado
          <Required />
        </label>
        <Controller
          control={control}
          name="teacher"
          render={({ field }) => (
            <select
              ref={field.ref}
              id={ids.teacher}
              name={field.name}
              className={styles.control}
              value={field.value}
              onBlur={field.onBlur}
              onChange={(e) => field.onChange(e.target.value)}
              // Se deshabilita en el elemento, no en RHF, para que siga validándose.
              disabled={teacherDisabled}
              aria-required="true"
              aria-invalid={invalid("teacher")}
              aria-describedby={describedBy("teacher")}
            >
              <option value="">{teacherPlaceholder}</option>
              {!teacherDisabled &&
                teacherOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
            </select>
          )}
        />
        <FieldError id={errorId("teacher")} message={errors.teacher?.message} />
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.visit_date} className={styles.label}>
          Fecha de la visita
          <Required />
        </label>
        <input
          id={ids.visit_date}
          type="date"
          className={`${styles.control} ${styles.date}`}
          min="2000-01-01"
          max={today}
          aria-required="true"
          aria-invalid={invalid("visit_date")}
          aria-describedby={describedBy("visit_date")}
          {...register("visit_date")}
        />
        <FieldError id={errorId("visit_date")} message={errors.visit_date?.message} />
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>
          Tipo de visita
          <Required />
        </legend>
        <div className={styles.radios}>
          {(Object.keys(visitTypeLabels) as VisitType[]).map((type) => (
            <label key={type} className={styles.radio}>
              <input
                type="radio"
                value={type}
                aria-describedby={describedBy("visit_type")}
                {...register("visit_type")}
              />
              {visitTypeLabels[type]}
            </label>
          ))}
        </div>
        <FieldError id={errorId("visit_type")} message={errors.visit_type?.message} />
      </fieldset>

      <div className={styles.field}>
        <label htmlFor={ids.observations} className={styles.label}>
          Observaciones
          <Required />
        </label>
        <textarea
          id={ids.observations}
          className={`${styles.control} ${styles.textarea}`}
          rows={6}
          aria-required="true"
          aria-invalid={invalid("observations")}
          aria-describedby={describedBy("observations", COUNTER_ID)}
          {...register("observations")}
        />
        <div className={styles.below}>
          <FieldError id={errorId("observations")} message={errors.observations?.message} />
          <p
            id={COUNTER_ID}
            className={`${styles.counter} ${chars > OBSERVATIONS_MAX ? styles.over : ""}`}
          >
            {chars} / {OBSERVATIONS_MAX}
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="submit" disabled={busy || noTeachers}>
          {busy ? "Guardando…" : mode === "create" ? "Registrar visita" : "Guardar cambios"}
        </Button>
        <Button variant="ghost" href={onCancelHref}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Required() {
  return (
    <span className={styles.required} aria-hidden="true">
      {" *"}
    </span>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={styles.error}>
      <CircleAlert aria-hidden="true" size="1.1em" className={styles.errorIcon} />
      {message}
    </p>
  );
}
