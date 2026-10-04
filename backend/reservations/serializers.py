from datetime import timedelta

from django.utils import timezone

from rest_framework import serializers

from tenants.utils import get_current_lodge

from .models import Reservation,  ShortRestPackage


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
            "short_rest_end",
        ]

    def validate(self, data):
        instance = self.instance

        request = self.context.get("request")

        lodge = None
        if request and request.user.is_authenticated:
            lodge = get_current_lodge(request.user)

        # ---------------------------------------------------------
        # BASIC VALUES
        # ---------------------------------------------------------

        guest = data.get(
            "guest",
            instance.guest if instance else None,
        )

        room = data.get(
            "room",
            instance.room if instance else None,
        )

        stay_type = data.get(
            "stay_type",
            instance.stay_type if instance else "Overnight",
        )

        package = data.get(
            "short_rest_package",
            instance.short_rest_package if instance else None,
        )

        check_in = data.get(
            "check_in_date",
            instance.check_in_date if instance else None,
        )

        check_out = data.get(
            "check_out_date",
            instance.check_out_date if instance else None,
        )

        number_of_guests = data.get(
            "number_of_guests",
            instance.number_of_guests if instance else None,
        )

        short_rest_start = data.get(
            "short_rest_start",
            instance.short_rest_start if instance else None,
        )

        short_rest_end = data.get(
            "short_rest_end",
            instance.short_rest_end if instance else None,
        )

        # ---------------------------------------------------------
        # LODGE / TENANCY
        # ---------------------------------------------------------

        if lodge:
            if guest and guest.lodge_id != lodge.id:
                raise serializers.ValidationError(
                    {
                        "guest": (
                            "This guest does not belong to your lodge."
                        )
                    }
                )

            if room and room.lodge_id != lodge.id:
                raise serializers.ValidationError(
                    {
                        "room": (
                            "This room does not belong to your lodge."
                        )
                    }
                )

            if package and package.lodge_id != lodge.id:
                raise serializers.ValidationError(
                    {
                        "short_rest_package": (
                            "This short-rest package does not "
                            "belong to your lodge."
                        )
                    }
                )

        # ---------------------------------------------------------
        # EXISTING RESERVATION STATUS RULES
        # ---------------------------------------------------------

        if instance:
            if instance.status == "Checked Out":
                raise serializers.ValidationError(
                    {
                        "detail": (
                            "A checked-out reservation cannot be edited."
                        )
                    }
                )

            if instance.status == "Cancelled":
                raise serializers.ValidationError(
                    {
                        "detail": (
                            "A cancelled reservation cannot be edited."
                        )
                    }
                )

            # Once the guest is inside the room, the type and
            # scheduled short-rest details cannot be changed.
            if instance.status == "Checked In":

                if "stay_type" in data:
                    if data["stay_type"] != instance.stay_type:
                        raise serializers.ValidationError(
                            {
                                "stay_type": (
                                    "Stay type cannot be changed "
                                    "after the guest has checked in."
                                )
                            }
                        )

                if "short_rest_package" in data:
                    new_package = data["short_rest_package"]

                    if (
                        new_package is not None
                        and new_package.id != instance.short_rest_package_id
                    ):
                        raise serializers.ValidationError(
                            {
                                "short_rest_package": (
                                    "The short-rest package cannot "
                                    "be changed after the guest "
                                    "has checked in."
                                )
                            }
                        )

                if "short_rest_start" in data:
                    if (
                        data["short_rest_start"]
                        != instance.short_rest_start
                    ):
                        raise serializers.ValidationError(
                            {
                                "short_rest_start": (
                                    "The short-rest booking time "
                                    "cannot be changed after the "
                                    "guest has checked in."
                                )
                            }
                        )

                if "short_rest_end" in data:
                    if (
                        data["short_rest_end"]
                        != instance.short_rest_end
                    ):
                        raise serializers.ValidationError(
                            {
                                "short_rest_end": (
                                    "The short-rest end time cannot "
                                    "be changed after the guest "
                                    "has checked in."
                                )
                            }
                        )

                if (
                    "check_in_date" in data
                    and data["check_in_date"]
                    != instance.check_in_date
                ):
                    raise serializers.ValidationError(
                        {
                            "check_in_date": (
                                "The check-in date cannot be changed "
                                "after the guest has checked in."
                            )
                        }
                    )

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

                if instance.stay_type == "Overnight":
                    if (
                        "check_out_date" in data
                        and data["check_out_date"]
                        < instance.check_out_date
                    ):
                        raise serializers.ValidationError(
                            {
                                "check_out_date": (
                                    "The check-out date cannot be "
                                    "moved earlier after the guest "
                                    "has checked in."
                                )
                            }
                        )

                else:
                    if "check_out_date" in data:
                        if (
                            data["check_out_date"]
                            != instance.check_out_date
                        ):
                            raise serializers.ValidationError(
                                {
                                    "check_out_date": (
                                        "The short-rest booking date "
                                        "cannot be changed after "
                                        "the guest has checked in."
                                    )
                                }
                            )

        # ---------------------------------------------------------
        # GUEST
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
        # ROOM
        # ---------------------------------------------------------

        if room and not room.active:
            raise serializers.ValidationError(
                {
                    "room": (
                        "This room is inactive and cannot be reserved."
                    )
                }
            )

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
        # OCCUPANCY
        # ---------------------------------------------------------

        if room and number_of_guests:
            if (
                room.maximum_occupancy is not None
                and number_of_guests > room.maximum_occupancy
            ):
                raise serializers.ValidationError(
                    {
                        "number_of_guests": (
                            f"This room can accommodate a maximum of "
                            f"{room.maximum_occupancy} guests."
                        )
                    }
                )

        # ---------------------------------------------------------
        # OVERNIGHT VALIDATION
        # ---------------------------------------------------------

        if stay_type == "Overnight":

            if not check_in or not check_out:
                raise serializers.ValidationError(
                    {
                        "check_out_date": (
                            "Check-in and check-out dates are "
                            "required for an overnight stay."
                        )
                    }
                )

            if check_out <= check_in:
                raise serializers.ValidationError(
                    {
                        "check_out_date": (
                            "Check-out date must be after "
                            "check-in date."
                        )
                    }
                )

            # Overnight reservations cannot use a short-rest package.
            if package is not None:
                raise serializers.ValidationError(
                    {
                        "short_rest_package": (
                            "An overnight reservation cannot have "
                            "a short-rest package."
                        )
                    }
                )

            if short_rest_start is not None:
                raise serializers.ValidationError(
                    {
                        "short_rest_start": (
                            "Short-rest booking time is only "
                            "used for short-rest reservations."
                        )
                    }
                )

            if short_rest_end is not None:
                raise serializers.ValidationError(
                    {
                        "short_rest_end": (
                            "Short-rest end time is only used "
                            "for short-rest reservations."
                        )
                    }
                )

            if (
                check_in
                and check_in < timezone.localdate()
                and (
                    not instance
                    or (
                        instance.status == "Reserved"
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
        # SHORT REST VALIDATION
        # ---------------------------------------------------------

        elif stay_type == "Short Rest":

            if package is None:
                raise serializers.ValidationError(
                    {
                        "short_rest_package": (
                            "A short-rest package is required."
                        )
                    }
                )

            # Only require the package to be active when it is
            # being selected/changed, not when editing an old
            # reservation that already uses a package.
            package_changed = (
                not instance
                or "short_rest_package" in data
                and (
                    instance.short_rest_package_id
                    != package.id
                )
            )

            if package_changed and not package.active:
                raise serializers.ValidationError(
                    {
                        "short_rest_package": (
                            "This short-rest package is inactive "
                            "and cannot be selected."
                        )
                    }
                )

            if not short_rest_start:
                raise serializers.ValidationError(
                    {
                        "short_rest_start": (
                            "A booking/start time is required "
                            "for a short-rest reservation."
                        )
                    }
                )

            # The frontend may send short_rest_end, but the backend
            # remains the authority for calculating it.
            calculated_end = (
                short_rest_start
                + timedelta(hours=package.duration_hours)
            )

            data["short_rest_end"] = calculated_end
            short_rest_end = calculated_end

            # Short rest must remain within one calendar day.
            if calculated_end.date() != short_rest_start.date():
                raise serializers.ValidationError(
                    {
                        "short_rest_start": (
                            "A short-rest booking cannot cross "
                            "midnight."
                        )
                    }
                )

            # The date fields mirror the booking date for
            # compatibility with the existing Reservation model.
            if check_in != short_rest_start.date():
                raise serializers.ValidationError(
                    {
                        "check_in_date": (
                            "Short-rest check-in date must match "
                            "the booking date."
                        )
                    }
                )

            if check_out != short_rest_start.date():
                raise serializers.ValidationError(
                    {
                        "check_out_date": (
                            "Short-rest check-out date must match "
                            "the booking date."
                        )
                    }
                )

            # A short-rest booking cannot be created in the past.
            if not instance:
                if short_rest_start < timezone.now():
                    raise serializers.ValidationError(
                        {
                            "short_rest_start": (
                                "Short-rest booking time cannot "
                                "be in the past."
                            )
                        }
                    )

        else:
            raise serializers.ValidationError(
                {
                    "stay_type": (
                        "Invalid stay type."
                    )
                }
            )

        # ---------------------------------------------------------
        # ROOM AVAILABILITY
        # ---------------------------------------------------------

        if room and stay_type == "Overnight":

            # Existing overnight-vs-overnight overlap.
            overlapping_overnight = Reservation.objects.filter(
                room=room,
                stay_type="Overnight",
                check_in_date__lt=check_out,
                check_out_date__gt=check_in,
            ).exclude(
                status__in=["Cancelled", "Checked Out"]
            )

            if instance:
                overlapping_overnight = (
                    overlapping_overnight.exclude(
                        id=instance.id
                    )
                )

            if overlapping_overnight.exists():
                raise serializers.ValidationError(
                    {
                        "room": (
                            "This room is already reserved for "
                            "some or all of these dates."
                        )
                    }
                )

            # An overnight reservation occupies the room for each
            # calendar date from check-in through the day before
            # checkout.
            #
            # Therefore a short rest conflicts when its booking
            # date falls inside [check_in, check_out).
            overlapping_short_rest = (
                Reservation.objects.filter(
                    room=room,
                    stay_type="Short Rest",
                    short_rest_start__date__gte=check_in,
                    short_rest_start__date__lt=check_out,
                )
                .exclude(
                    status__in=["Cancelled", "Checked Out"]
                )
            )

            if instance:
                overlapping_short_rest = (
                    overlapping_short_rest.exclude(
                        id=instance.id
                    )
                )

            if overlapping_short_rest.exists():
                raise serializers.ValidationError(
                    {
                        "room": (
                            "This room has a short-rest booking "
                            "during the requested overnight stay."
                        )
                    }
                )

        elif room and stay_type == "Short Rest":

            # Short rest vs overnight.
            #
            # An overnight reservation occupies the room on every
            # calendar date from check-in through the day before
            # checkout.
            #
            # A short rest on the overnight checkout date is
            # therefore allowed by this calendar-date boundary.
            overlapping_overnight = (
                Reservation.objects.filter(
                    room=room,
                    stay_type="Overnight",
                    check_in_date__lte=short_rest_start.date(),
                    check_out_date__gt=short_rest_start.date(),
                )
                .exclude(
                    status__in=["Cancelled", "Checked Out"]
                )
            )

            if instance:
                overlapping_overnight = (
                    overlapping_overnight.exclude(
                        id=instance.id
                    )
                )

            if overlapping_overnight.exists():
                raise serializers.ValidationError(
                    {
                        "room": (
                            "This room is occupied by an overnight "
                            "reservation on the selected booking date."
                        )
                    }
                )

            # Short-rest vs short-rest.
            #
            # Half-open interval:
            # [start, end)
            #
            # Therefore:
            # 2:00-4:00 and 4:00-6:00 do NOT overlap.
            overlapping_short_rest = (
                Reservation.objects.filter(
                    room=room,
                    stay_type="Short Rest",
                    short_rest_start__lt=short_rest_end,
                    short_rest_end__gt=short_rest_start,
                )
                .exclude(
                    status__in=["Cancelled", "Checked Out"]
                )
            )

            if instance:
                overlapping_short_rest = (
                    overlapping_short_rest.exclude(
                        id=instance.id
                    )
                )

            if overlapping_short_rest.exists():
                raise serializers.ValidationError(
                    {
                        "room": (
                            "This room is already booked for "
                            "some or all of the selected "
                            "short-rest time."
                        )
                    }
                )

        return data

class ShortRestPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShortRestPackage
        fields = [
            "id",
            "name",
            "duration_hours",
            "price",
            "active",
        ]
