from rest_framework import viewsets
from django.db.models import Q

from .models import Guest
from .serializers import GuestSerializer


class GuestViewSet(viewsets.ModelViewSet):
    serializer_class = GuestSerializer

    def get_queryset(self):
        queryset = Guest.objects.all().order_by("-created_at")

        search = self.request.query_params.get("search")

        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(phone_number__icontains=search)
            )

        return queryset