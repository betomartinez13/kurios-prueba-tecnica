from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    # Los selectors y servicios lanzan ValidationError de Django con un dict por campo;
    # se traducen al formato de error de DRF ({campo: [mensajes]}).
    if isinstance(exc, DjangoValidationError):
        exc = DRFValidationError(detail=exc.message_dict)
    return drf_exception_handler(exc, context)
