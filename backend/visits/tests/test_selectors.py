import datetime

import pytest
from django.core.exceptions import ValidationError
from django.http import Http404

from visits.models import Visit
from visits.selectors import school_list, teacher_list, visit_get, visit_list
from visits.tests.factories import SchoolFactory, TeacherFactory, VisitFactory

pytestmark = pytest.mark.django_db

TODAY = datetime.date.today()


def test_visit_list_excludes_deleted_and_orders_by_date_then_created():
    v_old = VisitFactory(visit_date=TODAY - datetime.timedelta(days=5))
    v_new = VisitFactory(visit_date=TODAY - datetime.timedelta(days=1))
    v_same_day_later = VisitFactory(visit_date=TODAY - datetime.timedelta(days=1))
    v_del = VisitFactory()
    v_del.soft_delete()

    assert list(visit_list(filters={})) == [v_same_day_later, v_new, v_old]


def test_visit_list_filters_combine_with_and():
    school_a = SchoolFactory()
    school_b = SchoolFactory()
    teacher_a = TeacherFactory(school=school_a)
    teacher_b = TeacherFactory(school=school_b)
    target = VisitFactory(teacher=teacher_a, visit_type=Visit.Type.MEETING)
    VisitFactory(teacher=teacher_a, visit_type=Visit.Type.CLASSROOM)
    VisitFactory(teacher=teacher_b, visit_type=Visit.Type.MEETING)

    result = visit_list(filters={"school": str(school_a.pk), "visit_type": "MEETING"})

    assert list(result) == [target]


def test_visit_list_invalid_filter_raises_validation_error():
    with pytest.raises(ValidationError) as e:
        visit_list(filters={"visit_type": "XYZ"})
    assert "visit_type" in e.value.message_dict
    with pytest.raises(ValidationError) as e:
        visit_list(filters={"school": "abc"})
    assert "school" in e.value.message_dict


def test_visit_get_404_for_deleted_or_missing():
    v = VisitFactory()
    assert visit_get(visit_id=v.pk) == v
    v.soft_delete()
    with pytest.raises(Http404):
        visit_get(visit_id=v.pk)
    with pytest.raises(Http404):
        visit_get(visit_id=999999)


def test_teacher_list_filters_by_school():
    school_a = SchoolFactory()
    t_a = TeacherFactory(school=school_a)
    TeacherFactory()

    assert list(teacher_list(filters={"school": str(school_a.pk)})) == [t_a]
    assert teacher_list(filters={}).count() == 2


def test_teacher_list_invalid_school_raises_validation_error():
    with pytest.raises(ValidationError) as e:
        teacher_list(filters={"school": "abc"})
    assert "school" in e.value.message_dict


def test_school_list_ordered_by_name():
    b = SchoolFactory(name="Beta")
    a = SchoolFactory(name="Alfa")

    assert list(school_list()) == [a, b]
