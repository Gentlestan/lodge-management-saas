from rest_framework import serializers

from .models import Room


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = [
            "id",
            "room_name",
            "room_type",
            "price_per_night",
            "status",
            "description",
            "amenities",
            "bed_type",
            "maximum_occupancy",
            "floor_location",
            "internal_notes",
            "active",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        """
        Enforce room status transition rules.

        An existing room can only be changed to Available
        if its current status is Cleaning or Maintenance.
        """
        new_status = data.get("status")

        if (
            self.instance
            and new_status == "Available"
            and self.instance.status not in ["Cleaning", "Maintenance"]
        ):
            raise serializers.ValidationError(
                {
                    "status": (
                        "A room can only be marked as Available "
                        "when its current status is Cleaning or Maintenance."
                    )
                }
            )

        return data