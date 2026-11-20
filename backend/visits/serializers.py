from rest_framework import serializers

from visits.models import School, Teacher, Visit


class VisitInputSerializer(serializers.Serializer):
    school = serializers.PrimaryKeyRelatedField(
        queryset=School.objects.all(),
        error_messages={
            "required": "Elige un colegio.",
            "null": "Elige un colegio.",
            "does_not_exist": "El colegio seleccionado no existe.",
            "incorrect_type": "El colegio seleccionado no existe.",
        },
    )
    teacher = serializers.PrimaryKeyRelatedField(
        queryset=Teacher.objects.all(),
        error_messages={
            "required": "Elige el docente visitado.",
            "null": "Elige el docente visitado.",
            "does_not_exist": "El docente seleccionado no existe.",
            "incorrect_type": "El docente seleccionado no existe.",
        },
    )
    visit_date = serializers.DateField(
        error_messages={
            "required": "Indica la fecha de la visita.",
            "null": "Indica la fecha de la visita.",
            "invalid": "Indica la fecha de la visita.",
        },
    )
    visit_type = serializers.ChoiceField(
        choices=Visit.Type.choices,
        error_messages={
            "required": "Elige un tipo de visita.",
            "null": "Elige un tipo de visita.",
            "invalid_choice": "Elige un tipo de visita válido.",
        },
    )
    observations = serializers.CharField(
        max_length=5000,
        error_messages={
            "required": "Escribe las observaciones de la visita.",
            "null": "Escribe las observaciones de la visita.",
            "blank": "Escribe las observaciones de la visita.",
            "max_length": "Máximo 5000 caracteres.",
        },
    )


class VisitOutputSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source="school.name", read_only=True)
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    visit_type_label = serializers.CharField(source="get_visit_type_display", read_only=True)

    class Meta:
        model = Visit
        fields = [
            "id",
            "school",
            "school_name",
            "teacher",
            "teacher_name",
            "visit_date",
            "visit_type",
            "visit_type_label",
            "observations",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ["id", "name"]


class TeacherSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Teacher
        fields = ["id", "first_name", "last_name", "full_name", "school"]
