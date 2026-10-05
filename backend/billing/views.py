from django.utils import timezone
from decimal import Decimal
from datetime import datetime

from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.utils.dateparse import parse_date

from django.db import transaction

from audit.models import AuditLog
from audit.services import AuditService

from reservations.models import Reservation

from tenants.permissions import (
    IsServiceItemManagerOrOwner,
    IsExpenseCategoryManagerOrOwner,
    IsExpenseManagerOrOwner,
    IsStaffManagerOrOwner,
    IsSalaryPaymentManagerOrOwner,
    IsFrontDeskFinanceUser,
)

from .models import (
    ServiceItem,
    Charge,
    Payment,
    WalkInOrder,
    WalkInOrderItem,
    WalkInPayment,
    ExpenseCategory,
    Expense,
    Staff,
    SalaryPayment,
)

from .serializers import (
    ServiceItemSerializer,
    ChargeSerializer,
    PaymentSerializer,
    WalkInOrderSerializer,
    WalkInOrderItemSerializer,
    WalkInPaymentSerializer,
    ExpenseCategorySerializer,
    ExpenseSerializer,
    StaffSerializer,
    SalaryPaymentSerializer,
)


class ServiceItemListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceItemSerializer
    permission_classes = [IsServiceItemManagerOrOwner]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return ServiceItem.objects.none()

        queryset = ServiceItem.objects.filter(
            lodge=membership.lodge
        ).order_by("name")

        active = self.request.query_params.get("active")

        if active is not None:
            queryset = queryset.filter(
                active=active.lower() == "true"
            )

        return queryset


class ServiceItemDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ServiceItemSerializer
    permission_classes = [IsServiceItemManagerOrOwner]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return ServiceItem.objects.none()

        return ServiceItem.objects.filter(
            lodge=membership.lodge
        )


class ChargeListCreateView(generics.ListCreateAPIView):
    serializer_class = ChargeSerializer

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )
        if not membership:
            return Charge.objects.none()

        queryset = Charge.objects.filter(
            reservation__lodge=membership.lodge
        ).order_by("-created_at")

        reservation_id = self.request.query_params.get(
            "reservation"
        )
        if reservation_id:
            queryset = queryset.filter(
                reservation_id=reservation_id
            )

        return queryset

    def perform_create(self, serializer):
        with transaction.atomic():
            charge = serializer.save()

            AuditService.log(
                actor=self.request.user,
                lodge=charge.reservation.lodge,
                action=AuditLog.Action.CREATE,
                obj=charge,
                changes={
                    "reservation_id": {
                        "from": None,
                        "to": charge.reservation_id,
                    },
                    "service_item_id": {
                        "from": None,
                        "to": charge.service_item_id,
                    },
                    "category": {
                        "from": None,
                        "to": charge.category,
                    },
                    "description": {
                        "from": None,
                        "to": charge.description,
                    },
                    "quantity": {
                        "from": None,
                        "to": str(charge.quantity),
                    },
                    "unit_price": {
                        "from": None,
                        "to": str(charge.unit_price),
                    },
                },
                details={
                    "total": str(charge.total),
                },
            )


class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return Payment.objects.none()

        queryset = Payment.objects.filter(
            reservation__lodge=membership.lodge
        ).order_by("-created_at")

        reservation_id = self.request.query_params.get(
            "reservation"
        )

        if reservation_id:
            queryset = queryset.filter(
                reservation_id=reservation_id
            )

        return queryset

    def perform_create(self, serializer):
        with transaction.atomic():
            payment = serializer.save(
                recorded_by=self.request.user
            )

            AuditService.log(
                actor=self.request.user,
                lodge=payment.reservation.lodge,
                action=AuditLog.Action.CREATE,
                obj=payment,
                changes={
                    "amount": {
                        "from": None,
                        "to": str(payment.amount),
                    },
                    "payment_method": {
                        "from": None,
                        "to": payment.payment_method,
                    },
                    "reference": {
                        "from": None,
                        "to": payment.reference,
                    },
                },
                details={
                    "reservation_id": payment.reservation_id,
                },
            )


class WalkInOrderListCreateView(generics.ListCreateAPIView):
    """
    Create and list walk-in Food/Drinks orders.

    Walk-in orders do not require a reservation or room.
    They are strictly scoped to the current lodge.
    """

    serializer_class = WalkInOrderSerializer
    permission_classes = [IsFrontDeskFinanceUser]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return WalkInOrder.objects.none()

        queryset = (
            WalkInOrder.objects.filter(
                lodge=membership.lodge
            )
            .order_by("-created_at")
        )

        # ---------------------------------------------------------
        # DATE FILTER
        # ---------------------------------------------------------
        #
        # Default:
        #   today's orders only
        #
        # Supported:
        #   ?date=today
        #   ?date=all
        #   ?date=2026-09-30
        #
        date_param = self.request.query_params.get("date")

        if not date_param:
            date_param = "today"

        date_param = date_param.strip().lower()

        if date_param == "today":
            queryset = queryset.filter(
                created_at__date=timezone.localdate()
            )

        elif date_param == "all":
            pass

        else:
            selected_date = parse_date(date_param)

            if selected_date:
                queryset = queryset.filter(
                    created_at__date=selected_date
                )
            else:
                queryset = queryset.none()

        # ---------------------------------------------------------
        # STATUS FILTER
        # ---------------------------------------------------------
        #
        # Supported:
        #   ?status=Open
        #   ?status=Paid
        #   ?status=Cancelled
        #
        status_param = self.request.query_params.get("status")

        if status_param:
            status_param = status_param.strip()

            if status_param.lower() != "all":
                queryset = queryset.filter(
                    status=status_param
                )

        # ---------------------------------------------------------
        # SEARCH FILTER
        # ---------------------------------------------------------
        #
        # Searches:
        #   customer name
        #   order number
        #
        # Examples:
        #   ?search=Maek
        #   ?search=3
        #   ?search=#3
        #
        search = self.request.query_params.get("search")

        if search:
            search = search.strip()

            search_query = Q(
                customer_name__icontains=search
            )

            normalized_order_search = (
                search.lstrip("#").strip()
            )

            if normalized_order_search.isdigit():
                search_query |= Q(
                    id=int(normalized_order_search)
                )

            queryset = queryset.filter(search_query)

        # ---------------------------------------------------------
        # EXACT ORDER ID FILTER
        # ---------------------------------------------------------
        #
        # Example:
        #   ?order_id=3
        #
        order_id = self.request.query_params.get("order_id")

        if order_id:
            try:
                queryset = queryset.filter(
                    id=int(order_id)
                )
            except (TypeError, ValueError):
                queryset = queryset.none()

        return queryset

    def perform_create(self, serializer):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            raise PermissionDenied(
                "No active lodge membership found."
            )

        with transaction.atomic():
            order = serializer.save()

            AuditService.log(
                actor=self.request.user,
                lodge=order.lodge,
                action=AuditLog.Action.CREATE,
                obj=order,
                changes={
                    "customer_name": {
                        "from": None,
                        "to": order.customer_name,
                    },
                    "status": {
                        "from": None,
                        "to": order.status,
                    },
                },
                details={
                    "walk_in_order_id": order.id,
                },
            )


class WalkInOrderDetailView(
    generics.RetrieveUpdateAPIView
):
    """
    View or update a walk-in order.

    Items and payments are handled through their
    dedicated endpoints.
    """

    serializer_class = WalkInOrderSerializer
    permission_classes = [IsFrontDeskFinanceUser]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return WalkInOrder.objects.none()

        return (
            WalkInOrder.objects.filter(
                lodge=membership.lodge
            )
            .prefetch_related(
                "items__service_item",
                "payments",
            )
            .select_related("created_by")
        )

    def perform_update(self, serializer):
        order = self.get_object()

        if order.status == "Cancelled":
            raise PermissionDenied(
                "Cancelled walk-in orders cannot be edited."
            )

        if order.status == "Paid":
            raise PermissionDenied(
                "Paid walk-in orders cannot be edited."
            )



        old_values = {
            "customer_name": order.customer_name,
            "notes": order.notes,
        }

        with transaction.atomic():
            order = serializer.save()

            changes = {}

            if (
                old_values["customer_name"]
                != order.customer_name
            ):
                changes["customer_name"] = {
                    "from": old_values["customer_name"],
                    "to": order.customer_name,
                }

            if old_values["notes"] != order.notes:
                changes["notes"] = {
                    "from": old_values["notes"],
                    "to": order.notes,
                }

            if changes:
                AuditService.log(
                    actor=self.request.user,
                    lodge=order.lodge,
                    action=AuditLog.Action.UPDATE,
                    obj=order,
                    changes=changes,
                    details={
                        "walk_in_order_id": order.id,
                    },
                )


class WalkInOrderItemListCreateView(
    generics.ListCreateAPIView
):
    """
    List or add Food/Drinks items to a walk-in order.
    """

    serializer_class = WalkInOrderItemSerializer
    permission_classes = [IsFrontDeskFinanceUser]

    def get_order(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            raise PermissionDenied(
                "No active lodge membership found."
            )

        return get_object_or_404(
            WalkInOrder,
            id=self.kwargs["order_id"],
            lodge=membership.lodge,
        )

    def get_queryset(self):
        order = self.get_order()

        return (
            WalkInOrderItem.objects.filter(
                order=order
            )
            .select_related("service_item")
            .order_by("id")
        )

    def perform_create(self, serializer):
        order = self.get_order()

        if order.status == "Cancelled":
            raise PermissionDenied(
                "Items cannot be added to a cancelled order."
            )

        if order.status == "Paid":
            raise PermissionDenied(
                "Items cannot be added to a paid order."
            )

        with transaction.atomic():
            item = serializer.save(order=order)

            AuditService.log(
                actor=self.request.user,
                lodge=order.lodge,
                action=AuditLog.Action.CREATE,
                obj=item,
                changes={
                    "order_id": {
                        "from": None,
                        "to": order.id,
                    },
                    "service_item_id": {
                        "from": None,
                        "to": item.service_item_id,
                    },
                    "quantity": {
                        "from": None,
                        "to": item.quantity,
                    },
                    "unit_price": {
                        "from": None,
                        "to": str(item.unit_price),
                    },
                },
                details={
                    "total": str(item.total),
                    "walk_in_order_id": order.id,
                },
            )


class WalkInOrderItemDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    """
    View, update, or remove an item from a walk-in order.
    """

    serializer_class = WalkInOrderItemSerializer
    permission_classes = [IsFrontDeskFinanceUser]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return WalkInOrderItem.objects.none()

        return (
            WalkInOrderItem.objects.filter(
                order__lodge=membership.lodge
            )
            .select_related(
                "order",
                "service_item",
            )
        )

    def perform_update(self, serializer):
        item = self.get_object()

        if item.order.status == "Cancelled":
            raise PermissionDenied(
                "Items cannot be edited on a cancelled order."
            )

        if item.order.status == "Paid":
            raise PermissionDenied(
                "Items cannot be edited on a paid order."
            )

        if item.order.payments.exists():
            raise PermissionDenied(
                "Items cannot be edited after a payment has been recorded."
            )

        old_values = {
            "service_item_id": item.service_item_id,
            "quantity": item.quantity,
            "unit_price": str(item.unit_price),
        }

        with transaction.atomic():
            item = serializer.save()

            changes = {}

            if (
                old_values["service_item_id"]
                != item.service_item_id
            ):
                changes["service_item_id"] = {
                    "from": old_values["service_item_id"],
                    "to": item.service_item_id,
                }

            if old_values["quantity"] != item.quantity:
                changes["quantity"] = {
                    "from": old_values["quantity"],
                    "to": item.quantity,
                }

            if old_values["unit_price"] != str(
                item.unit_price
            ):
                changes["unit_price"] = {
                    "from": old_values["unit_price"],
                    "to": str(item.unit_price),
                }

            if changes:
                AuditService.log(
                    actor=self.request.user,
                    lodge=item.order.lodge,
                    action=AuditLog.Action.UPDATE,
                    obj=item,
                    changes=changes,
                    details={
                        "total": str(item.total),
                        "walk_in_order_id": item.order_id,
                    },
                )

    def perform_destroy(self, instance):
        item = instance

        if item.order.status == "Cancelled":
            raise PermissionDenied(
                "Items cannot be removed from a cancelled order."
            )

        if item.order.status == "Paid":
            raise PermissionDenied(
                "Items cannot be removed from a paid order."
            )


        if item.order.payments.exists():
            raise PermissionDenied(
                "Items cannot be removed after a payment has been recorded."
            )

        with transaction.atomic():
            AuditService.log(
                actor=self.request.user,
                lodge=item.order.lodge,
                action=AuditLog.Action.DELETE,
                obj=item,
                changes={
                    "service_item_id": item.service_item_id,
                    "quantity": item.quantity,
                    "unit_price": str(item.unit_price),
                },
                details={
                    "total": str(item.total),
                    "walk_in_order_id": item.order_id,
                },
            )

            item.delete()


class WalkInPaymentListCreateView(
    generics.ListCreateAPIView
):
    """
    List and record payments for walk-in F&B orders.
    """

    serializer_class = WalkInPaymentSerializer
    permission_classes = [IsFrontDeskFinanceUser]

    def get_order(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            raise PermissionDenied(
                "No active lodge membership found."
            )

        order_id = self.request.query_params.get("order")

        if not order_id:
            raise PermissionDenied(
                "An order ID is required."
            )

        return get_object_or_404(
            WalkInOrder,
            id=order_id,
            lodge=membership.lodge,
        )

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return WalkInPayment.objects.none()

        queryset = (
            WalkInPayment.objects.filter(
                order__lodge=membership.lodge
            )
            .select_related(
                "order",
                "recorded_by",
            )
            .order_by("-created_at")
        )

        order_id = self.request.query_params.get(
            "order"
        )

        if order_id:
            queryset = queryset.filter(
                order_id=order_id
            )

        return queryset

    def create(self, request, *args, **kwargs):
        """
        Resolve the walk-in order before serializer validation.
        The serializer needs the order to validate lodge,
        status, balance, and payment amount.
        """

        order = self.get_order()

        data = request.data.copy()
        data["order"] = order.id

        serializer = self.get_serializer(
            data=data
        )

        serializer.is_valid(
            raise_exception=True
        )

        self.perform_create(serializer)

        headers = self.get_success_headers(
            serializer.data
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_create(self, serializer):
        order = self.get_order()

        if order.status == "Cancelled":
            raise PermissionDenied(
                "Payments cannot be added to a cancelled order."
            )

        if order.status == "Paid":
            raise PermissionDenied(
                "This walk-in order has already been fully paid."
            )

        with transaction.atomic():
            order = (
                WalkInOrder.objects.select_for_update()
                .get(id=order.id)
            )

            payment = serializer.save(
                order=order,
                recorded_by=self.request.user,
            )

            total_paid = (
                WalkInPayment.objects.filter(
                    order=order
                )
                .aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )

            total = sum(
                item.total
                for item in order.items.all()
            )

            if total_paid == total:
                order.status = "Paid"
                order.save(
                    update_fields=[
                        "status",
                        "updated_at",
                    ]
                )

            AuditService.log(
                actor=self.request.user,
                lodge=order.lodge,
                action=AuditLog.Action.CREATE,
                obj=payment,
                changes={
                    "amount": {
                        "from": None,
                        "to": str(payment.amount),
                    },
                    "payment_method": {
                        "from": None,
                        "to": payment.payment_method,
                    },
                },
                details={
                    "walk_in_order_id": order.id,
                    "order_total": str(total),
                    "total_paid": str(total_paid),
                    "order_status": order.status,
                },
            )

class FrontDeskFinanceView(generics.GenericAPIView):
    """
    Returns operational payment information for the front desk.

    Includes:
    - Guest payments
    - Walk-in Food & Drinks orders

    Accessible by:
    - Owner
    - Manager
    - Receptionist

    Supports:
    - Search
    - Date filters
    - Payment method filter
    - Pagination
    """

    permission_classes = [IsFrontDeskFinanceUser]

    def get(self, request):
        membership = (
            request.user.memberships.filter(active=True)
            .select_related("lodge")
            .first()
        )

        if not membership:
            return Response(
                {"detail": "No active lodge membership found."},
                status=403,
            )

        lodge = membership.lodge
        today = timezone.localdate()

        # --------------------------------
        # Date filter
        # --------------------------------
        date_filter = request.query_params.get(
            "date",
            "today",
        )

        summary_start_date = today
        summary_end_date = today

        if date_filter == "yesterday":
            yesterday = today - timezone.timedelta(days=1)
            summary_start_date = yesterday
            summary_end_date = yesterday

        elif date_filter == "this_week":
            summary_start_date = (
                today
                - timezone.timedelta(days=today.weekday())
            )
            summary_end_date = today

        elif date_filter == "this_month":
            summary_start_date = today.replace(day=1)
            summary_end_date = today

        elif date_filter == "custom":
            start_date = request.query_params.get("start_date")
            end_date = request.query_params.get("end_date")

            if start_date:
                summary_start_date = start_date

            if end_date:
                summary_end_date = end_date

        # --------------------------------
        # Reservation payment summary
        # --------------------------------
        summary_reservation_payments = Payment.objects.filter(
            reservation__lodge=lodge,
            created_at__date__gte=summary_start_date,
            created_at__date__lte=summary_end_date,
        )

        # --------------------------------
        # Walk-in Food & Drinks payment summary
        # --------------------------------
        summary_walk_in_payments = WalkInPayment.objects.filter(
            order__lodge=lodge,
            created_at__date__gte=summary_start_date,
            created_at__date__lte=summary_end_date,
        )

        # --------------------------------
        # Selected-period summary
        # --------------------------------
        guest_payments_total = (
            summary_reservation_payments.aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        walk_in_food_drinks_total = (
            summary_walk_in_payments.aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        selected_total = (
            guest_payments_total
            + walk_in_food_drinks_total
        )

        guest_payment_count = (
            summary_reservation_payments.count()
        )

        walk_in_food_drinks_payment_count = (
            summary_walk_in_payments.count()
        )

        selected_payment_count = (
            guest_payment_count
            + walk_in_food_drinks_payment_count
        )

        # --------------------------------
        # Payment method totals
        # --------------------------------

        # Cash
        cash_guest = (
            summary_reservation_payments.filter(
                payment_method="Cash"
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        cash_walk_in = (
            summary_walk_in_payments.filter(
                payment_method="Cash"
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        cash_total = cash_guest + cash_walk_in

        # Transfer
        transfer_guest = (
            summary_reservation_payments.filter(
                payment_method="Transfer"
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        transfer_walk_in = (
            summary_walk_in_payments.filter(
                payment_method="Transfer"
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        transfer_total = (
            transfer_guest + transfer_walk_in
        )

        # POS
        pos_guest = (
            summary_reservation_payments.filter(
                payment_method="POS"
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        pos_walk_in = (
            summary_walk_in_payments.filter(
                payment_method="POS"
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        pos_total = pos_guest + pos_walk_in

        # Other
        other_guest = (
            summary_reservation_payments.filter(
                payment_method="Other"
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        other_walk_in = (
            summary_walk_in_payments.filter(
                payment_method="Other"
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        other_total = other_guest + other_walk_in

        # --------------------------------
        # All reservation payments
        # --------------------------------
        reservation_payments = (
            Payment.objects.filter(
                reservation__lodge=lodge,
            )
            .select_related(
                "reservation",
                "reservation__guest",
                "reservation__room",
                "recorded_by",
            )
        )

        # --------------------------------
        # All walk-in Food & Drinks payments
        # --------------------------------
        walk_in_payments = (
            WalkInPayment.objects.filter(
                order__lodge=lodge,
            )
            .select_related(
                "order",
                "recorded_by",
            )
        )

        # --------------------------------
        # Search
        # --------------------------------
        search = request.query_params.get(
            "search",
            "",
        ).strip()

        if search:
            reservation_payments = (
                reservation_payments.filter(
                    Q(
                        reservation__guest__full_name__icontains=search
                    )
                    | Q(
                        reservation__room__room_name__icontains=search
                    )
                    | Q(
                        reference__icontains=search
                    )
                )
            )

            walk_in_payments = (
                walk_in_payments.filter(
                    Q(
                        order__customer_name__icontains=search
                    )
                    | Q(
                        reference__icontains=search
                    )
                )
            )

        # --------------------------------
        # Payment method filter
        # --------------------------------
        payment_method = request.query_params.get(
            "payment_method"
        )

        if payment_method in [
            "Cash",
            "Transfer",
            "POS",
            "Other",
        ]:
            reservation_payments = (
                reservation_payments.filter(
                    payment_method=payment_method
                )
            )

            walk_in_payments = (
                walk_in_payments.filter(
                    payment_method=payment_method
                )
            )

        # --------------------------------
        # Apply date filter to transactions
        # --------------------------------
        reservation_payments = (
            reservation_payments.filter(
                created_at__date__gte=summary_start_date,
                created_at__date__lte=summary_end_date,
            )
        )

        walk_in_payments = (
            walk_in_payments.filter(
                created_at__date__gte=summary_start_date,
                created_at__date__lte=summary_end_date,
            )
        )

        # --------------------------------
        # Build Guest Payments
        # --------------------------------
        guest_payment_data = []

        for payment in reservation_payments:
            guest_payment_data.append(
                {
                    "id": payment.id,
                    "reservation_id": payment.reservation_id,
                    "guest_name": (
                        payment.reservation.guest.full_name
                        if payment.reservation.guest
                        else ""
                    ),
                    "room_name": (
                        payment.reservation.room.room_name
                        if payment.reservation.room
                        else ""
                    ),
                    "amount": payment.amount,
                    "payment_method": payment.payment_method,
                    "reference": payment.reference,
                    "notes": payment.notes,
                    "recorded_by": (
                        payment.recorded_by.username
                        if payment.recorded_by
                        else ""
                    ),
                    "created_at": payment.created_at,
                }
            )

        # --------------------------------
        # Prepare filtered walk-in payments
        # --------------------------------
        filtered_walk_in_payments = list(
            walk_in_payments.select_related(
                "order",
                "recorded_by",
            )
        )

        # --------------------------------
        # Get affected walk-in orders
        # --------------------------------
        walk_in_order_ids = {
            payment.order_id
            for payment in filtered_walk_in_payments
        }

        walk_in_orders = (
            WalkInOrder.objects.filter(
                lodge=lodge,
                id__in=walk_in_order_ids,
            )
            .prefetch_related(
                "items",
                "payments",
            )
        )

        # --------------------------------
        # Group selected-period payments
        # by walk-in order
        # --------------------------------
        period_payments_by_order = {}

        for payment in filtered_walk_in_payments:
            period_payments_by_order.setdefault(
                payment.order_id,
                [],
            ).append(payment)

        # --------------------------------
        # Build Walk-in Food & Drinks orders
        # --------------------------------
        walk_in_food_drinks_data = []

        for order in walk_in_orders:
            all_order_payments = list(
                order.payments.all()
            )

            order_items = list(
                order.items.all()
            )

            order_total = sum(
                (
                    item.total
                    for item in order_items
                ),
                Decimal("0.00"),
            )

            total_paid = sum(
                (
                    payment.amount
                    for payment in all_order_payments
                ),
                Decimal("0.00"),
            )

            balance = (
                order_total - total_paid
            )

            period_payments = (
                period_payments_by_order.get(
                    order.id,
                    [],
                )
            )

            period_collected = sum(
                (
                    payment.amount
                    for payment in period_payments
                ),
                Decimal("0.00"),
            )

            last_payment_at = None

            if all_order_payments:
                last_payment_at = max(
                    payment.created_at
                    for payment in all_order_payments
                )

            walk_in_food_drinks_data.append(
                {
                    "id": order.id,
                    "order_id": order.id,
                    "customer_name": (
                        order.customer_name
                    ),
                    "order_total": order_total,
                    "period_collected": (
                        period_collected
                    ),
                    "total_paid": total_paid,
                    "balance": balance,
                    "status": order.status,
                    "payment_count": len(
                        all_order_payments
                    ),
                    "period_payment_count": len(
                        period_payments
                    ),
                    "last_payment_at": (
                        last_payment_at
                    ),
                    "created_at": order.created_at,
                }
            )

        # --------------------------------
        # Newest first
        # --------------------------------
        guest_payment_data.sort(
            key=lambda item: item["created_at"],
            reverse=True,
        )

        walk_in_food_drinks_data.sort(
            key=lambda item: (
                item["last_payment_at"]
                or item["created_at"]
            ),
            reverse=True,
        )

        # --------------------------------
        # Pagination settings
        # --------------------------------
        try:
            page_size = int(
                request.query_params.get(
                    "page_size",
                    20,
                )
            )
        except (TypeError, ValueError):
            page_size = 20

        page_size = min(
            max(page_size, 1),
            100,
        )

        # --------------------------------
        # Pagination helper
        # --------------------------------
        def paginate_items(items, page_param):
            try:
                requested_page = int(
                    request.query_params.get(
                        page_param,
                        1,
                    )
                )
            except (TypeError, ValueError):
                requested_page = 1

            requested_page = max(
                requested_page,
                1,
            )

            start_index = (
                requested_page - 1
            ) * page_size

            end_index = (
                start_index + page_size
            )

            total_items = len(items)

            return {
                "items": items[
                    start_index:end_index
                ],
                "pagination": {
                    "page": requested_page,
                    "page_size": page_size,
                    "total_count": total_items,
                    "has_next": (
                        end_index < total_items
                    ),
                    "has_previous": (
                        requested_page > 1
                    ),
                },
            }

        # --------------------------------
        # Semantic section pagination
        # --------------------------------
        guest_page_data = paginate_items(
            guest_payment_data,
            "guest_page",
        )

        walk_in_food_drinks_page_data = paginate_items(
            walk_in_food_drinks_data,
            "walk_in_page",
        )

        # --------------------------------
        # Walk-in order count
        # --------------------------------
        walk_in_food_drinks_order_count = len(
            walk_in_food_drinks_data
        )

        # --------------------------------
        # Legacy combined transaction list
        # Kept for compatibility
        # --------------------------------
        legacy_transaction_data = []

        for payment in reservation_payments:
            legacy_transaction_data.append(
                {
                    "id": payment.id,
                    "type": "reservation",
                    "reservation": payment.reservation_id,
                    "walk_in_order": None,
                    "guest_name": (
                        payment.reservation.guest.full_name
                        if payment.reservation.guest
                        else ""
                    ),
                    "room_name": (
                        payment.reservation.room.room_name
                        if payment.reservation.room
                        else ""
                    ),
                    "customer_name": "",
                    "amount": payment.amount,
                    "payment_method": payment.payment_method,
                    "reference": payment.reference,
                    "notes": payment.notes,
                    "recorded_by": (
                        payment.recorded_by.username
                        if payment.recorded_by
                        else ""
                    ),
                    "created_at": payment.created_at,
                }
            )

        for payment in filtered_walk_in_payments:
            legacy_transaction_data.append(
                {
                    "id": payment.id,
                    "type": "walk_in",
                    "reservation": None,
                    "walk_in_order": payment.order_id,
                    "guest_name": "",
                    "room_name": "",
                    "customer_name": (
                        payment.order.customer_name
                    ),
                    "amount": payment.amount,
                    "payment_method": payment.payment_method,
                    "reference": payment.reference,
                    "notes": payment.notes,
                    "recorded_by": (
                        payment.recorded_by.username
                        if payment.recorded_by
                        else ""
                    ),
                    "created_at": payment.created_at,
                }
            )

        legacy_transaction_data.sort(
            key=lambda item: item["created_at"],
            reverse=True,
        )

        # --------------------------------
        # Legacy combined pagination
        # --------------------------------
        try:
            page = int(
                request.query_params.get(
                    "page",
                    1,
                )
            )
        except (TypeError, ValueError):
            page = 1

        page = max(page, 1)

        total_count = len(
            legacy_transaction_data
        )

        start_index = (
            page - 1
        ) * page_size

        end_index = (
            start_index + page_size
        )

        paginated_transactions = (
            legacy_transaction_data[
                start_index:end_index
            ]
        )

        has_next = (
            end_index < total_count
        )

        has_previous = page > 1

        # --------------------------------
        # Response
        # --------------------------------
        return Response(
            {
                "date": today,

                "period": {
                    "filter": date_filter,
                    "start_date": summary_start_date,
                    "end_date": summary_end_date,
                },

                # Combined totals
                "selected_total": selected_total,
                "cash_total": cash_total,
                "transfer_total": transfer_total,
                "pos_total": pos_total,
                "other_total": other_total,
                "selected_payment_count": (
                    selected_payment_count
                ),

                # Guest payment totals
                "guest_payments_total": (
                    guest_payments_total
                ),
                "guest_payment_count": (
                    guest_payment_count
                ),

                # Walk-in Food & Drinks totals
                "walk_in_food_drinks_total": (
                    walk_in_food_drinks_total
                ),
                "walk_in_food_drinks_payment_count": (
                    walk_in_food_drinks_payment_count
                ),
                "walk_in_food_drinks_order_count": (
                    walk_in_food_drinks_order_count
                ),

                # Guest Payments
                "guest_payments": (
                    guest_page_data["items"]
                ),
                "guest_pagination": (
                    guest_page_data["pagination"]
                ),

                # Walk-in Food & Drinks Orders
                "walk_in_food_drinks": (
                    walk_in_food_drinks_page_data["items"]
                ),
                "walk_in_food_drinks_pagination": (
                    walk_in_food_drinks_page_data[
                        "pagination"
                    ]
                ),

                # Existing combined response
                # retained temporarily for compatibility
                "payments": paginated_transactions,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_count": total_count,
                    "has_next": has_next,
                    "has_previous": has_previous,
                },
            }
        )




class BillingSummaryView(generics.GenericAPIView):
    def get(self, request, reservation_id):
        membership = (
            request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return Response(
                {"detail": "No active lodge membership found."},
                status=403,
            )

        reservation = get_object_or_404(
            Reservation,
            id=reservation_id,
            lodge=membership.lodge,
        )

        charges = reservation.charges.all()

        current_accommodation_nights = None

        total_charges = Decimal("0.00")

        for charge in charges:
            quantity = charge.quantity
            unit_price = charge.unit_price

            if (
                reservation.status == "Checked In"
                and reservation.stay_type == "Overnight"
                and charge.category == "Accommodation"
                and reservation.checked_in_at
            ):
                actual_checkout_date = timezone.localdate()

                nights = (
                    actual_checkout_date
                    - reservation.checked_in_at.date()
                ).days

                nights = max(1, nights)

                current_accommodation_nights = nights

                quantity = nights
                unit_price = reservation.room_rate

            total_charges += quantity * unit_price

        total_payments = (
            reservation.payments.aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        balance = total_charges - total_payments

        if total_payments == Decimal("0.00"):
            payment_status = "No Payment"
        elif balance > Decimal("0.00"):
            payment_status = "Partially Paid"
        elif balance == Decimal("0.00"):
            payment_status = "Paid"
        else:
            payment_status = "Overpaid"

        return Response(
            {
                "reservation": reservation.id,
                "total_charges": total_charges,
                "current_accommodation_nights": current_accommodation_nights,
                "total_payments": total_payments,
                "balance": balance,
                "payment_status": payment_status,
            }
        )


class ExpenseCategoryListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsExpenseCategoryManagerOrOwner]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return ExpenseCategory.objects.none()

        queryset = ExpenseCategory.objects.filter(
            lodge=membership.lodge
        ).order_by("name")

        active = self.request.query_params.get("active")

        if active is not None:
            queryset = queryset.filter(
                active=active.lower() == "true"
            )

        return queryset


class ExpenseCategoryDetailView(
    generics.RetrieveUpdateAPIView
):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsExpenseCategoryManagerOrOwner]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return ExpenseCategory.objects.none()

        return ExpenseCategory.objects.filter(
            lodge=membership.lodge
        )


class ExpenseListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = ExpenseSerializer
    permission_classes = [IsExpenseManagerOrOwner]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return Expense.objects.none()

        queryset = (
            Expense.objects.select_related("category")
            .filter(lodge=membership.lodge)
            .order_by("-date", "-created_at")
        )

        category_id = self.request.query_params.get(
            "category"
        )

        if category_id:
            queryset = queryset.filter(
                category_id=category_id
            )

        return queryset

    def perform_create(self, serializer):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            raise PermissionDenied(
                "No active lodge membership found."
            )

        with transaction.atomic():
            expense = serializer.save(
                lodge=membership.lodge
            )

            AuditService.log(
                actor=self.request.user,
                lodge=expense.lodge,
                action=AuditLog.Action.CREATE,
                obj=expense,
                changes={
                    "category_id": {
                        "from": None,
                        "to": expense.category_id,
                    },
                    "date": {
                        "from": None,
                        "to": expense.date.isoformat(),
                    },
                    "amount": {
                        "from": None,
                        "to": str(expense.amount),
                    },
                },
                details={
                    "category_name": expense.category.name,
                },
            )


class ExpenseDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = ExpenseSerializer
    permission_classes = [IsExpenseManagerOrOwner]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return Expense.objects.none()

        return Expense.objects.filter(
            lodge=membership.lodge
        )

    def perform_update(self, serializer):
        expense = self.get_object()

        old_values = {
            "category_id": expense.category_id,
            "date": expense.date.isoformat(),
            "amount": str(expense.amount),
            "description": expense.description,
        }

        with transaction.atomic():
            expense = serializer.save()

            changes = {}

            if old_values["category_id"] != expense.category_id:
                changes["category_id"] = {
                    "from": old_values["category_id"],
                    "to": expense.category_id,
                }

            if old_values["date"] != expense.date.isoformat():
                changes["date"] = {
                    "from": old_values["date"],
                    "to": expense.date.isoformat(),
                }

            if old_values["amount"] != str(expense.amount):
                changes["amount"] = {
                    "from": old_values["amount"],
                    "to": str(expense.amount),
                }

            if old_values["description"] != expense.description:
                changes["description"] = {
                    "from": old_values["description"],
                    "to": expense.description,
                }

            if changes:
                AuditService.log(
                    actor=self.request.user,
                    lodge=expense.lodge,
                    action=AuditLog.Action.UPDATE,
                    obj=expense,
                    changes=changes,
                    details={
                        "category_name": expense.category.name,
                    },
                )


    def perform_destroy(self, instance):
        expense = instance

        changes = {
            "category_id": expense.category_id,
            "date": expense.date.isoformat(),
            "amount": str(expense.amount),
        }

        details = {
            "category_name": expense.category.name,
        }

        with transaction.atomic():
            AuditService.log(
                actor=self.request.user,
                lodge=expense.lodge,
                action=AuditLog.Action.DELETE,
                obj=expense,
                changes=changes,
                details=details,
            )

            expense.delete()



class FinancialSummaryView(generics.GenericAPIView):

    def get(self, request):

        membership = (
            request.user.memberships.filter(active=True)
            .select_related("lodge")
            .first()
        )

        if not membership:
            return Response(
                {"detail": "No active lodge membership found."},
                status=403,
            )

        if membership.role != "Owner":
            return Response(
                {
                    "detail": (
                        "You do not have permission "
                        "to view financial information."
                    )
                },
                status=403,
            )

        lodge = membership.lodge

        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        # Default values for custom period
        period_income = None
        period_general_expenses = None
        period_staff_expenses = None
        period_total_expenses = None
        period_profit = None

        # -------------------------
        # Custom period calculation
        # -------------------------
        if start_date and end_date:

            reservation_period_income = (
                Payment.objects.filter(
                    reservation__lodge=lodge,
                    created_at__date__gte=start_date,
                    created_at__date__lte=end_date,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )

            walk_in_period_income = (
                WalkInPayment.objects.filter(
                    order__lodge=lodge,
                    created_at__date__gte=start_date,
                    created_at__date__lte=end_date,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )

            period_income = (
                reservation_period_income + walk_in_period_income
            )

            period_general_expenses = (
                Expense.objects.filter(
                    lodge=lodge,
                    date__gte=start_date,
                    date__lte=end_date,
                ).aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )

            period_staff_expenses = (
                SalaryPayment.objects.filter(
                    staff__lodge=lodge,
                    payment_date__gte=start_date,
                    payment_date__lte=end_date,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )

            period_total_expenses = (
                period_general_expenses + period_staff_expenses
            )

            period_profit = (
                period_income - period_total_expenses
            )

        # -------------------------
        # Today
        # -------------------------
        today = timezone.localdate()

        reservation_today_income = (
            Payment.objects.filter(
                reservation__lodge=lodge,
                created_at__date=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        walk_in_today_income = (
            WalkInPayment.objects.filter(
                order__lodge=lodge,
                created_at__date=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        today_income = (
            reservation_today_income + walk_in_today_income
        )

        today_expenses = (
            Expense.objects.filter(
                lodge=lodge,
                date=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        today_staff_expenses = (
            SalaryPayment.objects.filter(
                staff__lodge=lodge,
                payment_date=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        today_total_expenses = (
            today_expenses + today_staff_expenses
        )

        today_profit = (
            today_income - today_total_expenses
        )

        # -------------------------
        # Week
        # -------------------------
        start_of_week = today - timezone.timedelta(
            days=today.weekday()
        )

        reservation_week_income = (
            Payment.objects.filter(
                reservation__lodge=lodge,
                created_at__date__gte=start_of_week,
                created_at__date__lte=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        walk_in_week_income = (
            WalkInPayment.objects.filter(
                order__lodge=lodge,
                created_at__date__gte=start_of_week,
                created_at__date__lte=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        week_income = (
            reservation_week_income + walk_in_week_income
        )

        week_expenses = (
            Expense.objects.filter(
                lodge=lodge,
                date__gte=start_of_week,
                date__lte=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        week_staff_expenses = (
            SalaryPayment.objects.filter(
                staff__lodge=lodge,
                payment_date__gte=start_of_week,
                payment_date__lte=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        week_total_expenses = (
            week_expenses + week_staff_expenses
        )

        week_profit = (
            week_income - week_total_expenses
        )

        # -------------------------
        # Month
        # -------------------------
        start_of_month = today.replace(day=1)

        reservation_month_income = (
            Payment.objects.filter(
                reservation__lodge=lodge,
                created_at__date__gte=start_of_month,
                created_at__date__lte=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        walk_in_month_income = (
            WalkInPayment.objects.filter(
                order__lodge=lodge,
                created_at__date__gte=start_of_month,
                created_at__date__lte=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        month_income = (
            reservation_month_income + walk_in_month_income
        )

        month_expenses = (
            Expense.objects.filter(
                lodge=lodge,
                date__gte=start_of_month,
                date__lte=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        month_staff_expenses = (
            SalaryPayment.objects.filter(
                staff__lodge=lodge,
                payment_date__gte=start_of_month,
                payment_date__lte=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        month_total_expenses = (
            month_expenses + month_staff_expenses
        )

        month_profit = (
            month_income - month_total_expenses
        )

        # -------------------------
        # Overall
        # -------------------------
        reservation_total_income = (
            Payment.objects.filter(
                reservation__lodge=lodge,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        walk_in_total_income = (
            WalkInPayment.objects.filter(
                order__lodge=lodge,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        total_income = (
            reservation_total_income + walk_in_total_income
        )

        general_expenses = (
            Expense.objects.filter(
                lodge=lodge,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        staff_expenses = (
            SalaryPayment.objects.filter(
                staff__lodge=lodge,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        total_expenses = (
            general_expenses + staff_expenses
        )

        profit = (
            total_income - total_expenses
        )

        return Response(
            {
                "total_income": total_income,
                "today_income": today_income,
                "today_expenses": today_expenses,
                "today_staff_expenses": today_staff_expenses,
                "today_total_expenses": today_total_expenses,
                "today_profit": today_profit,

                "week_income": week_income,
                "week_expenses": week_expenses,
                "week_staff_expenses": week_staff_expenses,
                "week_total_expenses": week_total_expenses,
                "week_profit": week_profit,

                "month_income": month_income,
                "month_expenses": month_expenses,
                "month_staff_expenses": month_staff_expenses,
                "month_total_expenses": month_total_expenses,
                "month_profit": month_profit,

                "staff_expenses": staff_expenses,
                "total_expenses": total_expenses,
                "period_income": period_income,
                "period_general_expenses": period_general_expenses,
                "period_staff_expenses": period_staff_expenses,
                "period_total_expenses": period_total_expenses,
                "period_profit": period_profit,

                "profit": profit,
            }
        )



class StaffListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = StaffSerializer
    permission_classes = [IsStaffManagerOrOwner]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return Staff.objects.none()

        queryset = Staff.objects.filter(
            lodge=membership.lodge
        ).order_by("name")

        active = self.request.query_params.get("active")

        if active is not None:
            queryset = queryset.filter(
                active=active.lower() == "true"
            )

        return queryset


class StaffDetailView(
    generics.RetrieveUpdateAPIView
):
    serializer_class = StaffSerializer
    permission_classes = [IsStaffManagerOrOwner]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return Staff.objects.none()

        return Staff.objects.filter(
            lodge=membership.lodge
        )


class SalaryPaymentListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = SalaryPaymentSerializer
    permission_classes = [IsSalaryPaymentManagerOrOwner]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return SalaryPayment.objects.none()

        queryset = (
            SalaryPayment.objects.select_related("staff")
            .filter(staff__lodge=membership.lodge)
            .order_by("-payment_date")
        )

        staff_id = self.request.query_params.get(
            "staff"
        )

        if staff_id:
            queryset = queryset.filter(
                staff_id=staff_id
            )

        salary_month = self.request.query_params.get(
            "salary_month"
        )

        if salary_month:
            queryset = queryset.filter(
                salary_month=salary_month
            )

        return queryset


    def perform_create(self, serializer):
        with transaction.atomic():
            salary_payment = serializer.save()

            AuditService.log(
                actor=self.request.user,
                lodge=salary_payment.staff.lodge,
                action=AuditLog.Action.CREATE,
                obj=salary_payment,
                changes={
                    "staff_id": {
                        "from": None,
                        "to": salary_payment.staff_id,
                    },
                    "amount": {
                        "from": None,
                        "to": str(salary_payment.amount),
                    },
                    "payment_date": {
                        "from": None,
                        "to": salary_payment.payment_date.isoformat(),
                    },
                    "salary_month": {
                        "from": None,
                        "to": salary_payment.salary_month.isoformat(),
                    },
                },
                details={
                    "staff_name": salary_payment.staff.name,
                    "staff_role": salary_payment.staff.role,
                },
            )


class SalaryPaymentMonthlyView(
    generics.GenericAPIView
):
    """
    Returns the salary payment status for every staff member
    for one selected salary month.

    Example:

        /api/salary-payments/monthly/?salary_month=2026-08-01
    """

    permission_classes = [IsSalaryPaymentManagerOrOwner]

    def get(self, request):
        membership = (
            request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return Response(
                {"detail": "No active lodge membership found."},
                status=403,
            )

        # If no month is supplied, use the current month.
        salary_month_param = request.query_params.get(
            "salary_month"
        )

        if salary_month_param:
            try:
                salary_month = datetime.strptime(
                    salary_month_param,
                    "%Y-%m-%d",
                ).date()

                # Always treat salary month as a month,
                # not a specific day.
                salary_month = salary_month.replace(
                    day=1
                )

            except ValueError:
                return Response(
                    {
                        "detail": (
                            "Invalid salary_month. "
                            "Use YYYY-MM-DD."
                        )
                    },
                    status=400,
                )
        else:
            today = timezone.localdate()

            salary_month = today.replace(day=1)

        # Get all active staff in this lodge.
        staff_queryset = Staff.objects.filter(
            lodge=membership.lodge,
            active=True,
        ).order_by("name")

        # Get payments for the selected month.
        payments = (
            SalaryPayment.objects.select_related("staff")
            .filter(
                staff__lodge=membership.lodge,
                salary_month=salary_month,
            )
        )

        payment_map = {
            payment.staff_id: payment
            for payment in payments
        }

        rows = []

        total_paid = Decimal("0.00")
        staff_paid = 0
        staff_unpaid = 0

        for staff in staff_queryset:
            payment = payment_map.get(staff.id)

            if payment:
                status = "Paid"
                amount = payment.amount
                payment_date = payment.payment_date
                notes = payment.notes

                total_paid += payment.amount
                staff_paid += 1
            else:
                status = "Unpaid"
                amount = Decimal("0.00")
                payment_date = None
                notes = ""

                staff_unpaid += 1

            rows.append(
                {
                    "staff": staff.id,
                    "staff_name": staff.name,
                    "staff_role": staff.role,
                    "salary": staff.salary,
                    "amount": amount,
                    "payment_date": payment_date,
                    "salary_month": salary_month,
                    "notes": notes,
                    "status": status,
                }
            )

        return Response(
            {
                "salary_month": salary_month,
                "total_paid": total_paid,
                "staff_paid": staff_paid,
                "staff_unpaid": staff_unpaid,
                "total_staff": staff_paid + staff_unpaid,
                "payments": rows,
            }
        )
