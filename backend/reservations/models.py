
from django.db import models

from guests.models import Guest
from rooms.models import Room
from tenants.models import Lodge
from django.core.validators import MinValueValidator


class ShortRestPackage(models.Model):
    lodge = models.ForeignKey(
        Lodge,
        on_delete=models.CASCADE,
        related_name="short_rest_packages",
    )
    name = models.CharField(max_length=100)
    duration_hours = models.PositiveIntegerField(
    validators=[MinValueValidator(1)]
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["duration_hours", "name"]

    def __str__(self):
        return f"{self.name} - ₦{self.price}"


class Reservation(models.Model):
    STATUS_CHOICES = [
        ("Reserved", "Reserved"),
        ("Checked In", "Checked In"),
        ("Checked Out", "Checked Out"),
        ("Cancelled", "Cancelled"),
        ("No Show", "No Show"),
    ]

    STAY_TYPE_CHOICES = [
        ("Overnight", "Overnight"),
        ("Short Rest", "Short Rest"),
    ]

    lodge = models.ForeignKey(
        Lodge,
        on_delete=models.CASCADE,
        related_name="reservations"
    )

    guest = models.ForeignKey(
        Guest,
        on_delete=models.PROTECT,
        related_name="reservations",
    )

    room = models.ForeignKey(
        Room,
        on_delete=models.PROTECT,
        related_name="reservations",
    )

    room_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    stay_type = models.CharField(
        max_length=20,
        choices=STAY_TYPE_CHOICES,
        default="Overnight",
    )

    short_rest_package = models.ForeignKey(
        ShortRestPackage,
        on_delete=models.PROTECT,
        related_name="reservations",
        null=True,
        blank=True,
    )

    short_rest_start = models.DateTimeField(
        null=True,
        blank=True,
    )

    short_rest_end = models.DateTimeField(
        null=True,
        blank=True,
    )

    check_in_date = models.DateField()

    check_out_date = models.DateField()

    number_of_guests = models.PositiveIntegerField(default=1)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Reserved",
    )

    special_requests = models.TextField(
        blank=True,
        null=True,
    )

    notes = models.TextField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    checked_in_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    checked_out_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.guest.full_name} - Room {self.room.room_name}"
