import datetime

import factory

from visits.models import School, Teacher, Visit


class SchoolFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = School

    name = factory.Sequence(lambda n: f"Colegio {n}")


class TeacherFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Teacher

    first_name = factory.Sequence(lambda n: f"Nombre{n}")
    last_name = factory.Sequence(lambda n: f"Apellido{n}")
    school = factory.SubFactory(SchoolFactory)


class VisitFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Visit

    teacher = factory.SubFactory(TeacherFactory)
    school = factory.SelfAttribute("teacher.school")
    visit_date = factory.LazyFunction(lambda: datetime.date.today() - datetime.timedelta(days=1))
    visit_type = Visit.Type.CLASSROOM
    observations = "Observaciones de la visita."
