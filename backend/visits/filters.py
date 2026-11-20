import django_filters

from visits.models import School, Visit


class VisitFilter(django_filters.FilterSet):
    school = django_filters.ModelChoiceFilter(
        queryset=School.objects.all(),
        error_messages={"invalid_choice": "Elige un colegio válido."},
    )
    visit_type = django_filters.ChoiceFilter(
        choices=Visit.Type.choices,
        error_messages={"invalid_choice": "Elige un tipo de visita válido."},
    )

    class Meta:
        model = Visit
        fields = ["school", "visit_type"]


class TeacherFilter(django_filters.FilterSet):
    school = django_filters.ModelChoiceFilter(
        queryset=School.objects.all(),
        error_messages={"invalid_choice": "Elige un colegio válido."},
    )
