from django.contrib.contenttypes.models import ContentType

from tenants.models import Membership

from .models import AuditLog


class AuditService:
    """
    Centralized service for creating audit log entries.

    The caller must explicitly provide the actor and lodge.
    This service does not perform tenant resolution.
    """

    SENSITIVE_FIELDS = {
        "password",
        "password_hash",
        "id_number",
    }

    @classmethod
    def log(
        cls,
        *,
        actor,
        lodge,
        action,
        obj=None,
        changes=None,
        details=None,
    ):
        """
        Create an audit log entry.

        The caller is responsible for supplying the correct lodge.
        The service does not attempt to determine tenant context.
        """

        if lodge is None:
            raise ValueError(
                "AuditService.log() requires an explicit lodge."
            )

        if action not in AuditLog.Action.values:
            raise ValueError(
                f"Invalid audit action: {action}"
            )

        changes = cls._sanitize(changes or {})
        details = cls._sanitize(details or {})

        actor_role = cls._get_actor_role(actor, lodge)

        content_type = None
        object_id = None
        object_repr = ""

        if obj is not None:
            content_type = ContentType.objects.get_for_model(
                obj,
                for_concrete_model=False,
            )
            object_id = str(obj.pk)
            object_repr = str(obj)

        return AuditLog.objects.create(
            lodge=lodge,
            actor=actor,
            actor_role=actor_role,
            action=action,
            content_type=content_type,
            object_id=object_id,
            object_repr=object_repr,
            changes=changes,
            details=details,
        )

    @classmethod
    def _get_actor_role(cls, actor, lodge):
        """
        Return the actor's active role for the supplied lodge.

        Superusers do not have a normal lodge membership.
        """

        if not actor or not getattr(actor, "is_authenticated", False):
            return ""

        if getattr(actor, "is_superuser", False):
            return "Superuser"

        membership = (
            Membership.objects
            .filter(
                user=actor,
                lodge=lodge,
                active=True,
            )
            .only("role")
            .first()
        )

        return membership.role if membership else ""

    @classmethod
    def _sanitize(cls, value):
        """
        Recursively remove sensitive fields from audit data.
        """

        if isinstance(value, dict):
            return {
                key: cls._sanitize(item)
                for key, item in value.items()
                if str(key).lower() not in cls.SENSITIVE_FIELDS
            }

        if isinstance(value, list):
            return [cls._sanitize(item) for item in value]

        if isinstance(value, tuple):
            return [cls._sanitize(item) for item in value]

        return value