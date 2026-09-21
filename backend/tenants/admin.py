from django.contrib import admin

from .models import Lodge, Membership


@admin.register(Lodge)
class LodgeAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "email", "active", "created_at")
    list_filter = ("active",)
    search_fields = ("name", "phone", "email")


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "lodge", "role", "active", "created_at")
    list_filter = ("role", "active", "lodge")
    search_fields = (
        "user__username",
        "user__first_name",
        "user__last_name",
        "lodge__name",
    )