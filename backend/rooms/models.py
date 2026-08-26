from django.db import models
from tenants.models import Lodge


class Room(models.Model):
    STATUS_CHOICES = [
        ("Available", "Available"),
        ("Reserved", "Reserved"),
        ("Occupied", "Occupied"),
        ("Cleaning", "Cleaning"),
        ("Maintenance", "Maintenance"),
    ]
    
    lodge = models.ForeignKey(
    Lodge,
    on_delete=models.CASCADE,
    related_name="rooms"
    
)

    room_name = models.CharField(max_length=100)
    room_type = models.CharField(max_length=100)
    price_per_night = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Available"
    )

    description = models.TextField(blank=True)
    amenities = models.TextField(blank=True)
    bed_type = models.CharField(max_length=100, blank=True)
    maximum_occupancy = models.PositiveIntegerField(
        null=True,
        blank=True
    )
    floor_location = models.CharField(
        max_length=100,
        blank=True
    )
    internal_notes = models.TextField(blank=True)

    active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.room_name