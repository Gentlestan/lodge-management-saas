from django.utils import timezone
from decimal import Decimal

from django.db.models import Sum
from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.response import Response


from reservations.models import Reservation

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

    def get_queryset(self):
        queryset = ServiceItem.objects.all().order_by("name")

        active = self.request.query_params.get("active")

        if active is not None:
            queryset = queryset.filter(
                active=active.lower() == "true"
            )

        return queryset
    
class ServiceItemDetailView(generics.RetrieveUpdateAPIView):
    queryset = ServiceItem.objects.all()
    serializer_class = ServiceItemSerializer   


class ChargeListCreateView(generics.ListCreateAPIView):
    serializer_class = ChargeSerializer

    def get_queryset(self):
        queryset = Charge.objects.all().order_by("-created_at")

        reservation_id = self.request.query_params.get("reservation")

        if reservation_id:
            queryset = queryset.filter(
                reservation_id=reservation_id
            )

        return queryset


class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        queryset = Payment.objects.all().order_by("-created_at")

        reservation_id = self.request.query_params.get("reservation")

        if reservation_id:
            queryset = queryset.filter(
                reservation_id=reservation_id
            )

        return queryset


class BillingSummaryView(generics.GenericAPIView):
    def get(self, request, reservation_id):
        reservation = get_object_or_404(
            Reservation,
            id=reservation_id,
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

    def get_queryset(self):
        queryset = ExpenseCategory.objects.all()

        active = self.request.query_params.get("active")

        if active is not None:
            queryset = queryset.filter(
                active=active.lower() == "true"
            )

        return queryset


class ExpenseCategoryDetailView(
    generics.RetrieveUpdateAPIView
):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    

class ExpenseListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        queryset = Expense.objects.select_related(
            "category"
        ).all()

        category_id = self.request.query_params.get(
            "category"
        )

        if category_id:
            queryset = queryset.filter(
                category_id=category_id
            )

        return queryset


class FinancialSummaryView(generics.GenericAPIView):

    def get(self, request):
        
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        
        period_income = None
        period_expenses = None
        period_staff_expenses = None
        period_profit = None

        if start_date and end_date:
            period_income = (
                Payment.objects.filter(
                    created_at__date__gte=start_date,
                    created_at__date__lte=end_date,
                ).aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )

            period_expenses = (
                Expense.objects.filter(
                    date__gte=start_date,
                    date__lte=end_date,
                ).aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )
            
            
            period_staff_expenses = (
                SalaryPayment.objects.filter(
                    payment_date__gte=start_date,
                    payment_date__lte=end_date,
                ).aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )

            period_expenses = (
                period_expenses + period_staff_expenses
            )

            period_profit = period_income - period_expenses
        
        today = timezone.localdate()

        today_income = (
            Payment.objects.filter(
                created_at__date=today
            ).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )
        
        today_staff_expenses = (
            SalaryPayment.objects.filter(
                payment_date=today
            ).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )
        
        today_expenses = (
            Expense.objects.filter(
                date=today
            ).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )
        
        total_income = (
            Payment.objects.aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )
        
        start_of_week = today - timezone.timedelta(
            days=today.weekday()
        )

        week_income = (
            Payment.objects.filter(
                created_at__date__gte=start_of_week,
                created_at__date__lte=today,
            ).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )
        
        week_staff_expenses = (
            SalaryPayment.objects.filter(
                payment_date__gte=start_of_week,
                payment_date__lte=today,
            ).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )
        
        week_expenses = (
            Expense.objects.filter(
                date__gte=start_of_week,
                date__lte=today,
            ).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )
        
        start_of_month = today.replace(day=1)

        month_income = (
            Payment.objects.filter(
                created_at__date__gte=start_of_month,
                created_at__date__lte=today,
            ).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )
        
        month_expenses = (
            Expense.objects.filter(
                date__gte=start_of_month,
                date__lte=today,
            ).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )
        
        month_staff_expenses = (
            SalaryPayment.objects.filter(
                payment_date__gte=start_of_month,
                payment_date__lte=today,
            ).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )
        
        month_total_expenses = (
            month_expenses + month_staff_expenses
        )

        month_profit = (
            month_income - month_total_expenses
        )

        total_expenses = (
            Expense.objects.aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )
        
        total_salary_expenses = (
            SalaryPayment.objects.aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        total_expenses = (
            total_expenses + total_salary_expenses
        )
        
        today_total_expenses = (
            today_expenses + today_staff_expenses
        )

        week_total_expenses = (
            week_expenses + week_staff_expenses
        )

        today_profit = (
            today_income - today_total_expenses
        )

        week_profit = (
            week_income - week_total_expenses
        )

        profit = total_income - total_expenses
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

                "staff_expenses": total_salary_expenses,
                "total_expenses": total_expenses,

                "period_income": period_income,
                "period_staff_expenses": period_staff_expenses,
                "period_expenses": period_expenses,
                "period_profit": period_profit,

                "profit": profit,
            }
        )

class StaffListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = StaffSerializer

    def get_queryset(self):
        queryset = Staff.objects.all().order_by("name")

        active = self.request.query_params.get("active")

        if active is not None:
            queryset = queryset.filter(
                active=active.lower() == "true"
            )

        return queryset
    
class StaffDetailView(
    generics.RetrieveUpdateAPIView
):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer      
    

class SalaryPaymentListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = SalaryPaymentSerializer

    def get_queryset(self):
        queryset = SalaryPayment.objects.select_related(
            "staff"
        ).all().order_by("-payment_date")

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