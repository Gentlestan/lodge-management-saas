
from rest_framework import serializers

from .models import Room


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = "__all__"
        read_only_fields = (
            "id",
            "lodge",
            "created_at",
            "updated_at",
        )

    def validate(self, data):
        """
        Enforce room status rules.

        New rooms:
        - Must start as Available.

        Existing rooms:
        - Reserved and Occupied are controlled by the
          reservation/check-in workflow.
        - Available can only be manually selected when the
          room is currently Cleaning or Maintenance.
        """

        instance = self.instance
        new_status = data.get("status")

        # ---------------------------------------------------------
        # NEW ROOM CREATION
        # ---------------------------------------------------------
        if instance is None:
            if new_status and new_status != "Available":
                raise serializers.ValidationError(
                    {
                        "status": (
                            "New rooms must be created with Available "
                            "status. Reserved and Occupied statuses are "
                            "controlled by the reservation and check-in system."
                        )
                    }
                )

        # ---------------------------------------------------------
        # EXISTING ROOM EDIT
        # ---------------------------------------------------------
        if instance and new_status:
            current_status = instance.status

            # Reserved and Occupied are system-controlled states.
            if new_status in ["Reserved", "Occupied"]:
                raise serializers.ValidationError(
                    {
                        "status": (
                            "Reserved and Occupied statuses are "
                            "controlled by the reservation and "
                            "check-in system."
                        )
                    }
                )

            # A room can only be manually changed to Available
            # from Cleaning or Maintenance.
            if (
                new_status == "Available"
                and current_status != "Available"
                and current_status not in [
                    "Cleaning",
                    "Maintenance",
                ]
            ):
                raise serializers.ValidationError(
                    {
                        "status": (
                            "A room can only be marked as Available "
                            "when its current status is Cleaning "
                            "or Maintenance."
                        )
                    }
                )

        return data

