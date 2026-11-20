from datetime import UTC, date, datetime, timedelta
from unittest import mock

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from visits.models import Teacher, Visit
from visits.services import visit_create, visit_soft_delete, visit_update
from visits.tests.factories import SchoolFactory, TeacherFactory, VisitFactory

pytestmark = pytest.mark.django_db


def _create(teacher, **overrides):
    kwargs = {
        "school": teacher.school,
        "teacher": teacher,
        "visit_date": timezone.localdate(),
        "visit_type": Visit.Type.CLASSROOM,
        "observations": "ok",
    }
    kwargs.update(overrides)
    return visit_create(**kwargs)


def test_create_accepts_today_and_strips_observations():
    t = TeacherFactory()
    v = _create(t, observations="  Bien.\nSigue así.  ")
    assert v.pk is not None
    assert v.observations == "Bien.\nSigue así."


def test_create_rejects_future_date():
    t = TeacherFactory()
    with pytest.raises(ValidationError) as e:
        _create(t, visit_date=timezone.localdate() + timedelta(days=1))
    assert e.value.message_dict == {
        "visit_date": ["La fecha de la visita no puede ser posterior a hoy."]
    }
    assert Visit.objects.count() == 0


def test_create_rejects_date_before_2000():
    t = TeacherFactory()
    with pytest.raises(ValidationError) as e:
        _create(t, visit_date=date(1999, 12, 31))
    assert e.value.message_dict == {"visit_date": ["Revisa la fecha: parece demasiado antigua."]}
    assert _create(t, visit_date=date(2000, 1, 1)).visit_date == date(2000, 1, 1)


def test_create_rejects_teacher_from_other_school():
    t = TeacherFactory()
    with pytest.raises(ValidationError) as e:
        _create(t, school=SchoolFactory())
    assert e.value.message_dict == {
        "teacher": ["Este docente no pertenece al colegio seleccionado."]
    }


def test_create_rejects_blank_observations():
    t = TeacherFactory()
    with pytest.raises(ValidationError) as e:
        _create(t, observations="   ")
    assert e.value.message_dict == {"observations": ["Escribe las observaciones de la visita."]}


def test_create_collects_all_errors_in_one_exception():
    t = TeacherFactory()
    with pytest.raises(ValidationError) as e:
        _create(
            t,
            school=SchoolFactory(),
            visit_date=date(1999, 1, 1),
            observations=" ",
        )
    assert set(e.value.message_dict) == {"visit_date", "teacher", "observations"}


def test_today_uses_caracas_timezone():
    # 2026-11-20 02:00 UTC == 2026-11-19 22:00 en Caracas
    fixed = datetime(2026, 11, 20, 2, 0, tzinfo=UTC)
    with mock.patch("django.utils.timezone.now", return_value=fixed):
        t = TeacherFactory()
        v = _create(t, visit_date=date(2026, 11, 19), visit_type="MEETING")
        assert v.visit_date == date(2026, 11, 19)
        with pytest.raises(ValidationError) as e:
            _create(t, visit_date=date(2026, 11, 20), visit_type="MEETING")
        assert "visit_date" in e.value.message_dict


def test_update_old_visit_after_teacher_changed_school_saves_when_only_observations_change():
    v = VisitFactory()
    new_school = SchoolFactory()
    Teacher.objects.filter(pk=v.teacher_id).update(school=new_school)
    v.refresh_from_db()
    updated = visit_update(
        visit=v,
        data={
            "school": v.school,
            "teacher": v.teacher,
            "visit_date": v.visit_date,
            "visit_type": v.visit_type,
            "observations": "Corregido",
        },
    )
    assert updated.observations == "Corregido"
    v.refresh_from_db()
    assert v.observations == "Corregido"


def test_update_changing_teacher_to_other_school_is_rejected():
    v = VisitFactory()
    other = TeacherFactory()
    with pytest.raises(ValidationError) as e:
        visit_update(visit=v, data={"school": v.school, "teacher": other})
    assert e.value.message_dict == {
        "teacher": ["Este docente no pertenece al colegio seleccionado."]
    }
    v.refresh_from_db()
    assert v.teacher_id != other.pk


def test_update_changing_school_and_teacher_together_is_accepted():
    v = VisitFactory()
    other = TeacherFactory()
    updated = visit_update(visit=v, data={"school": other.school, "teacher": other})
    assert updated.school == other.school
    assert updated.teacher == other


def test_update_rejects_blank_observations_and_future_date():
    v = VisitFactory()
    with pytest.raises(ValidationError) as e:
        visit_update(
            visit=v,
            data={"visit_date": timezone.localdate() + timedelta(days=2), "observations": " "},
        )
    assert set(e.value.message_dict) == {"visit_date", "observations"}


def test_soft_delete_service_sets_deleted_at():
    v = VisitFactory()
    assert visit_soft_delete(visit=v) is None
    v.refresh_from_db()
    assert v.deleted_at is not None
    assert not Visit.objects.filter(pk=v.pk).exists()
