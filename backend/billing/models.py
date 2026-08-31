from django.db import models

from reservations.models import Reservation
from tenants.models import Lodge


class ServiceItem(models.Model):
    
    lodge = models.ForeignKey(
        Lodge,
        on_delete=models.CASCADE,
        related_name="service_items",
    )
    CATEGORY_CHOICES = [
        ("Food", "Food"),
        ("Drinks", "Drinks"),
        ("Laundry", "Laundry"),
        ("Room Service", "Room Service"),
        ("Other", "Other"),
    ]

    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
    )

    name = models.CharField(
        max_length=255,
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return f"{self.name} - {self.price}"


class Charge(models.Model):
    CATEGORY_CHOICES = [
        ("Accommodation", "Accommodation"),
        ("Food", "Food"),
        ("Drinks", "Drinks"),
        ("Laundry", "Laundry"),
        ("Room Service", "Room Service"),
        ("Other", "Other"),
    ]

    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name="charges",
    )
    
    service_item = models.ForeignKey(
        ServiceItem,
        on_delete=models.PROTECT,
        related_name="charges",
        null=True,
        blank=True,
    )

    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
    )

    description = models.CharField(
        max_length=255,
    )

    quantity = models.PositiveIntegerField(
        default=1,
    )

    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    @property
    def total(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"{self.category} - {self.description}"


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ("Cash", "Cash"),
        ("Transfer", "Transfer"),
        ("POS", "POS"),
        ("Other", "Other"),
    ]

    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name="payments",
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
    )

    reference = models.CharField(
        max_length=100,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return f"{self.reservation} - {self.amount}"
    
    
class ExpenseCategory(models.Model):
    lodge = models.ForeignKey(
        Lodge,
        on_delete=models.CASCADE,
        related_name="expense_categories",
    )

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Expense(models.Model):
    lodge = models.ForeignKey(
        Lodge,
        on_delete=models.CASCADE,
        related_name="expenses",
    )

    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.PROTECT,
        related_name="expenses",
    )
    date = models.DateField()
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.category.name} - ₦{self.amount}"


class Staff(models.Model):
    lodge = models.ForeignKey(
        Lodge,
        on_delete=models.CASCADE,
        related_name="staff"
    )

    name = models.CharField(max_length=100)

    role = models.CharField(max_length=100)

    phone = models.CharField(
        max_length=30,
        blank=True,
    )

    email = models.EmailField(
        blank=True,
    )
    
    employment_date = models.DateField()
    employment_end_date = models.DateField(null=True, blank=True)

    salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name



class SalaryPayment(models.Model):
    staff = models.ForeignKey(
        Staff,
        on_delete=models.PROTECT,
        related_name="salary_payments",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    payment_date = models.DateField()
    salary_month = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["staff", "salary_month"],
                name="unique_staff_salary_month",
            )
        ]

    def __str__(self):
        return f"{self.staff.name} - {self.amount}"

