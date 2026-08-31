from django.utils import timezone
from decimal import Decimal
from datetime import datetime

from django.db.models import Sum
from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from reservations.models import Reservation

from tenants.permissions import (
    IsServiceItemManagerOrOwner,
    IsExpenseCategoryManagerOrOwner,
    IsExpenseManagerOrOwner,
    IsStaffManagerOrOwner,
    IsSalaryPaymentManagerOrOwner,
)

from .models import (
    ServiceItem,
    Charge,
    Payment,
    ExpenseCategory,
    Expense,
    Staff,
    SalaryPayment,
)

from .serializers import (
    ServiceItemSerializer,
    ChargeSerializer,
    PaymentSerializer,
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

        total_charges = sum(
            (
                charge.quantity * charge.unit_price
                for charge in charges
            ),
            Decimal("0.00"),
        )

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

        serializer.save(lodge=membership.lodge)


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
            period_income = (
                Payment.objects.filter(
                    reservation__lodge=lodge,
                    created_at__date__gte=start_date,
                    created_at__date__lte=end_date,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
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

        today_income = (
            Payment.objects.filter(
                reservation__lodge=lodge,
                created_at__date=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
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

        week_income = (
            Payment.objects.filter(
                reservation__lodge=lodge,
                created_at__date__gte=start_of_week,
                created_at__date__lte=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
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

        month_income = (
            Payment.objects.filter(
                reservation__lodge=lodge,
                created_at__date__gte=start_of_month,
                created_at__date__lte=today,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
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
        total_income = (
            Payment.objects.filter(
                reservation__lodge=lodge,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
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
