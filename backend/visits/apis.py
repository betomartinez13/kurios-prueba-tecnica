from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.response import Response

from visits.models import Visit
from visits.selectors import school_list, teacher_list, visit_get, visit_list
from visits.serializers import (
    SchoolSerializer,
    TeacherSerializer,
    VisitInputSerializer,
    VisitOutputSerializer,
)
from visits.services import visit_create, visit_soft_delete, visit_update

VISIT_ID = OpenApiParameter("id", int, OpenApiParameter.PATH, description="Id de la visita.")
NOT_FOUND = {404: None}
BAD_REQUEST = {400: None}


class VisitViewSet(viewsets.ViewSet):
    lookup_value_regex = r"\d+"

    @extend_schema(
        parameters=[
            OpenApiParameter("school", int, description="Filtra por id de colegio."),
            OpenApiParameter(
                "visit_type",
                str,
                enum=Visit.Type.values,
                description="Filtra por tipo de visita.",
            ),
        ],
        responses={200: VisitOutputSerializer(many=True)} | BAD_REQUEST,
    )
    def list(self, request):
        visits = visit_list(filters=request.query_params)
        return Response(VisitOutputSerializer(visits, many=True).data)

    @extend_schema(parameters=[VISIT_ID], responses={200: VisitOutputSerializer} | NOT_FOUND)
    def retrieve(self, request, pk=None):
        return Response(VisitOutputSerializer(visit_get(visit_id=pk)).data)

    @extend_schema(
        request=VisitInputSerializer,
        responses={201: VisitOutputSerializer} | BAD_REQUEST,
    )
    def create(self, request):
        serializer = VisitInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = visit_create(**serializer.validated_data)
        return Response(VisitOutputSerializer(visit).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        parameters=[VISIT_ID],
        request=VisitInputSerializer,
        responses={200: VisitOutputSerializer} | BAD_REQUEST | NOT_FOUND,
    )
    def update(self, request, pk=None):
        return self._update(request, pk, partial=False)

    @extend_schema(
        parameters=[VISIT_ID],
        request=VisitInputSerializer(partial=True),
        responses={200: VisitOutputSerializer} | BAD_REQUEST | NOT_FOUND,
    )
    def partial_update(self, request, pk=None):
        return self._update(request, pk, partial=True)

    @extend_schema(parameters=[VISIT_ID], responses={204: None} | NOT_FOUND)
    def destroy(self, request, pk=None):
        visit_soft_delete(visit=visit_get(visit_id=pk))
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _update(self, request, pk, *, partial):
        visit = visit_get(visit_id=pk)
        serializer = VisitInputSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        visit = visit_update(visit=visit, data=serializer.validated_data)
        return Response(VisitOutputSerializer(visit).data)


class SchoolViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SchoolSerializer

    def get_queryset(self):
        return school_list()


class TeacherViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TeacherSerializer

    @extend_schema(
        parameters=[OpenApiParameter("school", int, description="Filtra por id de colegio.")],
        responses={200: TeacherSerializer(many=True)} | BAD_REQUEST,
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        return teacher_list(filters=self.request.query_params)
