from rest_framework import serializers
from .models import Guest


class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = [
            "id",
            "full_name",
            "phone_number",
            "email",
            "address",
            "id_type",
            "id_number",
            "gender",
            "notes",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]