from django.contrib import admin, messages

from visits.models import School, Teacher, Visit


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    search_fields = ["name"]


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    search_fields = ["first_name", "last_name"]
    list_filter = ["school"]


class StatusFilter(admin.SimpleListFilter):
    title = "Estado"
    parameter_name = "estado"

    def lookups(self, request, model_admin):
        return [("activas", "Activas"), ("eliminadas", "Eliminadas")]

    def queryset(self, request, queryset):
        if self.value() == "activas":
            return queryset.filter(deleted_at__isnull=True)
        if self.value() == "eliminadas":
            return queryset.filter(deleted_at__isnull=False)
        return queryset


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ["visit_date", "school", "teacher", "visit_type", "is_deleted_display"]
    list_filter = [StatusFilter]
    actions = ["restore_visits"]

    def get_queryset(self, request):
        return Visit.all_objects.with_relations()

    @admin.display(boolean=True, description="Eliminada")
    def is_deleted_display(self, obj):
        return obj.is_deleted

    @admin.action(description="Restaurar visitas seleccionadas")
    def restore_visits(self, request, queryset):
        count = 0
        for visit in queryset:
            visit.restore()
            count += 1
        self.message_user(request, f"{count} visitas restauradas.", messages.SUCCESS)
