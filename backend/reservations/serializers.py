from django.utils import timezone

from rest_framework import serializers

from tenants.utils import get_current_lodge

from .models import Reservation


class ReservationSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(
        source="guest.full_name",
        read_only=True,
    )

    room_name = serializers.CharField(
        source="room.room_name",
        read_only=True,
    )

    class Meta:
        model = Reservation
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "checked_in_at",
            "checked_out_at",
            "guest_name",
            "room_name",
        ]

    def validate(self, data):
        # ---------------------------------------------------------
        # Get the existing reservation values when this is an edit.
        # This is important because PATCH may only send changed fields.
        # ---------------------------------------------------------
        instance = self.instance

        check_in = data.get(
            "check_in_date",
            instance.check_in_date if instance else None,
        )

        check_out = data.get(
            "check_out_date",
            instance.check_out_date if instance else None,
        )

        room = data.get(
            "room",
            instance.room if instance else None,
        )

        guest = data.get(
            "guest",
            instance.guest if instance else None,
        )

        number_of_guests = data.get(
            "number_of_guests",
            instance.number_of_guests if instance else None,
        )

        # ---------------------------------------------------------
        # Lodge isolation
        # ---------------------------------------------------------
        request = self.context.get("request")
        lodge = None

        if request and request.user.is_authenticated:
            lodge = get_current_lodge(request.user)

        if lodge:
            if guest and guest.lodge_id != lodge.id:
                raise serializers.ValidationError(
                    {
                        "guest": "This guest does not belong to your lodge."
                    }
                )

            if room and room.lodge_id != lodge.id:
                raise serializers.ValidationError(
                    {
                        "room": "This room does not belong to your lodge."
                    }
                )

        
        # ---------------------------------------------------------
        # Reservation status rules
        # ---------------------------------------------------------
        if instance:
            # Checked-out reservations should not be edited.
            if instance.status == "Checked Out":
                raise serializers.ValidationError(
                    {
                        "detail": (
                            "A checked-out reservation cannot be edited."
                        )
                    }
                )

            # Cancelled reservations should not be edited.
            if instance.status == "Cancelled":
                raise serializers.ValidationError(
                    {
                        "detail": (
                            "A cancelled reservation cannot be edited."
                        )
                    }
                )

            # A checked-in guest is already staying in the room.
            # Their check-in date must not be changed.
            if instance.status == "Checked In":
                if (
                    "check_in_date" in data
                    and data["check_in_date"] != instance.check_in_date
                ):
                    raise serializers.ValidationError(
                        {
                            "check_in_date": (
                                "The check-in date cannot be changed "
                                "after the guest has checked in."
                            )
                        }
                    )

                # A checked-in guest cannot be moved to another room
                # through the normal reservation edit.
                if (
                    "room" in data
                    and data["room"].id != instance.room_id
                ):
                    raise serializers.ValidationError(
                        {
                            "room": (
                                "The room cannot be changed after "
                                "the guest has checked in."
                            )
                        }
                    )

                # A checked-in guest can only extend their stay.
                if (
                    "check_out_date" in data
                    and data["check_out_date"] < instance.check_out_date
                ):
                    raise serializers.ValidationError(
                        {
                            "check_out_date": (
                                "The check-out date cannot be moved "
                                "earlier after the guest has checked in."
                            )
                        }
                    )

        # ---------------------------------------------------------
        # Check-in date validation
        # ---------------------------------------------------------
        # New reservations cannot have a check-in date in the past.
        if (
            check_in
            and check_in < timezone.localdate()
            and (
                not self.instance
                or (
                    self.instance.status == "Reserved"
                    and "check_in_date" in data
                )
            )
        ):
            raise serializers.ValidationError(
                {
                    "check_in_date": (
                        "Check-in date cannot be in the past."
                    )
                }
            )

        # ---------------------------------------------------------
        # Guest validation
        # ---------------------------------------------------------
        if guest and not guest.active:
            raise serializers.ValidationError(
                {
                    "guest": (
                        "This guest is inactive and cannot make "
                        "a reservation."
                    )
                }
            )

        # ---------------------------------------------------------
        # Room validation
        # ---------------------------------------------------------
        if room and not room.active:
            raise serializers.ValidationError(
                {
                    "room": (
                        "This room is inactive and cannot be reserved."
                    )
                }
            )

        # A maintenance room cannot be selected for a new reservation
        # or for moving an existing reservation into that room.
        if room and room.status == "Maintenance":
            if not instance or instance.room_id != room.id:
                raise serializers.ValidationError(
                    {
                        "room": (
                            "This room is currently under maintenance "
                            "and cannot be reserved."
                        )
                    }
                )

        # ---------------------------------------------------------
        # Number of guests / room capacity
        # ---------------------------------------------------------
        if room and number_of_guests:
            if number_of_guests > room.maximum_occupancy:
                raise serializers.ValidationError(
                    {
                        "number_of_guests": (
                            f"This room can accommodate a maximum of "
                            f"{room.maximum_occupancy} guests."
                        )
                    }
                )

        # ---------------------------------------------------------
        # Date validation
        # ---------------------------------------------------------
        if check_in and check_out:
            if check_out <= check_in:
                raise serializers.ValidationError(
                    {
                        "check_out_date": (
                            "Check-out date must be after "
                            "check-in date."
                        )
                    }
                )

        # ---------------------------------------------------------
        # Prevent overlapping reservations
        # ---------------------------------------------------------
        if room and check_in and check_out:
            overlapping_reservations = Reservation.objects.filter(
                room=room,
                check_in_date__lt=check_out,
                check_out_date__gt=check_in,
            ).exclude(
                status__in=["Cancelled", "Checked Out"]
            )

            # When editing an existing reservation, exclude itself.
            if instance:
                overlapping_reservations = (
                    overlapping_reservations.exclude(
                        id=instance.id
                    )
                )

            if overlapping_reservations.exists():
                raise serializers.ValidationError(
                    {
                        "room": (
                            "This room is already reserved for some "
                            "or all of these dates."
                        )
                    }
                )

        return data