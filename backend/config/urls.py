from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("rooms.urls")),
    path("api/", include("guests.urls")),
    path("api/", include("reservations.urls")),
    path("api/dashboard/", include("dashboard.urls")),
    path("api/billing/", include("billing.urls")),
]