from rest_framework import generics

from tenants.permissions import IsOwnerOnly

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    """
    Owner-only audit log for the current lodge.
    """

    serializer_class = AuditLogSerializer
    permission_classes = [IsOwnerOnly]

    def get_queryset(self):
        membership = (
            self.request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            return AuditLog.objects.none()

        return (
            AuditLog.objects
            .filter(lodge=membership.lodge)
            .select_related(
                "actor",
                "content_type",
            )
            .order_by("-created_at")
        )