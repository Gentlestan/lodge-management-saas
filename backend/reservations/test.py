from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from audit.models import AuditLog
from billing.models import Charge, Payment
from guests.models import Guest
from rooms.models import Room
from tenants.models import Lodge, Membership

from .models import Reservation


User = get_user_model()


class ReservationAuditTests(TestCase):
    """
    Tests the audit integration around the existing reservation workflows.

    These tests do not change reservation business logic.
    They verify that the existing workflows create the expected
    AuditLog records and that failed operations do not leave
    false audit entries or partial changes behind.
    """

    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="reservation_audit_user",
            password="test-password-123",
        )

        self.lodge = Lodge.objects.create(
            name="Audit Test Lodge",
            address="Test Address",
            phone="08000000000",
            email="audit@test.com",
        )

        Membership.objects.create(
            user=self.user,
            lodge=self.lodge,
            role="Receptionist",
            active=True,
        )

        self.guest = Guest.objects.create(
            lodge=self.lodge,
            full_name="Test Guest",
            phone_number="08000000001",
            active=True,
        )

        self.room = Room.objects.create(
            lodge=self.lodge,
            room_name="Room 101",
            building_location="Main Building",
            room_type="Standard",
            price_per_night=Decimal("50000.00"),
            status="Available",
            maximum_occupancy=2,
            active=True,
        )

        self.client.force_authenticate(
            user=self.user
        )

    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------

    def reservation_dates(self):
        check_in = timezone.localdate()
        check_out = check_in + timedelta(days=2)

        return check_in, check_out

    def create_reservation(self):
        check_in, check_out = self.reservation_dates()

        response = self.client.post(
            reverse("reservation-list"),
            {
                "guest": self.guest.id,
                "room": self.room.id,
                "check_in_date": check_in.isoformat(),
                "check_out_date": check_out.isoformat(),
                "number_of_guests": 1,
                "status": "Reserved",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        return Reservation.objects.get(
            pk=response.data["id"]
        )

    def check_in_reservation(self, reservation):
        response = self.client.patch(
            reverse(
                "reservation-check-in",
                kwargs={"pk": reservation.id},
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.data,
        )

        reservation.refresh_from_db()

        return reservation

    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------

    def test_create_creates_reservation_and_room_audits(self):
        reservation = self.create_reservation()

        reservation_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CREATE,
            object_id=str(reservation.id),
        ).first()

        self.assertIsNotNone(
            reservation_audit
        )

        self.assertEqual(
            reservation_audit.object_repr,
            str(reservation),
        )

        self.assertEqual(
            reservation_audit.changes["room_id"]["to"],
            reservation.room_id,
        )

        room_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.UPDATE,
            object_id=str(self.room.id),
            details__reservation_id=reservation.id,
        ).first()

        self.assertIsNotNone(
            room_audit
        )

        self.assertEqual(
            room_audit.changes["status"]["from"],
            "Available",
        )

        self.assertEqual(
            room_audit.changes["status"]["to"],
            "Reserved",
        )

        self.room.refresh_from_db()

        self.assertEqual(
            self.room.status,
            "Reserved",
        )

    # ------------------------------------------------------------------
    # CHECK-IN
    # ------------------------------------------------------------------

    def test_check_in_creates_check_in_room_and_charge_audits(self):
        reservation = self.create_reservation()

        self.check_in_reservation(
            reservation
        )

        reservation.refresh_from_db()
        self.room.refresh_from_db()

        self.assertEqual(
            reservation.status,
            "Checked In",
        )

        self.assertEqual(
            self.room.status,
            "Occupied",
        )

        check_in_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CHECK_IN,
            object_id=str(reservation.id),
        ).first()

        self.assertIsNotNone(
            check_in_audit
        )

        self.assertEqual(
            check_in_audit.changes["status"]["from"],
            "Reserved",
        )

        self.assertEqual(
            check_in_audit.changes["status"]["to"],
            "Checked In",
        )

        room_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.UPDATE,
            object_id=str(self.room.id),
            details__reservation_id=reservation.id,
        ).filter(
            changes__status__to="Occupied"
        ).first()

        self.assertIsNotNone(
            room_audit
        )

        accommodation_charge = Charge.objects.get(
            reservation=reservation,
            category="Accommodation",
        )

        charge_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CREATE,
            object_id=str(accommodation_charge.id),
        ).first()

        self.assertIsNotNone(
            charge_audit
        )

    # ------------------------------------------------------------------
    # CHECK-IN WITH EXISTING CHARGE
    # ------------------------------------------------------------------

    def test_check_in_does_not_create_false_charge_update_audit(self):
        reservation = self.create_reservation()

        accommodation_charge = Charge.objects.create(
            reservation=reservation,
            category="Accommodation",
            description=f"Room {reservation.room.room_name}",
            quantity=2,
            unit_price=reservation.room_rate,
        )

        self.check_in_reservation(
            reservation
        )

        charge_update_audits = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.UPDATE,
            object_id=str(accommodation_charge.id),
        )

        self.assertEqual(
            charge_update_audits.count(),
            0,
        )

        charge_create_audits = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CREATE,
            object_id=str(accommodation_charge.id),
        )

        self.assertEqual(
            charge_create_audits.count(),
            0,
        )

    # ------------------------------------------------------------------
    # CHECK-OUT
    # ------------------------------------------------------------------

    def test_checkout_creates_checkout_and_room_audits(self):
        reservation = self.create_reservation()

        self.check_in_reservation(
            reservation
        )

        accommodation_charge = Charge.objects.get(
            reservation=reservation,
            category="Accommodation",
        )

        Payment.objects.create(
            reservation=reservation,
            amount=accommodation_charge.total,
            payment_method="Cash",
            recorded_by=self.user,
        )

        response = self.client.patch(
            reverse(
                "reservation-check-out",
                kwargs={"pk": reservation.id},
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.data,
        )

        reservation.refresh_from_db()
        self.room.refresh_from_db()

        self.assertEqual(
            reservation.status,
            "Checked Out",
        )

        self.assertEqual(
            self.room.status,
            "Cleaning",
        )

        checkout_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CHECK_OUT,
            object_id=str(reservation.id),
        ).first()

        self.assertIsNotNone(
            checkout_audit
        )

        room_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.UPDATE,
            object_id=str(self.room.id),
            details__reservation_id=reservation.id,
        ).filter(
            changes__status__to="Cleaning"
        ).first()

        self.assertIsNotNone(
            room_audit
        )

    # ------------------------------------------------------------------
    # FAILED CHECK-OUT
    # ------------------------------------------------------------------

    def test_failed_checkout_does_not_create_checkout_audit_or_mutate_charge(
        self,
    ):
        reservation = self.create_reservation()

        self.check_in_reservation(
            reservation
        )

        accommodation_charge = Charge.objects.get(
            reservation=reservation,
            category="Accommodation",
        )

        old_quantity = accommodation_charge.quantity
        old_unit_price = accommodation_charge.unit_price

        response = self.client.patch(
            reverse(
                "reservation-check-out",
                kwargs={"pk": reservation.id},
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        reservation.refresh_from_db()
        accommodation_charge.refresh_from_db()

        self.assertEqual(
            reservation.status,
            "Checked In",
        )

        self.assertEqual(
            accommodation_charge.quantity,
            old_quantity,
        )

        self.assertEqual(
            accommodation_charge.unit_price,
            old_unit_price,
        )

        checkout_audits = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CHECK_OUT,
            object_id=str(reservation.id),
        )

        self.assertEqual(
            checkout_audits.count(),
            0,
        )

    # ------------------------------------------------------------------
    # CANCELLATION
    # ------------------------------------------------------------------

    def test_cancel_creates_cancel_audit_and_releases_room(self):
        reservation = self.create_reservation()

        response = self.client.patch(
            reverse(
                "reservation-detail",
                kwargs={"pk": reservation.id},
            ),
            {
                "status": "Cancelled",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.data,
        )

        reservation.refresh_from_db()
        self.room.refresh_from_db()

        self.assertEqual(
            reservation.status,
            "Cancelled",
        )

        self.assertEqual(
            self.room.status,
            "Available",
        )

        cancel_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CANCEL,
            object_id=str(reservation.id),
        ).first()

        self.assertIsNotNone(
            cancel_audit
        )

        self.assertEqual(
            cancel_audit.changes["status"]["from"],
            "Reserved",
        )

        self.assertEqual(
            cancel_audit.changes["status"]["to"],
            "Cancelled",
        )

        self.assertTrue(
            cancel_audit.details["room_released"]
        )

        room_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.UPDATE,
            object_id=str(self.room.id),
            details__reservation_id=reservation.id,
        ).filter(
            changes__status__to="Available"
        ).first()

        self.assertIsNotNone(
            room_audit
        )

    # ------------------------------------------------------------------
    # RESERVATION UPDATE
    # ------------------------------------------------------------------

    def test_reservation_update_creates_update_audit_with_changed_fields_only(
        self,
    ):
        reservation = self.create_reservation()

        new_guest = Guest.objects.create(
            lodge=self.lodge,
            full_name="Second Guest",
            phone_number="08000000002",
            active=True,
        )

        response = self.client.patch(
            reverse(
                "reservation-detail",
                kwargs={"pk": reservation.id},
            ),
            {
                "guest": new_guest.id,
                "number_of_guests": 2,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.data,
        )

        reservation.refresh_from_db()

        update_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.UPDATE,
            object_id=str(reservation.id),
        ).order_by("-created_at").first()

        self.assertIsNotNone(
            update_audit
        )

        self.assertIn(
            "guest_id",
            update_audit.changes,
        )

        self.assertIn(
            "number_of_guests",
            update_audit.changes,
        )

        self.assertNotIn(
            "room_id",
            update_audit.changes,
        )

        self.assertNotIn(
            "check_in_date",
            update_audit.changes,
        )

    # ------------------------------------------------------------------
    # ROOM CHANGE
    # ------------------------------------------------------------------

    def test_reservation_room_change_audits_both_rooms(self):
        reservation = self.create_reservation()

        new_room = Room.objects.create(
            lodge=self.lodge,
            room_name="Room 102",
            building_location="Main Building",
            room_type="Standard",
            price_per_night=Decimal("60000.00"),
            status="Available",
            maximum_occupancy=2,
            active=True,
        )

        response = self.client.patch(
            reverse(
                "reservation-detail",
                kwargs={"pk": reservation.id},
            ),
            {
                "room": new_room.id,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.data,
        )

        self.room.refresh_from_db()
        new_room.refresh_from_db()

        self.assertEqual(
            self.room.status,
            "Available",
        )

        self.assertEqual(
            new_room.status,
            "Reserved",
        )

        old_room_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.UPDATE,
            object_id=str(self.room.id),
            details__reservation_id=reservation.id,
            details__direction="released",
        ).first()

        self.assertIsNotNone(
            old_room_audit
        )

        self.assertEqual(
            old_room_audit.changes["status"]["from"],
            "Reserved",
        )

        self.assertEqual(
            old_room_audit.changes["status"]["to"],
            "Available",
        )

        new_room_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.UPDATE,
            object_id=str(new_room.id),
            details__reservation_id=reservation.id,
            details__direction="reserved",
        ).first()

        self.assertIsNotNone(
            new_room_audit
        )

        self.assertEqual(
            new_room_audit.changes["status"]["from"],
            "Available",
        )

        self.assertEqual(
            new_room_audit.changes["status"]["to"],
            "Reserved",
        )

    # ------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------

    def test_delete_creates_audit_before_reservation_is_deleted(self):
        reservation = self.create_reservation()

        reservation_id = reservation.id

        response = self.client.delete(
            reverse(
                "reservation-detail",
                kwargs={"pk": reservation_id},
            )
        )

        self.assertEqual(
            response.status_code,
            204,
        )

        self.assertFalse(
            Reservation.objects.filter(
                pk=reservation_id
            ).exists()
        )

        delete_audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.DELETE,
            object_id=str(reservation_id),
        ).first()

        self.assertIsNotNone(
            delete_audit
        )

        self.assertTrue(
            delete_audit.object_repr
        )

        self.assertEqual(
            delete_audit.changes["status"],
            "Reserved",
        )