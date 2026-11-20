import os

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand

from visits.models import Visit


class Command(BaseCommand):
    help = "Carga colegios, docentes, visitas de ejemplo y el superusuario. Es idempotente."

    def handle(self, *args, **options):
        call_command("loaddata", "schools_teachers", verbosity=0)
        self.stdout.write("Colegios y docentes cargados.")

        if Visit.all_objects.exists():
            self.stdout.write("Visitas de ejemplo omitidas: ya existen visitas.")
        else:
            call_command("loaddata", "sample_visits", verbosity=0)
            self.stdout.write("Visitas de ejemplo cargadas.")

        self._ensure_superuser()

    def _ensure_superuser(self):
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "")
        if not username or not password:
            self.stdout.write("Superusuario omitido: faltan DJANGO_SUPERUSER_USERNAME o _PASSWORD.")
            return
        User = get_user_model()
        if User.objects.filter(username=username).exists():
            self.stdout.write(f"Superusuario '{username}' ya existe.")
            return
        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(f"Superusuario '{username}' creado.")
