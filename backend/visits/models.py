from django.db import models
from django.db.models import Q

from common.models import SoftDeleteManager, SoftDeleteModel, SoftDeleteQuerySet, TimeStampedModel


class School(models.Model):
    name = models.CharField(max_length=150, unique=True)

    def __str__(self) -> str:
        return self.name


class Teacher(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    school = models.ForeignKey(School, on_delete=models.PROTECT, related_name="teachers")

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self) -> str:
        return self.full_name

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class VisitQuerySet(SoftDeleteQuerySet):
    def with_relations(self):
        return self.select_related("school", "teacher")


class Visit(TimeStampedModel, SoftDeleteModel):
    class Type(models.TextChoices):
        CLASSROOM = "CLASSROOM", "Visita en aula"
        MEETING = "MEETING", "Encuentro"

    school = models.ForeignKey(School, on_delete=models.PROTECT, related_name="visits")
    teacher = models.ForeignKey(Teacher, on_delete=models.PROTECT, related_name="visits")
    visit_date = models.DateField()
    visit_type = models.CharField(max_length=20, choices=Type.choices)
    observations = models.TextField()

    objects = SoftDeleteManager.from_queryset(VisitQuerySet)()
    all_objects = VisitQuerySet.as_manager()

    class Meta:
        indexes = [
            models.Index(
                fields=["-visit_date", "-created_at"],
                name="visit_active_date_idx",
                condition=Q(deleted_at__isnull=True),
            ),
            models.Index(
                fields=["school", "visit_type"],
                name="visit_active_filter_idx",
                condition=Q(deleted_at__isnull=True),
            ),
        ]

    def __str__(self) -> str:
        return f"{self.visit_date} · {self.teacher} ({self.school})"
