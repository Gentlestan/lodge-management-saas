# rooms/views.py

from rest_framework import status, viewsets

from rest_framework.decorators import action

from rest_framework.response import Response

from .models import Room

from .serializers import RoomSerializer


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

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

        if room.status not in ["Cleaning", "Maintenance"]:
            return Response(
                {
                    "detail": (
                        "Only rooms with Cleaning or Maintenance status "
                        "can be marked as Available."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        room.status = "Available"
        room.save()

        serializer = self.get_serializer(room)

        return Response(serializer.data)