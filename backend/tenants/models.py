from django.conf import settings
from django.db import models


class Lodge(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Membership(models.Model):
    ROLE_CHOICES = [
        ("Owner", "Owner"),
        ("Manager", "Manager"),
        ("Receptionist", "Receptionist"),
        ("Accountant", "Accountant"),
        ("Staff", "Staff"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )

    lodge = models.ForeignKey(
        Lodge,
        on_delete=models.CASCADE,
        related_name="memberships",
    )

    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
    )

    active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "lodge"],
                name="unique_user_lodge_membership",
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.lodge.name} ({self.role})"