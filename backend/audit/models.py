from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from tenants.models import Lodge


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "CREATE", "Created"
        UPDATE = "UPDATE", "Updated"
        DELETE = "DELETE", "Deleted"

        CHECK_IN = "CHECK_IN", "Checked In"
        CHECK_OUT = "CHECK_OUT", "Checked Out"
        CANCEL = "CANCEL", "Cancelled"
        NO_SHOW = "NO_SHOW", "Marked No Show"

        MARK_AVAILABLE = "MARK_AVAILABLE", "Marked Available"

        ACTIVATE = "ACTIVATE", "Activated"
        DEACTIVATE = "DEACTIVATE", "Deactivated"

        ROLE_CHANGE = "ROLE_CHANGE", "Role Changed"

    lodge = models.ForeignKey(
        Lodge,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )

    actor_role = models.CharField(
        max_length=30,
        blank=True,
    )

    action = models.CharField(
        max_length=30,
        choices=Action.choices,
    )

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    object_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
    )

    content_object = GenericForeignKey(
        "content_type",
        "object_id",
    )

    object_repr = models.CharField(
        max_length=255,
        blank=True,
    )

    changes = models.JSONField(
        default=dict,
        blank=True,
    )

    details = models.JSONField(
        default=dict,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["lodge", "-created_at"],
                name="audit_lodge_created_idx",
            ),
            models.Index(
                fields=["actor", "-created_at"],
                name="audit_actor_created_idx",
            ),
            models.Index(
                fields=["content_type", "object_id"],
                name="audit_object_idx",
            ),
        ]

    def __str__(self):
        actor = self.actor.username if self.actor else "System"
        action = self.get_action_display()
        target = self.object_repr or "System event"

        return f"{actor} - {action} - {target}"