from rest_framework.routers import DefaultRouter

from visits.apis import SchoolViewSet, TeacherViewSet, VisitViewSet

router = DefaultRouter(trailing_slash=True)
router.register("schools", SchoolViewSet, basename="school")
router.register("teachers", TeacherViewSet, basename="teacher")
router.register("visits", VisitViewSet, basename="visit")

urlpatterns = router.urls
