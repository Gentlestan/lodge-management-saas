from django.db import transaction
from django.utils import timezone

from rest_framework import generics, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from tenants.permissions import (
    IsLodgeMember,
    IsServiceItemManagerOrOwner,
)
from tenants.utils import get_current_lodge
from billing.models import Charge
from tenants.models import Membership
from audit.models import AuditLog
from audit.services import AuditService


from .models import Reservation, ShortRestPackage
from .serializers import (
    ReservationSerializer,
    ShortRestPackageSerializer,
)

import logging

logger = logging.getLogger(__name__)


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
    # ROOM AVAILABILITY HELPER
    # ------------------------------------------------------------------

    @staticmethod
    def _room_has_other_active_reservation(
        room,
        reservation_id=None,
    ):
        """
        Determine whether a room still has another reservation that
        should keep the room from being marked Available.

        This intentionally considers only reservations that are still
        operationally relevant.

        Checked In:
            The room is currently occupied.

        Reserved:
            The room has a future/current reservation.

        Cancelled and Checked Out reservations do not keep the room
        reserved.
        """

        queryset = Reservation.objects.filter(
            room=room,
            status__in=[
                "Reserved",
                "Checked In",
            ],
        )

        if reservation_id is not None:
            queryset = queryset.exclude(
                id=reservation_id
            )

        return queryset.exists()

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
            "stay_type": reservation.stay_type,
            "short_rest_package_id": (
                reservation.short_rest_package_id
            ),
            "short_rest_start": (
                reservation.short_rest_start.isoformat()
                if reservation.short_rest_start
                else None
            ),
            "short_rest_end": (
                reservation.short_rest_end.isoformat()
                if reservation.short_rest_end
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

        Overnight:
            room_rate = room.price_per_night

        Short Rest:
            room_rate = selected short-rest package price
        """

        guest_id = request.data.get("guest")
        room_id = request.data.get("room")

        if not guest_id or not room_id:
            return Response(
                {
                    "detail": "Guest and room are required."
                },
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

                # ------------------------------------------------------
                # GUEST VALIDATION
                # ------------------------------------------------------

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

                # ------------------------------------------------------
                # ROOM VALIDATION
                # ------------------------------------------------------

                if not room.active:
                    return Response(
                        {
                            "detail": (
                                "This room is inactive and cannot be reserved."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Maintenance blocks new reservations.
                # Occupied/Cleaning are handled through reservation
                # overlap validation.

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

                # ------------------------------------------------------
                # DATE VALIDATION
                # ------------------------------------------------------

                check_in_date = serializer.validated_data[
                    "check_in_date"
                ]

                check_out_date = serializer.validated_data[
                    "check_out_date"
                ]

                stay_type = serializer.validated_data[
                    "stay_type"
                ]

                if stay_type != "Short Rest":
                    if check_out_date <= check_in_date:
                        return Response(
                            {
                                "detail": (
                                    "Check-out date must be after "
                                    "check-in date."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                # ------------------------------------------------------
                # OCCUPANCY VALIDATION
                # ------------------------------------------------------

                number_of_guests = serializer.validated_data[
                    "number_of_guests"
                ]

                if (
                    room.maximum_occupancy is not None
                    and number_of_guests > room.maximum_occupancy
                ):
                    return Response(
                        {
                            "detail": (
                                "This room can accommodate a maximum of "
                                f"{room.maximum_occupancy} guests."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # ------------------------------------------------------
                # DETERMINE ACCOMMODATION PRICE
                # ------------------------------------------------------

                if stay_type == "Short Rest":
                    short_rest_package = (
                        serializer.validated_data.get(
                            "short_rest_package"
                        )
                    )

                    if short_rest_package is None:
                        return Response(
                            {
                                "detail": (
                                    "A short-rest package is required."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    # Short Rest uses the fixed package price.
                    room_rate = short_rest_package.price

                else:
                    # Overnight uses the room's nightly rate.
                    room_rate = room.price_per_night

                # ------------------------------------------------------
                # SAVE RESERVATION
                # ------------------------------------------------------

                reservation = serializer.save(
                    lodge=lodge,
                    room_rate=room_rate,
                )

                # Capture the actual previous room state.
                old_room_status = room.status

                # New reservation reserves the room.
                room.status = "Reserved"

                room.save(
                    update_fields=["status"]
                )

                # ------------------------------------------------------
                # AUDIT: RESERVATION CREATED
                # ------------------------------------------------------

                reservation_values = self._reservation_values(
                    reservation
                )

                creation_changes = {
                    field: {
                        "from": None,
                        "to": value,
                    }
                    for field, value in reservation_values.items()
                }

                AuditService.log(
                    actor=request.user,
                    lodge=lodge,
                    action=AuditLog.Action.CREATE,
                    obj=reservation,
                    changes=creation_changes,
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

        except Exception:
            logger.exception("Reservation creation error")

            return Response(
                {
                    "detail": "Unable to create reservation."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ------------------------------------------------------------------
    # CHECK IN
    # ------------------------------------------------------------------

    @action(detail=True, methods=["patch"])
    def check_in(self, request, pk=None):
        reservation = self.get_object()
        lodge = reservation.lodge

        # --------------------------------------------------------------
        # RESERVATION STATUS VALIDATION
        # --------------------------------------------------------------

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

        # --------------------------------------------------------------
        # CHECK-IN TIMING
        # --------------------------------------------------------------

        if reservation.stay_type == "Overnight":
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

        elif reservation.stay_type == "Short Rest":
            now = timezone.now()

            if (
                not reservation.short_rest_start
                or not reservation.short_rest_end
            ):
                return Response(
                    {
                        "detail": (
                            "This short-rest reservation has no valid "
                            "booking time."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Cannot check in before booked start time.
            if now < reservation.short_rest_start:
                return Response(
                    {
                        "detail": (
                            "This short-rest reservation cannot be checked "
                            "in yet. The booking time has not arrived."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Cannot check in after the package period has ended.
            if now >= reservation.short_rest_end:
                return Response(
                    {
                        "detail": (
                            "The scheduled short-rest period has already "
                            "ended and cannot be checked in."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # --------------------------------------------------------------
        # GUEST VALIDATION
        # --------------------------------------------------------------

        if not reservation.guest.active:
            return Response(
                {
                    "detail": (
                        "This guest is inactive and cannot be checked in."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --------------------------------------------------------------
        # ROOM VALIDATION
        # --------------------------------------------------------------

        if not reservation.room.active:
            return Response(
                {
                    "detail": (
                        "This room is inactive and cannot be checked in."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --------------------------------------------------------------
        # ROOM RATE VALIDATION
        # --------------------------------------------------------------

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

        # --------------------------------------------------------------
        # ACCOMMODATION QUANTITY
        # --------------------------------------------------------------

        if reservation.stay_type == "Overnight":
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

            accommodation_quantity = nights

        else:
            # Short Rest is one fixed package unit.
            nights = None
            accommodation_quantity = 1

        # --------------------------------------------------------------
        # COMPLETE CHECK-IN
        # --------------------------------------------------------------

        with transaction.atomic():
            old_reservation_status = reservation.status
            old_room_status = reservation.room.status

            reservation.status = "Checked In"
            reservation.checked_in_at = timezone.now()

            reservation.save()

            # ----------------------------------------------------------
            # ACCOMMODATION CHARGE
            # ----------------------------------------------------------

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
                    quantity=accommodation_quantity,
                    unit_price=reservation.room_rate,
                )

                accommodation_created = True

            # ----------------------------------------------------------
            # UPDATE ROOM
            # ----------------------------------------------------------

            reservation.room.status = "Occupied"

            reservation.room.save(
                update_fields=["status"]
            )

            # ----------------------------------------------------------
            # AUDIT: CHECK-IN
            # ----------------------------------------------------------

            check_in_details = {
                "room_id": reservation.room_id,
                "guest_id": reservation.guest_id,
                "stay_type": reservation.stay_type,
                "accommodation_quantity": accommodation_quantity,
            }

            if reservation.stay_type == "Overnight":
                check_in_details["nights"] = nights
            else:
                check_in_details["short_rest_package_id"] = (
                    reservation.short_rest_package_id
                )

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
                details=check_in_details,
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

        # --------------------------------------------------------------
        # STATUS VALIDATION
        # --------------------------------------------------------------

        if reservation.status != "Checked In":
            return Response(
                {
                    "detail": (
                        "Only checked-in reservations can be checked out."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

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
        # FINAL ACCOMMODATION QUANTITY
        # --------------------------------------------------------------

        if reservation.stay_type == "Overnight":
            actual_checkout_date = timezone.localdate()

            nights = (
                actual_checkout_date
                - reservation.check_in_date
            ).days

            # Same-day checkout = one night.
            nights = max(1, nights)

            accommodation_quantity = nights

        else:
            # Short Rest is always one package unit.
            actual_checkout_date = timezone.localdate()
            nights = None
            accommodation_quantity = 1

        # --------------------------------------------------------------
        # CALCULATE CURRENT BILL
        # --------------------------------------------------------------

        total_charges = sum(
            (
                (
                    accommodation_quantity
                    * reservation.room_rate
                    if charge.pk == accommodation_charge.pk
                    else charge.quantity * charge.unit_price
                )
                for charge in Charge.objects.filter(
                    reservation=reservation
                )
            ),
            0,
        )

        # --------------------------------------------------------------
        # TOTAL PAID
        # --------------------------------------------------------------

        total_paid = sum(
            (
                payment.amount
                for payment in reservation.payments.all()
            ),
            0,
        )

        balance = total_charges - total_paid

        # --------------------------------------------------------------
        # OUTSTANDING BALANCE
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
        # COMPLETE CHECKOUT
        # --------------------------------------------------------------

        with transaction.atomic():
            old_reservation_status = reservation.status
            old_check_out_date = reservation.check_out_date
            old_room_status = reservation.room.status

            old_charge_quantity = accommodation_charge.quantity
            old_charge_unit_price = accommodation_charge.unit_price

            new_charge_quantity = accommodation_quantity
            new_charge_unit_price = reservation.room_rate

            charge_changed = (
                old_charge_quantity != new_charge_quantity
                or old_charge_unit_price
                != new_charge_unit_price
            )

            # ----------------------------------------------------------
            # UPDATE ACCOMMODATION CHARGE
            # ----------------------------------------------------------

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

            # ----------------------------------------------------------
            # COMPLETE RESERVATION CHECKOUT
            # ----------------------------------------------------------

            reservation.status = "Checked Out"
            reservation.checked_out_at = timezone.now()

            # Only Overnight updates check_out_date.
            #
            # Short Rest keeps its original scheduled date/time.

            if reservation.stay_type == "Overnight":
                reservation.check_out_date = (
                    actual_checkout_date
                )

            reservation.save()

            # ----------------------------------------------------------
            # SEND ROOM TO CLEANING
            # ----------------------------------------------------------

            reservation.room.status = "Cleaning"

            reservation.room.save(
                update_fields=["status"]
            )

            # ----------------------------------------------------------
            # AUDIT: CHECKOUT
            # ----------------------------------------------------------

            checkout_changes = {
                "status": {
                    "from": old_reservation_status,
                    "to": reservation.status,
                },
                "checked_out_at": {
                    "from": None,
                    "to": (
                        reservation.checked_out_at.isoformat()
                        if reservation.checked_out_at
                        else None
                    ),
                },
            }

            if reservation.stay_type == "Overnight":
                checkout_changes["check_out_date"] = {
                    "from": (
                        old_check_out_date.isoformat()
                        if old_check_out_date
                        else None
                    ),
                    "to": actual_checkout_date.isoformat(),
                }

            checkout_details = {
                "room_id": reservation.room_id,
                "stay_type": reservation.stay_type,
                "total_charges": str(total_charges),
                "total_paid": str(total_paid),
                "balance": str(balance),
            }

            if reservation.stay_type == "Overnight":
                checkout_details["actual_nights"] = nights

            else:
                checkout_details["accommodation_units"] = 1

                checkout_details["short_rest_package_id"] = (
                    reservation.short_rest_package_id
                )

                checkout_details["short_rest_start"] = (
                    reservation.short_rest_start.isoformat()
                    if reservation.short_rest_start
                    else None
                )

                checkout_details["short_rest_end"] = (
                    reservation.short_rest_end.isoformat()
                    if reservation.short_rest_end
                    else None
                )

            AuditService.log(
                actor=request.user,
                lodge=lodge,
                action=AuditLog.Action.CHECK_OUT,
                obj=reservation,
                changes=checkout_changes,
                details=checkout_details,
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
    # UPDATE / PUT
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

    # ------------------------------------------------------------------
    # UPDATE / PATCH
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # SHARED UPDATE LOGIC
    # ------------------------------------------------------------------

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

                # Determine whether another active reservation
                # still needs this room.

                other_active_reservation = (
                    self._room_has_other_active_reservation(
                        reservation.room,
                        reservation.id,
                    )
                )

                room_released = False

                if (
                    reservation.room.status == "Reserved"
                    and not other_active_reservation
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

            # ----------------------------------------------------------
            # STAY TYPE CANNOT CHANGE
            # ----------------------------------------------------------

            if "stay_type" in request.data:
                new_stay_type = request.data.get(
                    "stay_type"
                )

                if new_stay_type != reservation.stay_type:
                    return Response(
                        {
                            "detail": (
                                "The stay type cannot be changed "
                                "after the guest has checked in."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # ----------------------------------------------------------
            # SHORT REST PACKAGE CANNOT CHANGE
            # ----------------------------------------------------------

            if "short_rest_package" in request.data:
                new_package_id = request.data.get(
                    "short_rest_package"
                )

                if (
                    str(new_package_id)
                    != str(reservation.short_rest_package_id)
                ):
                    return Response(
                        {
                            "detail": (
                                "The short-rest package cannot be changed "
                                "after the guest has checked in."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            if reservation.stay_type == "Short Rest":
                if "short_rest_start" in request.data:
                    return Response(
                        {
                            "detail": (
                                "The short-rest booking time cannot be "
                                "changed after the guest has checked in."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if "short_rest_end" in request.data:
                    return Response(
                        {
                            "detail": (
                                "The short-rest booking time cannot be "
                                "changed after the guest has checked in."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # ----------------------------------------------------------
            # ROOM CANNOT CHANGE
            # ----------------------------------------------------------

            if "room" in request.data:
                new_room_id = request.data.get(
                    "room"
                )

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

            # ----------------------------------------------------------
            # CHECK-IN DATE CANNOT CHANGE
            # ----------------------------------------------------------

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

                # ------------------------------------------------------
                # CAPTURE OLD STATE
                # ------------------------------------------------------

                old_values = self._reservation_values(
                    reservation
                )

                old_room = reservation.room
                old_room_status = old_room.status

                # ------------------------------------------------------
                # SERIALIZER VALIDATION
                # ------------------------------------------------------

                serializer = self.get_serializer(
                    reservation,
                    data=request.data,
                    partial=partial,
                )

                serializer.is_valid(
                    raise_exception=True
                )

                validated_data = serializer.validated_data

                # ------------------------------------------------------
                # DETERMINE NEW VALUES
                # ------------------------------------------------------

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

                new_stay_type = validated_data.get(
                    "stay_type",
                    reservation.stay_type,
                )

                new_short_rest_package = validated_data.get(
                    "short_rest_package",
                    reservation.short_rest_package,
                )

                room_changed = (
                    new_room.id != old_room.id
                )

                # ------------------------------------------------------
                # DETERMINE NEW ROOM RATE
                # ------------------------------------------------------

                if new_stay_type == "Short Rest":
                    if new_short_rest_package is None:
                        return Response(
                            {
                                "detail": (
                                    "A short-rest package is required."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    new_room_rate = (
                        new_short_rest_package.price
                    )

                else:
                    new_room_rate = (
                        new_room.price_per_night
                    )

                # ------------------------------------------------------
                # ROOM CHANGE VALIDATION
                # ------------------------------------------------------

                new_room_old_status = None

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

                    new_room_old_status = new_room.status

                # ------------------------------------------------------
                # VALIDATE ACTIVE-STAY BILLING
                # ------------------------------------------------------

                nights = None
                accommodation_quantity = None

                if reservation.status == "Checked In":

                    # IMPORTANT:
                    #
                    # Use the existing reservation.stay_type here.
                    #
                    # Checked-in stay type changes have already been
                    # explicitly blocked above.

                    if reservation.stay_type == "Overnight":
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

                        accommodation_quantity = nights

                    else:
                        accommodation_quantity = 1

                # ------------------------------------------------------
                # SAVE RESERVATION
                # ------------------------------------------------------

                reservation = serializer.save(
                    room_rate=new_room_rate
                )

                # ------------------------------------------------------
                # ROOM STATUS WHEN RESERVED ROOM CHANGES
                # ------------------------------------------------------

                if (
                    reservation.status == "Reserved"
                    and room_changed
                ):
                    # Before releasing the old room, check whether
                    # another active reservation still needs it.

                    old_room_has_other_active_reservation = (
                        self._room_has_other_active_reservation(
                            old_room,
                            reservation.id,
                        )
                    )

                    if not old_room_has_other_active_reservation:
                        old_room.status = "Available"

                        old_room.save(
                            update_fields=["status"]
                        )

                    new_room.status = "Reserved"

                    new_room.save(
                        update_fields=["status"]
                    )

                # ------------------------------------------------------
                # UPDATE ACCOMMODATION CHARGE
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

                        new_charge_quantity = (
                            accommodation_quantity
                        )

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
                    old_room_new_status = old_room.status

                    if old_room_status != old_room_new_status:
                        AuditService.log(
                            actor=request.user,
                            lodge=lodge,
                            action=AuditLog.Action.UPDATE,
                            obj=old_room,
                            changes={
                                "status": {
                                    "from": old_room_status,
                                    "to": old_room_new_status,
                                }
                            },
                            details={
                                "reason": "Reservation room changed",
                                "reservation_id": reservation.id,
                                "direction": "released",
                            },
                        )

                    if new_room_old_status != new_room.status:
                        AuditService.log(
                            actor=request.user,
                            lodge=lodge,
                            action=AuditLog.Action.UPDATE,
                            obj=new_room,
                            changes={
                                "status": {
                                    "from": new_room_old_status,
                                    "to": new_room.status,
                                }
                            },
                            details={
                                "reason": "Reservation room changed",
                                "reservation_id": reservation.id,
                                "direction": "reserved",
                            },
                        )

                # ------------------------------------------------------
                # AUDIT: ACCOMMODATION CHARGE
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

        except Exception:
            logger.exception("Reservation update error")

            return Response(
                {
                    "detail": "Unable to update reservation."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------

    def destroy(self, request, *args, **kwargs):
        """
        Reservations should not be physically deleted through the
        normal API.

        Use cancellation instead so that reservation, billing,
        payment, and operational history remain intact.
        """

        return Response(
            {
                "detail": (
                    "Reservations cannot be deleted. "
                    "Cancel the reservation instead."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

class ShortRestPackageListView(
    generics.ListCreateAPIView
):
    serializer_class = ShortRestPackageSerializer
    permission_classes = [
        IsAuthenticated,
        IsServiceItemManagerOrOwner,
    ]

    def get_queryset(self):
        lodge = get_current_lodge(
            self.request.user
        )

        queryset = (
            ShortRestPackage.objects
            .filter(lodge=lodge)
            .order_by("duration_hours")
        )

        active = self.request.query_params.get(
            "active"
        )

        if active is not None:
            queryset = queryset.filter(
                active=active.lower() == "true"
            )

        return queryset

    def perform_create(self, serializer):
        lodge = get_current_lodge(
            self.request.user
        )

        with transaction.atomic():
            package = serializer.save(
                lodge=lodge
            )

            AuditService.log(
                actor=self.request.user,
                lodge=lodge,
                action=AuditLog.Action.CREATE,
                obj=package,
                changes={
                    "name": {
                        "from": None,
                        "to": package.name,
                    },
                    "duration_hours": {
                        "from": None,
                        "to": package.duration_hours,
                    },
                    "price": {
                        "from": None,
                        "to": str(package.price),
                    },
                    "active": {
                        "from": None,
                        "to": package.active,
                    },
                },
            )


class ShortRestPackageDetailView(
    generics.RetrieveUpdateAPIView
):
    serializer_class = ShortRestPackageSerializer
    permission_classes = [
        IsAuthenticated,
        IsServiceItemManagerOrOwner,
    ]

    def get_queryset(self):
        lodge = get_current_lodge(
            self.request.user
        )

        return ShortRestPackage.objects.filter(
            lodge=lodge
        )

    def perform_update(self, serializer):
        package = self.get_object()
        lodge = package.lodge

        old_values = {
            "name": package.name,
            "duration_hours": package.duration_hours,
            "price": str(package.price),
            "active": package.active,
        }

        with transaction.atomic():
            package = serializer.save()

            new_values = {
                "name": package.name,
                "duration_hours": package.duration_hours,
                "price": str(package.price),
                "active": package.active,
            }

            changes = {}

            for field, old_value in old_values.items():
                new_value = new_values[field]

                if old_value != new_value:
                    changes[field] = {
                        "from": old_value,
                        "to": new_value,
                    }

            if changes:
                AuditService.log(
                    actor=self.request.user,
                    lodge=lodge,
                    action=AuditLog.Action.UPDATE,
                    obj=package,
                    changes=changes,
                )
