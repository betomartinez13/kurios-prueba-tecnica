import { z } from "zod";

import type { VisitInput } from "@/lib/api/types";
import { todayISO } from "@/lib/today";

export const OBSERVATIONS_MAX = 5000;

/** Cuenta caracteres como el backend (puntos de código), no unidades UTF-16: 🚀 cuenta 1. */
export function countChars(text: string): number {
  return [...text].length;
}

// Solo ayuda de UX: repite reglas del backend para responder sin ida y vuelta.
// La autoridad es la API; sus errores se pintan en el campo correspondiente.
// Cada tipo base lleva el mensaje para que null/undefined (radio sin marcar, select
// deshabilitado) también muestren el texto en español.
export const visitSchema = z.object({
  school: z.string({ error: "Elige un colegio." }).min(1, "Elige un colegio."),
  teacher: z.string({ error: "Elige el docente visitado." }).min(1, "Elige el docente visitado."),
  visit_date: z
    .string({ error: "Indica la fecha de la visita." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Indica la fecha de la visita.")
    .refine((v) => v >= "2000-01-01", "Revisa la fecha: parece demasiado antigua.")
    // En un refine para que "hoy" se calcule al validar y no al cargar el módulo.
    .refine((v) => v <= todayISO(), "La fecha de la visita no puede ser posterior a hoy."),
  visit_type: z.enum(["CLASSROOM", "MEETING"], { error: "Elige un tipo de visita." }),
  observations: z
    .string({ error: "Escribe las observaciones de la visita." })
    .trim()
    .min(1, "Escribe las observaciones de la visita.")
    .refine((v) => countChars(v) <= OBSERVATIONS_MAX, "Máximo 5000 caracteres."),
});

export type VisitFormValues = z.input<typeof visitSchema>;
export type VisitFormOutput = z.output<typeof visitSchema>;

export function toVisitInput(values: VisitFormOutput): VisitInput {
  return {
    school: Number(values.school),
    teacher: Number(values.teacher),
    visit_date: values.visit_date,
    visit_type: values.visit_type,
    observations: values.observations,
  };
}
