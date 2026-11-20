import pytest
from django.contrib import admin
from django.contrib.messages.storage.fallback import FallbackStorage
from django.test import RequestFactory

from visits.admin import VisitAdmin
from visits.models import Visit
from visits.tests.factories import VisitFactory

pytestmark = pytest.mark.django_db


def test_soft_delete_hides_visit_from_default_manager_but_keeps_row():
    visit = VisitFactory()
    visit.soft_delete()
    assert visit.is_deleted is True
    assert not Visit.objects.filter(pk=visit.pk).exists()
    assert Visit.all_objects.filter(pk=visit.pk, deleted_at__isnull=False).exists()


def test_restore_brings_visit_back():
    visit = VisitFactory()
    visit.soft_delete()
    visit.restore()
    assert Visit.objects.filter(pk=visit.pk).exists()
    assert visit.is_deleted is False


def test_active_and_with_relations_are_chainable():
    VisitFactory()
    VisitFactory().soft_delete()
    assert Visit.objects.active().with_relations().count() == 1
    assert Visit.all_objects.active().count() == 1


def test_partial_indexes_exist():
    names = {i.name for i in Visit._meta.indexes}
    assert {"visit_active_date_idx", "visit_active_filter_idx"} <= names
    assert all(i.condition is not None for i in Visit._meta.indexes)


def test_admin_restore_action_restores_selected():
    visit = VisitFactory()
    other = VisitFactory()
    visit.soft_delete()
    other.soft_delete()
    request = RequestFactory().post("/admin/visits/visit/")
    request.session = {}
    request._messages = FallbackStorage(request)

    VisitAdmin(Visit, admin.site).restore_visits(request, Visit.all_objects.filter(pk=visit.pk))

    assert Visit.objects.filter(pk=visit.pk).exists()
    assert not Visit.objects.filter(pk=other.pk).exists()
