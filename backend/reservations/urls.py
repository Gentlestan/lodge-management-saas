from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ReservationViewSet,
    ShortRestPackageListView,
    ShortRestPackageDetailView,
)

router = DefaultRouter()

router.register(
    "reservations",
    ReservationViewSet,
    basename="reservation",
)

urlpatterns = [
    path(
        "short-rest-packages/",
        ShortRestPackageListView.as_view(),
        name="short-rest-package-list",
    ),
     path(
        "short-rest-packages/<int:pk>/",
        ShortRestPackageDetailView.as_view(),
        name="short-rest-package-detail",
    ),
]

urlpatterns += router.urls