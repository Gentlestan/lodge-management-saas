from django.utils import timezone
from django.db.models import Sum

from rest_framework.response import Response
from rest_framework.views import APIView

from rooms.models import Room
from reservations.models import Reservation


class DashboardView(APIView):

    def get(self, request):
        today = timezone.localdate()

        active_rooms = Room.objects.filter(active=True)

        total_rooms = active_rooms.count()

        available_rooms = active_rooms.filter(
            status="Available"
        ).count()

        reserved_rooms = active_rooms.filter(
            status="Reserved"
        ).count()

        occupied_rooms = active_rooms.filter(
            status="Occupied"
        ).count()

        cleaning_rooms = active_rooms.filter(
            status="Cleaning"
        ).count()

        maintenance_rooms = active_rooms.filter(
            status="Maintenance"
        ).count()

        check_ins_today = Reservation.objects.filter(
            checked_in_at__date=today,
        ).count()

        check_outs_today = Reservation.objects.filter(
            checked_out_at__date=today,
        ).count()
        
        current_guests = Reservation.objects.filter(
            status="Checked In",
        ).aggregate(
            total=Sum("number_of_guests")
        )["total"] or 0

        upcoming_reservations = Reservation.objects.filter(
            check_in_date__gt=today,
            status="Reserved",
        ).order_by("check_in_date")[:5]

        upcoming_data = [
            {
                "id": reservation.id,
                "guest_name": reservation.guest.full_name,
                "room_name": reservation.room.room_name,
                "check_in_date": reservation.check_in_date,
                "check_out_date": reservation.check_out_date,
                "number_of_guests": reservation.number_of_guests,
            }
            for reservation in upcoming_reservations
        ]

        overdue_checkouts = Reservation.objects.filter(
            check_out_date__lt=today,
            status="Checked In",
        ).count()

        alerts = {
            "cleaning_rooms": cleaning_rooms,
            "maintenance_rooms": maintenance_rooms,
            "overdue_checkouts": overdue_checkouts,
        }

        return Response(
            {
                "total_rooms": total_rooms,
                "available_rooms": available_rooms,
                "reserved_rooms": reserved_rooms,
                "occupied_rooms": occupied_rooms,
                "cleaning_rooms": cleaning_rooms,
                "maintenance_rooms": maintenance_rooms,
                "check_ins_today": check_ins_today,
                "check_outs_today": check_outs_today,
                "upcoming_reservations": upcoming_data,
                "alerts": alerts,
                "current_guests": current_guests,
            }
        )