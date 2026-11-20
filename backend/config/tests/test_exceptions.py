from django.core.exceptions import ValidationError

from config.exceptions import exception_handler


def test_validation_error_with_field_dict_maps_to_fields():
    response = exception_handler(ValidationError({"teacher": ["No pertenece."]}), {})
    assert response.status_code == 400
    assert response.data == {"teacher": ["No pertenece."]}


def test_validation_error_without_field_dict_maps_to_non_field_errors():
    response = exception_handler(ValidationError("Algo salió mal."), {})
    assert response.status_code == 400
    assert response.data == {"non_field_errors": ["Algo salió mal."]}
