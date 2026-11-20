from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    # Los selectors y servicios lanzan ValidationError de Django con un dict por campo;
    # se traducen al formato de error de DRF ({campo: [mensajes]}). Uno sin campos
    # (sin error_dict) no tiene message_dict: va a non_field_errors.
    if isinstance(exc, DjangoValidationError):
        detail = (
            exc.message_dict if hasattr(exc, "error_dict") else {"non_field_errors": exc.messages}
        )
        exc = DRFValidationError(detail=detail)
    return drf_exception_handler(exc, context)
