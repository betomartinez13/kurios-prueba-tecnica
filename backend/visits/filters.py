import django_filters

from visits.models import School, Visit


class VisitFilter(django_filters.FilterSet):
    school = django_filters.ModelChoiceFilter(queryset=School.objects.all())
    visit_type = django_filters.ChoiceFilter(choices=Visit.Type.choices)

    class Meta:
        model = Visit
        fields = ["school", "visit_type"]


class TeacherFilter(django_filters.FilterSet):
    school = django_filters.ModelChoiceFilter(queryset=School.objects.all())
