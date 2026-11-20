from datetime import date

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from visits.models import School, Teacher, Visit

MIN_VISIT_DATE = date(2000, 1, 1)
UPDATABLE_FIELDS = ("school", "teacher", "visit_date", "visit_type", "observations")


def _validate_visit(
    *,
    school: School,
    teacher: Teacher,
    visit_date: date,
    observations: str,
    check_school_teacher: bool,
) -> str:
    errors: dict[str, str] = {}

    if visit_date > timezone.localdate():
        errors["visit_date"] = "La fecha de la visita no puede ser posterior a hoy."
    elif visit_date < MIN_VISIT_DATE:
        errors["visit_date"] = "Revisa la fecha: parece demasiado antigua."

    if check_school_teacher and teacher.school_id != school.pk:
        errors["teacher"] = "Este docente no pertenece al colegio seleccionado."

    cleaned = observations.strip()
    if not cleaned:
        errors["observations"] = "Escribe las observaciones de la visita."

    if errors:
        raise ValidationError(errors)
    return cleaned


@transaction.atomic
def visit_create(
    *,
    school: School,
    teacher: Teacher,
    visit_date: date,
    visit_type: str,
    observations: str,
) -> Visit:
    cleaned = _validate_visit(
        school=school,
        teacher=teacher,
        visit_date=visit_date,
        observations=observations,
        check_school_teacher=True,
    )
    return Visit.objects.create(
        school=school,
        teacher=teacher,
        visit_date=visit_date,
        visit_type=visit_type,
        observations=cleaned,
    )


@transaction.atomic
def visit_update(*, visit: Visit, data: dict) -> Visit:
    # La coherencia colegio-docente solo se exige si el valor recibido difiere del guardado,
    # para que una visita antigua siga siendo editable si el docente cambió de colegio.
    check_school_teacher = ("school" in data and data["school"] != visit.school) or (
        "teacher" in data and data["teacher"] != visit.teacher
    )
    values = {field: data.get(field, getattr(visit, field)) for field in UPDATABLE_FIELDS}
    values["observations"] = _validate_visit(
        school=values["school"],
        teacher=values["teacher"],
        visit_date=values["visit_date"],
        observations=values["observations"],
        check_school_teacher=check_school_teacher,
    )
    for field in UPDATABLE_FIELDS:
        setattr(visit, field, values[field])
    visit.save()
    return visit


@transaction.atomic
def visit_soft_delete(*, visit: Visit) -> None:
    visit.soft_delete()
