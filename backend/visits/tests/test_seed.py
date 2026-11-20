import datetime

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from visits.models import School, Teacher, Visit

pytestmark = pytest.mark.django_db

SUPERUSER_VARS = (
    "DJANGO_SUPERUSER_USERNAME",
    "DJANGO_SUPERUSER_PASSWORD",
    "DJANGO_SUPERUSER_EMAIL",
)


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for name in SUPERUSER_VARS:
        monkeypatch.delenv(name, raising=False)


def test_seed_is_idempotent_and_loads_catalog():
    call_command("seed_demo")
    call_command("seed_demo")

    assert School.objects.count() == 3
    assert Teacher.objects.count() == 8
    assert Visit.all_objects.count() == 6
    assert School.objects.get(pk=1).name == "U.E. Los Samanes"
    assert School.objects.get(pk=2).name == "Colegio El Ávila"
    assert School.objects.get(pk=3).name == "U.E. Monte Claro"
    ana = Teacher.objects.get(pk=1)
    assert (ana.first_name, ana.last_name, ana.school_id) == ("Ana", "Pérez", 1)
    rosa = Teacher.objects.get(pk=8)
    assert (rosa.first_name, rosa.last_name, rosa.school_id) == ("Rosa", "Villalobos", 3)


def test_seed_visits_are_past_dated_and_consistent():
    call_command("seed_demo")

    visits = list(Visit.objects.select_related("school", "teacher"))
    assert len(visits) == 6
    first, today = datetime.date(2026, 10, 1), datetime.date(2026, 11, 19)
    assert all(first <= v.visit_date < today for v in visits)
    assert all(v.teacher.school_id == v.school_id for v in visits)
    assert all(v.observations.strip() for v in visits)
    assert {v.visit_type for v in visits} == {Visit.Type.CLASSROOM, Visit.Type.MEETING}
    assert len({v.school_id for v in visits}) == 3
    assert all(v.created_at and v.updated_at and v.deleted_at is None for v in visits)


def test_seed_does_not_resurrect_deleted_or_edited_visits():
    call_command("seed_demo")
    v = Visit.objects.first()
    v.soft_delete()
    edited = Visit.objects.exclude(pk=v.pk).first()
    edited.observations = "Texto editado por la especialista."
    edited.save()

    call_command("seed_demo")

    assert Visit.all_objects.get(pk=v.pk).deleted_at is not None
    assert Visit.all_objects.count() == 6
    assert Visit.all_objects.get(pk=edited.pk).observations == "Texto editado por la especialista."


def test_seed_creates_superuser_from_env(monkeypatch):
    monkeypatch.setenv("DJANGO_SUPERUSER_USERNAME", "demo")
    monkeypatch.setenv("DJANGO_SUPERUSER_PASSWORD", "demo-pass-123")
    monkeypatch.setenv("DJANGO_SUPERUSER_EMAIL", "demo@example.com")

    call_command("seed_demo")
    call_command("seed_demo")

    users = get_user_model().objects.filter(username="demo")
    assert users.count() == 1
    user = users.get()
    assert user.is_superuser and user.is_staff
    assert user.email == "demo@example.com"
    assert user.check_password("demo-pass-123")


def test_seed_skips_superuser_when_env_missing(capsys):
    call_command("seed_demo")

    assert get_user_model().objects.count() == 0
    assert "superusuario" in capsys.readouterr().out.lower()
