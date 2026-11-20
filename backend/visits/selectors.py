from collections.abc import Mapping

from django.core.exceptions import ValidationError
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404

from visits.filters import TeacherFilter, VisitFilter
from visits.models import School, Teacher, Visit


def visit_list(*, filters: Mapping[str, str]) -> QuerySet[Visit]:
    queryset = Visit.objects.active().with_relations()
    filterset = VisitFilter(filters, queryset=queryset)
    if not filterset.is_valid():
        raise ValidationError(filterset.errors)
    return filterset.qs.order_by("-visit_date", "-created_at")


def visit_get(*, visit_id: int) -> Visit:
    return get_object_or_404(Visit.objects.with_relations(), pk=visit_id)


def school_list() -> QuerySet[School]:
    return School.objects.order_by("name")


def teacher_list(*, filters: Mapping[str, str]) -> QuerySet[Teacher]:
    queryset = Teacher.objects.select_related("school")
    filterset = TeacherFilter(filters, queryset=queryset)
    if not filterset.is_valid():
        raise ValidationError(filterset.errors)
    return filterset.qs
