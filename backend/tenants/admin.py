from django.contrib import admin
from .models import Lodge


@admin.register(Lodge)
class LodgeAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "email", "active", "created_at")
    list_filter = ("active",)
    search_fields = ("name", "phone", "email")