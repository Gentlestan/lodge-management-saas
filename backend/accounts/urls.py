
from django.urls import path

from .views import (
    LoginView,
    OwnerAccountManagementView,
)


urlpatterns = [
    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),

    path(
        "users/",
        OwnerAccountManagementView.as_view(),
        name="owner-account-management",
    ),
]
