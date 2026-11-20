from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    # Provisional: delega en DRF; la Tarea 5 define el formato de error final.
    return drf_exception_handler(exc, context)
