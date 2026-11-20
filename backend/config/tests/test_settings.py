from django.conf import settings


def test_api_has_no_authentication_and_allows_any():
    rf = settings.REST_FRAMEWORK
    assert rf["DEFAULT_AUTHENTICATION_CLASSES"] == []
    assert rf["DEFAULT_PERMISSION_CLASSES"] == ["rest_framework.permissions.AllowAny"]
    assert rf["EXCEPTION_HANDLER"] == "config.exceptions.exception_handler"


def test_locale_and_timezone_defaults():
    assert settings.LANGUAGE_CODE == "es"
    assert settings.TIME_ZONE == "America/Caracas"
    assert settings.USE_TZ is True


def test_allowed_hosts_include_proxy_host():
    assert {"localhost", "127.0.0.1", "backend"} <= set(settings.ALLOWED_HOSTS)
