from django.urls import path

from .views import (
    ServiceItemListCreateView,
    ServiceItemDetailView,
    ChargeListCreateView,
    PaymentListCreateView,
    BillingSummaryView,
    ExpenseCategoryListCreateView,
    ExpenseCategoryDetailView,
    ExpenseListCreateView,
    ExpenseDetailView,
    FinancialSummaryView,
    StaffListCreateView,
    SalaryPaymentListCreateView,
    StaffDetailView,
)

urlpatterns = [
    path(
        "service-items/",
        ServiceItemListCreateView.as_view(),
        name="service-item-list-create",
    ),
    path(
        "service-items/<int:pk>/",
        ServiceItemDetailView.as_view(),
        name="service-item-detail",
    ),
    path(
        "charges/",
        ChargeListCreateView.as_view(),
        name="charge-list-create",
    ),
    path(
        "payments/",
        PaymentListCreateView.as_view(),
        name="payment-list-create",
    ),
    path(
        "reservations/<int:reservation_id>/summary/",
        BillingSummaryView.as_view(),
        name="billing-summary",
    ),
    
    path(
    "expense-categories/",
    ExpenseCategoryListCreateView.as_view(),
    name="expense-category-list-create",
),

    path(
        "expense-categories/<int:pk>/",
        ExpenseCategoryDetailView.as_view(),
        name="expense-category-detail",
    ),

    path(
        "expenses/",
        ExpenseListCreateView.as_view(),
        name="expense-list-create",
    ),
    path(
    "expenses/<int:pk>/",
    ExpenseDetailView.as_view(),
    name="expense-detail",
    ),
    
    path(
    "financial-summary/",
     FinancialSummaryView.as_view(),
     name="financial-summary",
    ),
    
        path(
        "staff/",
        StaffListCreateView.as_view(),
        name="staff-list-create",
    ),
        
    path(
        "staff/<int:pk>/",
        StaffDetailView.as_view(),
        name="staff-detail",
),

    path(
        "salary-payments/",
        SalaryPaymentListCreateView.as_view(),
        name="salary-payment-list-create",
    ),
]