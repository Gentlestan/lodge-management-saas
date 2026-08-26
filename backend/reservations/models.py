from django.db import models

from guests.models import Guest
from rooms.models import Room


class Reservation(models.Model):

    STATUS_CHOICES = [
        ("Reserved", "Reserved"),
        ("Checked In", "Checked In"),
        ("Checked Out", "Checked Out"),
        ("Cancelled", "Cancelled"),
    ]

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

    check_in_date = models.DateField()
    check_out_date = models.DateField()

    number_of_guests = models.PositiveIntegerField(default=1)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Reserved",
    )

    special_requests = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.guest.full_name} - Room {self.room.room_name}"
    
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_out_at = models.DateTimeField(null=True, blank=True)