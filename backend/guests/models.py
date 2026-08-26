from django.db import models
from tenants.models import Lodge


class Guest(models.Model):

    ID_TYPE_CHOICES = [
        ("National ID", "National ID"),
        ("Driver's License", "Driver's License"),
        ("Passport", "Passport"),
    ]

    GENDER_CHOICES = [
        ("Male", "Male"),
        ("Female", "Female"),
        ("Other", "Other"),
    ]
    
    lodge = models.ForeignKey(
    Lodge,
    on_delete=models.CASCADE,
    related_name="guests"
    
)

    full_name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=30)

    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    id_type = models.CharField(
        max_length=30,
        choices=ID_TYPE_CHOICES,
        blank=True,
        null=True,
    )

    id_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        blank=True,
        null=True,
    )

    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    active = models.BooleanField(default=True)

    def __str__(self):
        return self.full_name