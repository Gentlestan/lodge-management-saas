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

from audit.models import AuditLog
from audit.services import AuditService

from .models import Reservation
from .serializers import ReservationSerializer


class ReservationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsLodgeMember]
    serializer_class = ReservationSerializer

    # ------------------------------------------------------------------
    # QUERYSET
    # ------------------------------------------------------------------

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Reservation.objects.all().order_by("-created_at")

        lodge = get_current_lodge(self.request.user)

        return Reservation.objects.filter(
            lodge=lodge
        ).order_by("-created_at")

    # ------------------------------------------------------------------
    # AUDIT HELPERS
    # ------------------------------------------------------------------

    @staticmethod
    def _reservation_values(reservation):
        """
        Return reservation fields that are useful for audit history.

        Deliberately excludes:
        - special_requests
        - notes
        """

        return {
            "status": reservation.status,
            "guest_id": reservation.guest_id,
            "room_id": reservation.room_id,
            "room_rate": (
                str(reservation.room_rate)
                if reservation.room_rate is not None
                else None
            ),
            "check_in_date": (
                reservation.check_in_date.isoformat()
                if reservation.check_in_date
                else None
            ),
            "check_out_date": (
                reservation.check_out_date.isoformat()
                if reservation.check_out_date
                else None
            ),
            "number_of_guests": reservation.number_of_guests,
        }

    @staticmethod
    def _changed_values(old_values, new_values):
        """
        Return only reservation fields whose values changed.
        """

        changes = {}

        for field, old_value in old_values.items():
            new_value = new_values.get(field)

            if old_value != new_value:
                changes[field] = {
                    "from": old_value,
                    "to": new_value,
                }

        return changes

    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------

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

                serializer = self.get_serializer(
                    data=reservation_data
                )

                serializer.is_valid(
                    raise_exception=True
                )

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
                                f"Room {room.room_name} is currently under "
                                "maintenance and cannot be reserved."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                check_in_date = serializer.validated_data[
                    "check_in_date"
                ]

                check_out_date = serializer.validated_data[
                    "check_out_date"
                ]

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
                                "This room can accommodate a maximum of "
                                f"{room.maximum_occupancy} guests."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                reservation = serializer.save(
                    lodge=lodge,
                    room_rate=room.price_per_night,
                )

                # Capture the actual previous room state.
                old_room_status = room.status

                # New reservation occupies the room for future booking.
                room.status = "Reserved"

                room.save(
                    update_fields=["status"]
                )

                # ------------------------------------------------------
                # AUDIT: RESERVATION CREATED
                # ------------------------------------------------------

                AuditService.log(
                    actor=request.user,
                    lodge=lodge,
                    action=AuditLog.Action.CREATE,
                    obj=reservation,
                    changes={
                        "status": {
                            "from": None,
                            "to": reservation.status,
                        },
                        "guest_id": {
                            "from": None,
                            "to": reservation.guest_id,
                        },
                        "room_id": {
                            "from": None,
                            "to": reservation.room_id,
                        },
                        "room_rate": {
                            "from": None,
                            "to": (
                                str(reservation.room_rate)
                                if reservation.room_rate is not None
                                else None
                            ),
                        },
                        "check_in_date": {
                            "from": None,
                            "to": (
                                reservation.check_in_date.isoformat()
                                if reservation.check_in_date
                                else None
                            ),
                        },
                        "check_out_date": {
                            "from": None,
                            "to": (
                                reservation.check_out_date.isoformat()
                                if reservation.check_out_date
                                else None
                            ),
                        },
                        "number_of_guests": {
                            "from": None,
                            "to": reservation.number_of_guests,
                        },
                    },
                )

                # ------------------------------------------------------
                # AUDIT: ROOM STATUS CHANGED
                # ------------------------------------------------------

                if old_room_status != room.status:
                    AuditService.log(
                        actor=request.user,
                        lodge=lodge,
                        action=AuditLog.Action.UPDATE,
                        obj=room,
                        changes={
                            "status": {
                                "from": old_room_status,
                                "to": room.status,
                            }
                        },
                        details={
                            "reason": "Reservation created",
                            "reservation_id": reservation.id,
                        },
                    )

                response_serializer = self.get_serializer(
                    reservation
                )

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

    # ------------------------------------------------------------------
    # CHECK IN
    # ------------------------------------------------------------------

    @action(detail=True, methods=["patch"])
    def check_in(self, request, pk=None):
        reservation = self.get_object()
        lodge = reservation.lodge

        # Reservation must be active.
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

        # Check-in date must have arrived.
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

        # Guest must still be active.
        if not reservation.guest.active:
            return Response(
                {
                    "detail": (
                        "This guest is inactive and cannot be checked in."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Room must be active.
        if not reservation.room.active:
            return Response(
                {
                    "detail": (
                        "This room is inactive and cannot be checked in."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reservation must have a room rate.
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

        # Calculate number of nights.
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
            old_reservation_status = reservation.status
            old_room_status = reservation.room.status

            # Update reservation.
            reservation.status = "Checked In"
            reservation.checked_in_at = timezone.now()

            reservation.save()

            # Prevent duplicate accommodation charge.
            accommodation_charge = Charge.objects.filter(
                reservation=reservation,
                category="Accommodation",
            ).first()

            accommodation_created = False

            if accommodation_charge is None:
                accommodation_charge = Charge.objects.create(
                    reservation=reservation,
                    category="Accommodation",
                    description=(
                        f"Room {reservation.room.room_name}"
                    ),
                    quantity=nights,
                    unit_price=reservation.room_rate,
                )

                accommodation_created = True

            # Update room.
            reservation.room.status = "Occupied"

            reservation.room.save(
                update_fields=["status"]
            )

            # ----------------------------------------------------------
            # AUDIT: CHECK-IN
            # ----------------------------------------------------------

            AuditService.log(
                actor=request.user,
                lodge=lodge,
                action=AuditLog.Action.CHECK_IN,
                obj=reservation,
                changes={
                    "status": {
                        "from": old_reservation_status,
                        "to": reservation.status,
                    },
                    "checked_in_at": {
                        "from": None,
                        "to": (
                            reservation.checked_in_at.isoformat()
                            if reservation.checked_in_at
                            else None
                        ),
                    },
                },
                details={
                    "room_id": reservation.room_id,
                    "guest_id": reservation.guest_id,
                    "nights": nights,
                },
            )

            # ----------------------------------------------------------
            # AUDIT: ROOM STATUS
            # ----------------------------------------------------------

            if old_room_status != reservation.room.status:
                AuditService.log(
                    actor=request.user,
                    lodge=lodge,
                    action=AuditLog.Action.UPDATE,
                    obj=reservation.room,
                    changes={
                        "status": {
                            "from": old_room_status,
                            "to": reservation.room.status,
                        }
                    },
                    details={
                        "reason": "Reservation checked in",
                        "reservation_id": reservation.id,
                    },
                )

            # ----------------------------------------------------------
            # AUDIT: ACCOMMODATION CHARGE
            # Only when actually created.
            # ----------------------------------------------------------

            if accommodation_created:
                AuditService.log(
                    actor=request.user,
                    lodge=lodge,
                    action=AuditLog.Action.CREATE,
                    obj=accommodation_charge,
                    changes={
                        "quantity": {
                            "from": None,
                            "to": accommodation_charge.quantity,
                        },
                        "unit_price": {
                            "from": None,
                            "to": (
                                str(
                                    accommodation_charge.unit_price
                                )
                                if accommodation_charge.unit_price
                                is not None
                                else None
                            ),
                        },
                    },
                    details={
                        "reason": (
                            "Accommodation charge created on check-in"
                        ),
                        "reservation_id": reservation.id,
                    },
                )

        serializer = self.get_serializer(
            reservation
        )

        return Response(
            serializer.data
        )

    # ------------------------------------------------------------------
    # CHECK OUT
    # ------------------------------------------------------------------

    @action(detail=True, methods=["patch"])
    def check_out(self, request, pk=None):
        reservation = self.get_object()
        lodge = reservation.lodge

        # Must already be checked in.
        if reservation.status != "Checked In":
            return Response(
                {
                    "detail": (
                        "Only checked-in reservations can be checked out."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        actual_checkout_date = timezone.localdate()

        accommodation_charge = Charge.objects.filter(
            reservation=reservation,
            category="Accommodation",
        ).first()

        if accommodation_charge is None:
            return Response(
                {
                    "detail": (
                        "Accommodation charge was not found "
                        "for this reservation."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --------------------------------------------------------------
        # Calculate final accommodation charge WITHOUT mutating it.
        # --------------------------------------------------------------

        nights = (
            actual_checkout_date
            - reservation.check_in_date
        ).days

        # Same-day check-in/check-out is charged as 1 night.
        nights = max(1, nights)

        # --------------------------------------------------------------
        # Calculate prospective current bill.
        # --------------------------------------------------------------

        total_charges = sum(
            (
                (
                    nights * reservation.room_rate
                    if charge.pk == accommodation_charge.pk
                    else charge.quantity * charge.unit_price
                )
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

        # --------------------------------------------------------------
        # Block checkout if money is still owed.
        # --------------------------------------------------------------

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

        # --------------------------------------------------------------
        # Complete checkout atomically.
        # --------------------------------------------------------------

        with transaction.atomic():
            old_reservation_status = reservation.status
            old_check_out_date = reservation.check_out_date
            old_room_status = reservation.room.status

            old_charge_quantity = accommodation_charge.quantity
            old_charge_unit_price = accommodation_charge.unit_price

            new_charge_quantity = nights
            new_charge_unit_price = reservation.room_rate

            charge_changed = (
                old_charge_quantity != new_charge_quantity
                or old_charge_unit_price
                != new_charge_unit_price
            )

            # Update accommodation charge.
            accommodation_charge.quantity = new_charge_quantity
            accommodation_charge.unit_price = (
                new_charge_unit_price
            )

            accommodation_charge.save(
                update_fields=[
                    "quantity",
                    "unit_price",
                ]
            )

            # Complete checkout.
            reservation.status = "Checked Out"
            reservation.checked_out_at = timezone.now()

            # Save actual departure date.
            reservation.check_out_date = actual_checkout_date

            reservation.save()

            # Send room for cleaning.
            reservation.room.status = "Cleaning"

            reservation.room.save(
                update_fields=["status"]
            )

            # ----------------------------------------------------------
            # AUDIT: CHECKOUT
            # ----------------------------------------------------------

            AuditService.log(
                actor=request.user,
                lodge=lodge,
                action=AuditLog.Action.CHECK_OUT,
                obj=reservation,
                changes={
                    "status": {
                        "from": old_reservation_status,
                        "to": reservation.status,
                    },
                    "check_out_date": {
                        "from": (
                            old_check_out_date.isoformat()
                            if old_check_out_date
                            else None
                        ),
                        "to": actual_checkout_date.isoformat(),
                    },
                    "checked_out_at": {
                        "from": None,
                        "to": (
                            reservation.checked_out_at.isoformat()
                            if reservation.checked_out_at
                            else None
                        ),
                    },
                },
                details={
                    "room_id": reservation.room_id,
                    "actual_nights": nights,
                    "total_charges": str(total_charges),
                    "total_paid": str(total_paid),
                    "balance": str(balance),
                },
            )

            # ----------------------------------------------------------
            # AUDIT: ROOM STATUS
            # ----------------------------------------------------------

            if old_room_status != reservation.room.status:
                AuditService.log(
                    actor=request.user,
                    lodge=lodge,
                    action=AuditLog.Action.UPDATE,
                    obj=reservation.room,
                    changes={
                        "status": {
                            "from": old_room_status,
                            "to": reservation.room.status,
                        }
                    },
                    details={
                        "reason": "Reservation checked out",
                        "reservation_id": reservation.id,
                    },
                )

            # ----------------------------------------------------------
            # AUDIT: ACCOMMODATION CHARGE
            # Only if quantity/unit price actually changed.
            # ----------------------------------------------------------

            if charge_changed:
                AuditService.log(
                    actor=request.user,
                    lodge=lodge,
                    action=AuditLog.Action.UPDATE,
                    obj=accommodation_charge,
                    changes={
                        "quantity": {
                            "from": old_charge_quantity,
                            "to": new_charge_quantity,
                        },
                        "unit_price": {
                            "from": (
                                str(old_charge_unit_price)
                                if old_charge_unit_price is not None
                                else None
                            ),
                            "to": (
                                str(new_charge_unit_price)
                                if new_charge_unit_price is not None
                                else None
                            ),
                        },
                    },
                    details={
                        "reason": (
                            "Accommodation charge recalculated "
                            "on checkout"
                        ),
                        "reservation_id": reservation.id,
                    },
                )

        serializer = self.get_serializer(
            reservation
        )

        return Response(
            serializer.data
        )

    # ------------------------------------------------------------------
    # UPDATE / PATCH
    # ------------------------------------------------------------------

    def update(self, request, *args, **kwargs):
        """
        Keep PUT covered by the same reservation update logic,
        while preserving full-update semantics.
        """

        return self._update_reservation(
            request,
            partial=False,
            *args,
            **kwargs,
        )

    def partial_update(self, request, *args, **kwargs):
        """
        Handle reservation edits and cancellation.
        """

        return self._update_reservation(
            request,
            partial=True,
            *args,
            **kwargs,
        )

    def _update_reservation(
        self,
        request,
        partial=True,
        *args,
        **kwargs,
    ):
        reservation = self.get_object()
        lodge = reservation.lodge

        new_status = request.data.get("status")

        # --------------------------------------------------------------
        # CANCELLATION
        # --------------------------------------------------------------

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
                old_reservation_status = reservation.status
                old_room_status = reservation.room.status

                reservation.status = "Cancelled"

                reservation.save(
                    update_fields=["status"]
                )

                # Only release the room if there are no other
                # active reservations for this room.
                other_reserved = Reservation.objects.filter(
                    room=reservation.room,
                    status="Reserved",
                ).exclude(
                    id=reservation.id
                ).exists()

                room_released = False

                if (
                    reservation.room.status == "Reserved"
                    and not other_reserved
                ):
                    reservation.room.status = "Available"

                    reservation.room.save(
                        update_fields=["status"]
                    )

                    room_released = True

                # ------------------------------------------------------
                # AUDIT: CANCELLATION
                # ------------------------------------------------------

                AuditService.log(
                    actor=request.user,
                    lodge=lodge,
                    action=AuditLog.Action.CANCEL,
                    obj=reservation,
                    changes={
                        "status": {
                            "from": old_reservation_status,
                            "to": reservation.status,
                        }
                    },
                    details={
                        "room_id": reservation.room_id,
                        "room_released": room_released,
                    },
                )

                # ------------------------------------------------------
                # AUDIT: ROOM RELEASE
                # ------------------------------------------------------

                if room_released:
                    AuditService.log(
                        actor=request.user,
                        lodge=lodge,
                        action=AuditLog.Action.UPDATE,
                        obj=reservation.room,
                        changes={
                            "status": {
                                "from": old_room_status,
                                "to": reservation.room.status,
                            }
                        },
                        details={
                            "reason": "Reservation cancelled",
                            "reservation_id": reservation.id,
                        },
                    )

            serializer = self.get_serializer(
                reservation
            )

            return Response(
                serializer.data
            )

        # --------------------------------------------------------------
        # BLOCK EDITING COMPLETED/CANCELLED RESERVATIONS
        # --------------------------------------------------------------

        if reservation.status in [
            "Cancelled",
            "Checked Out",
        ]:
            return Response(
                {
                    "detail": (
                        "This reservation can no longer be edited."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --------------------------------------------------------------
        # CHECKED-IN RESERVATION RULES
        # --------------------------------------------------------------

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

        # --------------------------------------------------------------
        # SAVE EDIT
        # --------------------------------------------------------------

        try:
            with transaction.atomic():
                # Capture old state before any changes.
                old_values = self._reservation_values(
                    reservation
                )

                old_room = reservation.room
                old_room_status = old_room.status

                serializer = self.get_serializer(
                    reservation,
                    data=request.data,
                    partial=partial,
                )

                serializer.is_valid(
                    raise_exception=True
                )

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

                room_changed = (
                    new_room.id != old_room.id
                )

                # ------------------------------------------------------
                # ROOM CHANGE VALIDATION
                # ------------------------------------------------------

                old_new_room_status = None

                if room_changed:
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
                                    f"Room {new_room.room_name} is currently "
                                    "under maintenance and cannot be reserved."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    # Capture the actual destination room status
                    # before changing it.
                    old_new_room_status = new_room.status

                    reservation.room_rate = (
                        new_room.price_per_night
                    )

                # ------------------------------------------------------
                # VALIDATE NIGHTS BEFORE serializer.save()
                # ------------------------------------------------------

                nights = None

                if reservation.status == "Checked In":
                    nights = (
                        new_check_out
                        - new_check_in
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

                # ------------------------------------------------------
                # SAVE RESERVATION
                # ------------------------------------------------------

                reservation = serializer.save(
                    room_rate=reservation.room_rate
                )

                # ------------------------------------------------------
                # ROOM STATUS WHEN FUTURE RESERVATION CHANGES ROOM
                # ------------------------------------------------------

                if (
                    reservation.status == "Reserved"
                    and room_changed
                ):
                    old_room.status = "Available"

                    old_room.save(
                        update_fields=["status"]
                    )

                    new_room.status = "Reserved"

                    new_room.save(
                        update_fields=["status"]
                    )

                # ------------------------------------------------------
                # UPDATE ACCOMMODATION CHARGE AFTER EDIT
                # ------------------------------------------------------

                accommodation_charge = None
                old_charge_quantity = None
                old_charge_unit_price = None

                charge_changed = False

                new_charge_quantity = None
                new_charge_unit_price = None

                if reservation.status == "Checked In":
                    accommodation_charge = Charge.objects.filter(
                        reservation=reservation,
                        category="Accommodation",
                    ).first()

                    if accommodation_charge:
                        old_charge_quantity = (
                            accommodation_charge.quantity
                        )

                        old_charge_unit_price = (
                            accommodation_charge.unit_price
                        )

                        new_charge_quantity = nights
                        new_charge_unit_price = (
                            reservation.room_rate
                        )

                        charge_changed = (
                            old_charge_quantity
                            != new_charge_quantity
                            or old_charge_unit_price
                            != new_charge_unit_price
                        )

                        if charge_changed:
                            accommodation_charge.quantity = (
                                new_charge_quantity
                            )

                            accommodation_charge.unit_price = (
                                new_charge_unit_price
                            )

                            accommodation_charge.save(
                                update_fields=[
                                    "quantity",
                                    "unit_price",
                                ]
                            )

                # ------------------------------------------------------
                # AUDIT: RESERVATION UPDATE
                # ------------------------------------------------------

                new_values = self._reservation_values(
                    reservation
                )

                reservation_changes = self._changed_values(
                    old_values,
                    new_values,
                )

                if reservation_changes:
                    AuditService.log(
                        actor=request.user,
                        lodge=lodge,
                        action=AuditLog.Action.UPDATE,
                        obj=reservation,
                        changes=reservation_changes,
                    )

                # ------------------------------------------------------
                # AUDIT: ROOM CHANGE
                # ------------------------------------------------------

                if room_changed:
                    AuditService.log(
                        actor=request.user,
                        lodge=lodge,
                        action=AuditLog.Action.UPDATE,
                        obj=old_room,
                        changes={
                            "status": {
                                "from": old_room_status,
                                "to": old_room.status,
                            }
                        },
                        details={
                            "reason": (
                                "Reservation room changed"
                            ),
                            "reservation_id": reservation.id,
                            "direction": "released",
                        },
                    )

                    AuditService.log(
                        actor=request.user,
                        lodge=lodge,
                        action=AuditLog.Action.UPDATE,
                        obj=new_room,
                        changes={
                            "status": {
                                "from": old_new_room_status,
                                "to": new_room.status,
                            }
                        },
                        details={
                            "reason": (
                                "Reservation room changed"
                            ),
                            "reservation_id": reservation.id,
                            "direction": "reserved",
                        },
                    )

                # ------------------------------------------------------
                # AUDIT: ACCOMMODATION CHARGE
                # Only when the charge actually changed.
                # ------------------------------------------------------

                if (
                    accommodation_charge is not None
                    and charge_changed
                ):
                    AuditService.log(
                        actor=request.user,
                        lodge=lodge,
                        action=AuditLog.Action.UPDATE,
                        obj=accommodation_charge,
                        changes={
                            "quantity": {
                                "from": old_charge_quantity,
                                "to": new_charge_quantity,
                            },
                            "unit_price": {
                                "from": (
                                    str(old_charge_unit_price)
                                    if old_charge_unit_price is not None
                                    else None
                                ),
                                "to": (
                                    str(new_charge_unit_price)
                                    if new_charge_unit_price is not None
                                    else None
                                ),
                            },
                        },
                        details={
                            "reason": (
                                "Accommodation charge updated "
                                "after reservation edit"
                            ),
                            "reservation_id": reservation.id,
                        },
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

    # ------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------

    def destroy(self, request, *args, **kwargs):
        """
        Audit the reservation before deleting it.
        The audit and deletion occur in the same transaction.
        """

        reservation = self.get_object()
        lodge = reservation.lodge

        old_values = self._reservation_values(
            reservation
        )

        object_repr = str(reservation)

        with transaction.atomic():
            AuditService.log(
                actor=request.user,
                lodge=lodge,
                action=AuditLog.Action.DELETE,
                obj=reservation,
                changes=old_values,
                details={
                    "object_repr": object_repr,
                },
            )

            reservation.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )