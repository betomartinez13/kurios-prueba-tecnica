import pytest
from django.test import Client

from visits.models import Visit
from visits.tests.factories import SchoolFactory, TeacherFactory, VisitFactory

pytestmark = pytest.mark.django_db


def _create(api, teacher, payload, **overrides):
    r = api.post("/api/visits/", payload(teacher, **overrides), format="json")
    assert r.status_code == 201, r.content
    return r.json()["id"]


def test_create_returns_201_with_readable_names(api, teacher, payload):
    r = api.post("/api/visits/", payload(teacher), format="json")
    assert r.status_code == 201
    body = r.json()
    assert body["school"] == teacher.school_id
    assert body["school_name"] == teacher.school.name
    assert body["teacher_name"] == teacher.full_name
    assert body["visit_type_label"] == "Visita en aula"
    assert {"id", "created_at", "updated_at", "observations", "visit_date"} <= body.keys()


def test_list_filters_and_hides_deleted(api):
    v1 = VisitFactory(visit_type=Visit.Type.CLASSROOM)
    VisitFactory(visit_type=Visit.Type.MEETING)
    deleted = VisitFactory(visit_type=Visit.Type.CLASSROOM, school=v1.school, teacher=v1.teacher)
    deleted.soft_delete()

    ids = [v["id"] for v in api.get("/api/visits/").json()]
    assert deleted.pk not in ids and len(ids) == 2

    ids = [v["id"] for v in api.get(f"/api/visits/?school={v1.school_id}").json()]
    assert ids == [v1.pk]
    ids = [v["id"] for v in api.get("/api/visits/?visit_type=MEETING").json()]
    assert len(ids) == 1 and v1.pk not in ids


def test_list_invalid_filter_returns_400(api):
    r = api.get("/api/visits/?visit_type=XYZ")
    assert r.status_code == 400
    assert r.json() == {"visit_type": ["Elige un tipo de visita válido."]}
    r = api.get("/api/visits/?school=abc")
    assert r.status_code == 400
    assert r.json() == {"school": ["Elige un colegio válido."]}


def test_list_nonexistent_school_returns_400(api):
    r = api.get("/api/visits/?school=999999")
    assert r.status_code == 400
    assert r.json() == {"school": ["Elige un colegio válido."]}


def test_retrieve_update_delete_deleted_visit_return_404(api, teacher, payload):
    vid = _create(api, teacher, payload)
    assert api.delete(f"/api/visits/{vid}/").status_code == 204
    url = f"/api/visits/{vid}/"
    r = api.get(url)
    assert r.status_code == 404
    assert r.json() == {"detail": "Esta visita no existe o fue eliminada."}
    assert api.put(url, payload(teacher), format="json").status_code == 404
    assert api.patch(url, {"observations": "x"}, format="json").status_code == 404
    assert api.delete(url).status_code == 404


def test_delete_returns_204_and_keeps_row(api):
    v = VisitFactory()
    r = api.delete(f"/api/visits/{v.pk}/")
    assert r.status_code == 204
    assert Visit.all_objects.get(pk=v.pk).deleted_at is not None


def test_put_replaces_and_patch_updates_partially(api, teacher, payload):
    vid = _create(api, teacher, payload)
    r = api.put(f"/api/visits/{vid}/", payload(teacher, observations="Nuevo."), format="json")
    assert r.status_code == 200 and r.json()["observations"] == "Nuevo."
    assert (
        api.put(f"/api/visits/{vid}/", {"observations": "solo"}, format="json").status_code == 400
    )
    r = api.patch(f"/api/visits/{vid}/", {"visit_type": "MEETING"}, format="json")
    assert r.status_code == 200
    assert r.json()["visit_type"] == "MEETING"
    assert r.json()["visit_type_label"] == "Encuentro"
    assert r.json()["observations"] == "Nuevo."


def test_service_errors_use_drf_field_format(api, teacher, payload):
    r = api.post("/api/visits/", payload(teacher, visit_date="2999-01-01"), format="json")
    assert r.status_code == 400
    assert r.json()["visit_date"] == ["La fecha de la visita no puede ser posterior a hoy."]


def test_teacher_from_other_school_returns_400(api, teacher, payload):
    other = SchoolFactory()
    r = api.post("/api/visits/", payload(teacher, school=other.pk), format="json")
    assert r.status_code == 400
    assert r.json()["teacher"] == ["Este docente no pertenece al colegio seleccionado."]


def test_required_fields_messages_in_spanish(api):
    r = api.post("/api/visits/", {}, format="json")
    assert r.status_code == 400
    body = r.json()
    assert body["school"] == ["Elige un colegio."]
    assert body["teacher"] == ["Elige el docente visitado."]
    assert body["visit_date"] == ["Indica la fecha de la visita."]
    assert body["visit_type"] == ["Elige un tipo de visita."]
    assert body["observations"] == ["Escribe las observaciones de la visita."]


def test_invalid_values_messages_in_spanish(api, teacher, payload):
    r = api.post(
        "/api/visits/",
        payload(
            teacher,
            school=999999,
            teacher=999999,
            visit_date="no-es-fecha",
            visit_type="OTRO",
            observations="x" * 5001,
        ),
        format="json",
    )
    body = r.json()
    assert body["school"] == ["El colegio seleccionado no existe."]
    assert body["teacher"] == ["El docente seleccionado no existe."]
    assert body["visit_date"] == ["Indica la fecha de la visita."]
    assert body["visit_type"] == ["Elige un tipo de visita válido."]
    assert body["observations"] == ["Máximo 5000 caracteres."]


def test_null_and_blank_values_messages_in_spanish(api, teacher, payload):
    r = api.post(
        "/api/visits/",
        payload(teacher, school=None, teacher=None, visit_date=None, observations="   "),
        format="json",
    )
    body = r.json()
    assert body["school"] == ["Elige un colegio."]
    assert body["teacher"] == ["Elige el docente visitado."]
    assert body["visit_date"] == ["Indica la fecha de la visita."]
    assert body["observations"] == ["Escribe las observaciones de la visita."]


def test_post_with_admin_session_cookie_succeeds(admin_user, teacher, payload):
    # navegador con la sesión del admin y sin token CSRF
    c = Client(enforce_csrf_checks=True)
    c.force_login(admin_user)
    r = c.post("/api/visits/", data=payload(teacher), content_type="application/json")
    assert r.status_code == 201


def test_observations_roundtrip_preserves_newlines_and_unicode(api, teacher, payload):
    text = "Línea 1 — señal ñ\nLínea 2 🚀"
    vid = _create(api, teacher, payload, observations=text)
    assert api.get(f"/api/visits/{vid}/").json()["observations"] == text


def test_schools_list_ordered_by_name(api):
    SchoolFactory(name="Zeta")
    SchoolFactory(name="Alfa")
    assert [s["name"] for s in api.get("/api/schools/").json()] == ["Alfa", "Zeta"]


def test_teachers_filter_by_school(api):
    t1 = TeacherFactory()
    TeacherFactory()
    body = api.get(f"/api/teachers/?school={t1.school_id}").json()
    assert [t["id"] for t in body] == [t1.pk]
    assert body[0]["full_name"] == t1.full_name and body[0]["school"] == t1.school_id
    assert api.get("/api/teachers/?school=abc").status_code == 400


def test_schema_endpoint_returns_openapi(api):
    r = api.get("/api/schema/")
    assert r.status_code == 200
    assert b"VisitInputRequest" in r.content
