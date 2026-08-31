from django.db import transaction

from django.utils import timezone

from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from tenants.permissions import IsLodgeMember
from tenants.utils import get_current_lodge

from billing.models import Charge
from tenants.models import Membership
from .models import Reservation
from .serializers import ReservationSerializer


class ReservationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsLodgeMember]
    
    serializer_class = ReservationSerializer
        
    def get_queryset(self):
        if self.request.user.is_superuser:
            return Reservation.objects.all().order_by("-created_at")

        lodge = get_current_lodge(self.request.user)

        return Reservation.objects.filter(
            lodge=lodge
        ).order_by("-created_at")
    

    def create(self, request, *args, **kwargs):
        """
        Create a reservation and automatically mark the room as Reserved.
        """
        guest_id = request.data.get("guest")
        room_id = request.data.get("room")

        if not guest_id or not room_id:
            return Response(
                {"detail": "Guest and room are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        membership = (
            Membership.objects
            .filter(
                user=request.user,
                active=True,
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return Response(
                {
                    "detail": (
                        "You do not have an active lodge membership."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        lodge = membership.lodge    

        try:
            with transaction.atomic():
                reservation_data = request.data.copy()

                # Assign the authenticated user's lodge before validation.
                reservation_data["lodge"] = lodge.id

                serializer = self.get_serializer(data=reservation_data)
                serializer.is_valid(raise_exception=True)

                room = serializer.validated_data["room"]
                guest = serializer.validated_data["guest"]

                if not guest.active:
                    return Response(
                        {
                            "detail": (
                                "This guest is inactive and cannot make "
                                "a reservation."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if not room.active:
                    return Response(
                        {
                            "detail": (
                                "This room is inactive and cannot be reserved."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Only maintenance blocks future reservations.
                # Occupied and Cleaning are handled by date-overlap validation.
                if room.status == "Maintenance":
                    return Response(
                        {
                            "detail": (
                                f"Room {room.room_name} is currently under maintenance "
                                "and cannot be reserved."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                check_in_date = serializer.validated_data["check_in_date"]
                check_out_date = serializer.validated_data["check_out_date"]

                if check_out_date <= check_in_date:
                    return Response(
                        {
                            "detail": (
                                "Check-out date must be after check-in date."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                number_of_guests = serializer.validated_data[
                    "number_of_guests"
                ]

                if number_of_guests > room.maximum_occupancy:
                    return Response(
                        {
                            "detail": (
                                f"This room can accommodate a maximum of "
                                f"{room.maximum_occupancy} guests."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                reservation = serializer.save(
                    lodge=lodge,
                    room_rate=room.price_per_night,
                )

                # New reservation occupies the room for future booking.
                room.status = "Reserved"
                room.save(update_fields=["status"])

                response_serializer = self.get_serializer(reservation)

                return Response(
                    response_serializer.data,
                    status=status.HTTP_201_CREATED,
                )

        except serializers.ValidationError as error:
            return Response(
                error.detail,
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as error:
            print("Reservation creation error:", error)

            return Response(
                {"detail": "Unable to create reservation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["patch"])
    def check_in(self, request, pk=None):
        reservation = self.get_object()

        # Reservation must be active
        if reservation.status == "Cancelled":
            return Response(
                {
                    "detail": (
                        "A cancelled reservation cannot be checked in."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if reservation.status == "Checked In":
            return Response(
                {
                    "detail": (
                        "This reservation is already checked in."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if reservation.status == "Checked Out":
            return Response(
                {
                    "detail": (
                        "A checked-out reservation cannot be checked in."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check-in date must have arrived
        if reservation.check_in_date > timezone.localdate():
            return Response(
                {
                    "detail": (
                        "This reservation cannot be checked in yet. "
                        "The check-in date has not arrived."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Guest must still be active
        if not reservation.guest.active:
            return Response(
                {
                    "detail": (
                        "This guest is inactive and cannot be checked in."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Room must be active
        if not reservation.room.active:
            return Response(
                {
                    "detail": (
                        "This room is inactive and cannot be checked in."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reservation must have a room rate
        if reservation.room_rate is None:
            return Response(
                {
                    "detail": (
                        "This reservation has no room rate and "
                        "cannot be checked in."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate number of nights
        nights = (
            reservation.check_out_date
            - reservation.check_in_date
        ).days

        if nights <= 0:
            return Response(
                {
                    "detail": (
                        "Reservation must have at least one night."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Update reservation
            reservation.status = "Checked In"
            reservation.checked_in_at = timezone.now()
            reservation.save()

            # Prevent duplicate accommodation charge
            accommodation_exists = Charge.objects.filter(
                reservation=reservation,
                category="Accommodation",
            ).exists()

            if not accommodation_exists:
                Charge.objects.create(
                    reservation=reservation,
                    category="Accommodation",
                    description=f"Room {reservation.room.room_name}",
                    quantity=nights,
                    unit_price=reservation.room_rate,
                )

            # Update room
            reservation.room.status = "Occupied"
            reservation.room.save(update_fields=["status"])

        serializer = self.get_serializer(reservation)

        return Response(serializer.data)

    @action(detail=True, methods=["patch"])
    def check_out(self, request, pk=None):
        reservation = self.get_object()

        # Must already be checked in
        if reservation.status != "Checked In":
            return Response(
                {
                    "detail": (
                        "Only checked-in reservations can be checked out."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ---------------------------------------------------------
        # ACTUAL CHECKOUT DATE
        # ---------------------------------------------------------
        actual_checkout_date = timezone.localdate()

        # ---------------------------------------------------------
        # RECALCULATE ACCOMMODATION CHARGE
        # BASED ON ACTUAL CHECKOUT DATE
        # ---------------------------------------------------------
        accommodation_charge = Charge.objects.filter(
            reservation=reservation,
            category="Accommodation",
        ).first()

        if accommodation_charge:
            nights = (
                actual_checkout_date - reservation.check_in_date
            ).days

            # A guest who checks in and checks out on the same
            # calendar day is charged for 1 night.
            nights = max(1, nights)

            accommodation_charge.quantity = nights
            accommodation_charge.unit_price = reservation.room_rate
            accommodation_charge.save(
                update_fields=[
                    "quantity",
                    "unit_price",
                ]
            )
        else:
            return Response(
                {
                    "detail": (
                        "Accommodation charge was not found "
                        "for this reservation."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ---------------------------------------------------------
        # CALCULATE CURRENT BILL
        # AFTER ACCOMMODATION HAS BEEN RECALCULATED
        # ---------------------------------------------------------
        total_charges = sum(
            (
                charge.quantity * charge.unit_price
                for charge in Charge.objects.filter(
                    reservation=reservation
                )
            ),
            0,
        )

        total_paid = sum(
            (
                payment.amount
                for payment in reservation.payments.all()
            ),
            0,
        )

        balance = total_charges - total_paid

        # ---------------------------------------------------------
        # BLOCK CHECKOUT IF MONEY IS STILL OWED
        # ---------------------------------------------------------
        if balance > 0:
            return Response(
                {
                    "detail": (
                        "Checkout cannot be completed because "
                        f"the reservation has an outstanding balance "
                        f"of ₦{balance:,.2f}."
                    ),
                    "total_charges": total_charges,
                    "total_paid": total_paid,
                    "balance": balance,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ---------------------------------------------------------
        # COMPLETE CHECKOUT
        # ---------------------------------------------------------
        with transaction.atomic():

            reservation.status = "Checked Out"
            reservation.checked_out_at = timezone.now()

            # Save the actual departure date
            reservation.check_out_date = actual_checkout_date

            reservation.save()

            # Send room for cleaning
            reservation.room.status = "Cleaning"
            reservation.room.save(
                update_fields=["status"]
            )

        serializer = self.get_serializer(reservation)

        return Response(serializer.data)
    
    def partial_update(self, request, *args, **kwargs):
        """
        Handle reservation edits and cancellation.

        Business rules:
        - Reserved reservations can be fully edited.
        - Checked-in reservations can have their checkout date,
          guest count, requests and notes edited.
        - Checked-in reservations cannot change room or check-in date.
        - Checked-out and cancelled reservations cannot be edited.
        - Room availability is checked by ReservationSerializer.
        """

        reservation = self.get_object()
        new_status = request.data.get("status")

        # ---------------------------------------------------------
        # CANCELLATION
        # ---------------------------------------------------------

        if new_status == "Cancelled":
            if reservation.status == "Checked In":
                return Response(
                    {
                        "detail": (
                            "A checked-in reservation cannot be cancelled. "
                            "Check the guest out instead."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if reservation.status == "Checked Out":
                return Response(
                    {
                        "detail": (
                            "A checked-out reservation cannot be cancelled."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if reservation.status == "Cancelled":
                return Response(
                    {
                        "detail": (
                            "This reservation is already cancelled."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                reservation.status = "Cancelled"
                reservation.save(update_fields=["status"])

                # Only release the room if there are no other active
                # reservations for this room.
                other_reserved = Reservation.objects.filter(
                    room=reservation.room,
                    status="Reserved",
                ).exclude(
                    id=reservation.id
                ).exists()

                if reservation.room.status == "Reserved" and not other_reserved:
                    reservation.room.status = "Available"
                    reservation.room.save(
                        update_fields=["status"]
                    )

            serializer = self.get_serializer(reservation)

            return Response(serializer.data)

        # ---------------------------------------------------------
        # BLOCK EDITING COMPLETED/CANCELLED RESERVATIONS
        # ---------------------------------------------------------

        if reservation.status in ["Cancelled", "Checked Out"]:
            return Response(
                {
                    "detail": (
                        "This reservation can no longer be edited."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ---------------------------------------------------------
        # CHECKED-IN RESERVATION RULES
        # ---------------------------------------------------------

        if reservation.status == "Checked In":

            # Room cannot be changed during an active stay.
            if "room" in request.data:
                new_room_id = request.data.get("room")

                if str(new_room_id) != str(reservation.room_id):
                    return Response(
                        {
                            "detail": (
                                "The room cannot be changed after "
                                "the guest has checked in."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Check-in date cannot be changed during an active stay.
            if "check_in_date" in request.data:
                if (
                    request.data.get("check_in_date")
                    != str(reservation.check_in_date)
                ):
                    return Response(
                        {
                            "detail": (
                                "The check-in date cannot be changed "
                                "after the guest has checked in."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # ---------------------------------------------------------
        # SAVE EDIT
        # ---------------------------------------------------------

        try:
            with transaction.atomic():

                old_room = reservation.room

                serializer = self.get_serializer(
                    reservation,
                    data=request.data,
                    partial=True,
                )

                serializer.is_valid(raise_exception=True)

                validated_data = serializer.validated_data

                new_room = validated_data.get(
                    "room",
                    reservation.room,
                )

                new_check_in = validated_data.get(
                    "check_in_date",
                    reservation.check_in_date,
                )

                new_check_out = validated_data.get(
                    "check_out_date",
                    reservation.check_out_date,
                )

                # -------------------------------------------------
                # UPDATE ROOM RATE IF ROOM CHANGES
                # -------------------------------------------------

                if new_room.id != old_room.id:

                    if reservation.status != "Reserved":
                        return Response(
                            {
                                "detail": (
                                    "The room cannot be changed "
                                    "for an active stay."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    if not new_room.active:
                        return Response(
                            {
                                "detail": (
                                    "This room is inactive and "
                                    "cannot be reserved."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    if new_room.status == "Maintenance":
                        return Response(
                            {
                                "detail": (
                                    f"Room {new_room.room_name} is currently under maintenance "
                                    "and cannot be reserved."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    reservation.room_rate = (
                        new_room.price_per_night
                    )

                # -------------------------------------------------
                # SAVE RESERVATION
                # -------------------------------------------------

                reservation = serializer.save(
                    room_rate=reservation.room_rate
                )

                # -------------------------------------------------
                # ROOM STATUS WHEN FUTURE RESERVATION CHANGES ROOM
                # -------------------------------------------------

                if (
                    reservation.status == "Reserved"
                    and new_room.id != old_room.id
                ):
                    old_room.status = "Available"
                    old_room.save(update_fields=["status"])

                    new_room.status = "Reserved"
                    new_room.save(update_fields=["status"])

                # -------------------------------------------------
                # UPDATE ACCOMMODATION CHARGE AFTER EXTENSION
                # -------------------------------------------------

                if reservation.status == "Checked In":

                    accommodation_charge = Charge.objects.filter(
                        reservation=reservation,
                        category="Accommodation",
                    ).first()

                    if accommodation_charge:
                        nights = (
                            new_check_out - new_check_in
                        ).days

                        if nights <= 0:
                            return Response(
                                {
                                    "detail": (
                                        "Reservation must have "
                                        "at least one night."
                                    )
                                },
                                status=status.HTTP_400_BAD_REQUEST,
                            )

                        accommodation_charge.quantity = nights
                        accommodation_charge.unit_price = (
                            reservation.room_rate
                        )

                        accommodation_charge.save(
                            update_fields=[
                                "quantity",
                                "unit_price",
                            ]
                        )

                response_serializer = self.get_serializer(
                    reservation
                )

                return Response(
                    response_serializer.data,
                    status=status.HTTP_200_OK,
                )

        except serializers.ValidationError as error:
            return Response(
                error.detail,
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as error:
            print("Reservation update error:", error)

            return Response(
                {
                    "detail": (
                        "Unable to update reservation."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )