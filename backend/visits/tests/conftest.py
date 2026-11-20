import datetime

import pytest
from rest_framework.test import APIClient

from visits.models import Visit
from visits.tests.factories import TeacherFactory


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def teacher(db):
    return TeacherFactory()


@pytest.fixture
def payload():
    def build(base_teacher, /, **overrides):
        data = {
            "school": base_teacher.school_id,
            "teacher": base_teacher.pk,
            "visit_date": (datetime.date.today() - datetime.timedelta(days=1)).isoformat(),
            "visit_type": Visit.Type.CLASSROOM,
            "observations": "Clase observada sin novedades.",
        }
        data.update(overrides)
        return data

    return build
