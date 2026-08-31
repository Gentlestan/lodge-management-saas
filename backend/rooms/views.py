from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from tenants.permissions import (
    IsLodgeMember,
    IsRoomManagerOrOwner,
)
from tenants.utils import get_current_lodge

from .models import Room
from .serializers import RoomSerializer


class RoomViewSet(viewsets.ModelViewSet):

    serializer_class = RoomSerializer

    permission_classes = [
        IsAuthenticated,
        IsLodgeMember,
        IsRoomManagerOrOwner,
    ]

    def get_queryset(self):
        # Platform admin can see everything
        if self.request.user.is_superuser:
            return Room.objects.all()

        lodge = get_current_lodge(self.request.user)

        return Room.objects.filter(
            lodge=lodge
        )

    def perform_create(self, serializer):
        lodge = get_current_lodge(self.request.user)

        serializer.save(
            lodge=lodge
        )

    def partial_update(self, request, *args, **kwargs):
        """
        Handle partial room updates.

        Business rules:

        - Reserved rooms cannot be deactivated.
        - Occupied rooms cannot be deactivated.
        - Other room statuses may be deactivated.
        - Status changes are handled by RoomSerializer.
        """

        room = self.get_object()

        # ---------------------------------------------------------
        # PREVENT DEACTIVATING RESERVED/OCCUPIED ROOMS
        # ---------------------------------------------------------

        if (
            request.data.get("active") is False
            and room.status in ["Reserved", "Occupied"]
        ):
            return Response(
                {
                    "detail": (
                        f"{room.room_name} cannot be deactivated "
                        f"while its status is {room.status}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().partial_update(
            request,
            *args,
            **kwargs,
        )

    @action(detail=True, methods=["patch"])
    def mark_available(self, request, pk=None):

        room = self.get_object()

        if not room.active:
            return Response(
                {
                    "detail": (
                        "An inactive room cannot be marked as available."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if room.status not in [
            "Cleaning",
            "Maintenance",
        ]:
            return Response(
                {
                    "detail": (
                        "Only rooms with Cleaning or Maintenance "
                        "status can be marked as Available."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        room.status = "Available"

        room.save(
            update_fields=["status"]
        )

        serializer = self.get_serializer(room)

        return Response(serializer.data)