from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from tenants.permissions import IsLodgeMember
from tenants.utils import get_current_lodge

from .models import Guest
from .serializers import GuestSerializer


class GuestViewSet(viewsets.ModelViewSet):
    serializer_class = GuestSerializer
    permission_classes = [IsAuthenticated, IsLodgeMember]

    def get_queryset(self):
        if self.request.user.is_superuser:
            queryset = Guest.objects.all().order_by("-created_at")
        else:
            lodge = get_current_lodge(self.request.user)
            queryset = Guest.objects.filter(
                lodge=lodge
            ).order_by("-created_at")

        search = self.request.query_params.get("search")

        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(phone_number__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        lodge = get_current_lodge(self.request.user)
        serializer.save(lodge=lodge)