from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from rest_framework.test import APIClient

from audit.models import AuditLog
from billing.models import (
    Expense,
    ExpenseCategory,
    Payment,
    ServiceItem,
    Charge,
    Staff,
    SalaryPayment,
)
from guests.models import Guest
from rooms.models import Room
from tenants.models import Lodge, Membership

from reservations.models import Reservation

User = get_user_model()

class PaymentAuditTests(TestCase):


    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="payment_audit_user",
            password="test-password-123",
        )

        self.lodge = Lodge.objects.create(
            name="Payment Audit Test Lodge",
            address="Test Address",
            phone="08000000000",
            email="payment-audit@test.com",
        )

        Membership.objects.create(
            user=self.user,
            lodge=self.lodge,
            role="Receptionist",
            active=True,
        )

        self.guest = Guest.objects.create(
            lodge=self.lodge,
            full_name="Payment Test Guest",
            phone_number="08000000001",
            active=True,
        )

        self.room = Room.objects.create(
            lodge=self.lodge,
            room_name="Room 201",
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

    def create_payment_payload(self, reservation):
        return {
            "reservation": reservation.id,
            "amount": "25000.00",
            "payment_method": "Transfer",
            "reference": "TRF-TEST-001",
            "notes": "Test payment note",
        }

    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------

    def test_create_payment_creates_payment_and_audit(self):
        reservation = self.create_reservation()

        response = self.client.post(
            reverse("payment-list-create"),
            self.create_payment_payload(reservation),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        payment = Payment.objects.get(
            pk=response.data["id"]
        )

        self.assertEqual(
            payment.reservation_id,
            reservation.id,
        )

        self.assertEqual(
            payment.amount,
            Decimal("25000.00"),
        )

        self.assertEqual(
            payment.recorded_by,
            self.user,
        )

        audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CREATE,
            object_id=str(payment.id),
        ).first()

        self.assertIsNotNone(audit)

        self.assertEqual(
            audit.object_repr,
            str(payment),
        )

        self.assertEqual(
            audit.actor_role,
            "Receptionist",
        )

    # ------------------------------------------------------------------
    # AUDIT CONTENT
    # ------------------------------------------------------------------

    def test_payment_audit_contains_expected_changes_and_details(self):
        reservation = self.create_reservation()

        response = self.client.post(
            reverse("payment-list-create"),
            self.create_payment_payload(reservation),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        payment = Payment.objects.get(
            pk=response.data["id"]
        )

        audit = AuditLog.objects.get(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CREATE,
            object_id=str(payment.id),
        )

        self.assertEqual(
            audit.changes["amount"],
            {
                "from": None,
                "to": "25000.00",
            },
        )

        self.assertEqual(
            audit.changes["payment_method"],
            {
                "from": None,
                "to": "Transfer",
            },
        )

        self.assertEqual(
            audit.changes["reference"],
            {
                "from": None,
                "to": "TRF-TEST-001",
            },
        )

        self.assertEqual(
            audit.details["reservation_id"],
            reservation.id,
        )

        self.assertNotIn(
            "notes",
            audit.changes,
        )

    # ------------------------------------------------------------------
    # CROSS-TENANT PROTECTION
    # ------------------------------------------------------------------

    def test_payment_for_another_lodge_is_rejected_without_payment_or_audit(
        self,
    ):
        reservation = self.create_reservation()

        other_lodge = Lodge.objects.create(
            name="Other Lodge",
            address="Other Address",
            phone="08000000002",
            email="other-lodge@test.com",
        )

        other_user = User.objects.create_user(
            username="other_payment_user",
            password="test-password-123",
        )

        Membership.objects.create(
            user=other_user,
            lodge=other_lodge,
            role="Receptionist",
            active=True,
        )

        self.client.force_authenticate(
            user=other_user
        )

        response = self.client.post(
            reverse("payment-list-create"),
            self.create_payment_payload(reservation),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertFalse(
            Payment.objects.filter(
                reservation=reservation
            ).exists()
        )

        payment_content_type = ContentType.objects.get_for_model(
            Payment
        )

        self.assertFalse(
            AuditLog.objects.filter(
                lodge=self.lodge,
                actor=other_user,
                action=AuditLog.Action.CREATE,
                content_type=payment_content_type,
            ).exists()
        )

    # ------------------------------------------------------------------
    # INVALID PAYMENT
    # ------------------------------------------------------------------

    def test_invalid_payment_creates_no_payment_or_audit(self):
        reservation = self.create_reservation()

        response = self.client.post(
            reverse("payment-list-create"),
            {
                "reservation": reservation.id,
                "amount": "not-a-number",
                "payment_method": "Transfer",
                "reference": "INVALID-001",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertFalse(
            Payment.objects.filter(
                reservation=reservation
            ).exists()
        )

        payment_content_type = ContentType.objects.get_for_model(
            Payment
        )

        self.assertFalse(
            AuditLog.objects.filter(
                lodge=self.lodge,
                actor=self.user,
                action=AuditLog.Action.CREATE,
                content_type=payment_content_type,
            ).exists()
        )

    # ------------------------------------------------------------------
    # TRANSACTION SAFETY
    # ------------------------------------------------------------------

    @patch("billing.views.AuditService.log")
    def test_payment_rolls_back_if_audit_creation_fails(
        self,
        mock_audit_log,
    ):
        reservation = self.create_reservation()

        mock_audit_log.side_effect = RuntimeError(
            "Audit failure"
        )

        with self.assertRaises(RuntimeError):
            self.client.post(
                reverse("payment-list-create"),
                self.create_payment_payload(reservation),
                format="json",
            )

        self.assertFalse(
            Payment.objects.filter(
                reservation=reservation
            ).exists()
        )

        payment_content_type = ContentType.objects.get_for_model(
            Payment
        )

        self.assertFalse(
            AuditLog.objects.filter(
                lodge=self.lodge,
                actor=self.user,
                action=AuditLog.Action.CREATE,
                content_type=payment_content_type,
            ).exists()
        )
        
        self.assertEqual(
            mock_audit_log.call_count,
            3,
        )

        payment_call = mock_audit_log.call_args_list[2]

        self.assertEqual(
            payment_call.kwargs["action"],
            AuditLog.Action.CREATE,
        )

        self.assertEqual(
            payment_call.kwargs["obj"].__class__,
            Payment,
        )
        
class ExpenseAuditTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="expense_audit_user",
            password="test-password-123",
        )

        self.lodge = Lodge.objects.create(
            name="Expense Audit Test Lodge",
            address="Test Address",
            phone="08000000000",
            email="expense-audit@test.com",
        )

        Membership.objects.create(
            user=self.user,
            lodge=self.lodge,
            role="Manager",
            active=True,
        )

        self.category = ExpenseCategory.objects.create(
            lodge=self.lodge,
            name="Utilities",
            description="Utility expenses",
            active=True,
        )

        self.client.force_authenticate(
            user=self.user
        )

    def test_create_expense_creates_expense_and_audit(self):
        response = self.client.post(
            reverse("expense-list-create"),
            {
                "category": self.category.id,
                "date": timezone.localdate().isoformat(),
                "amount": "50000.00",
                "description": "Generator fuel",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        expense = Expense.objects.get(
            pk=response.data["id"]
        )

        self.assertEqual(
            expense.amount,
            Decimal("50000.00"),
        )

        audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CREATE,
            object_id=str(expense.id),
        ).first()

        self.assertIsNotNone(audit)

        self.assertEqual(
            audit.object_repr,
            str(expense),
        )

        self.assertEqual(
            audit.actor_role,
            "Manager",
        )
        
        self.assertEqual(
            audit.changes["category_id"],
            {
                "from": None,
                "to": self.category.id,
            },
        )

        self.assertEqual(
            audit.changes["date"],
            {
                "from": None,
                "to": expense.date.isoformat(),
            },
        )

        self.assertEqual(
            audit.changes["amount"],
            {
                "from": None,
                "to": "50000.00",
            },
        )

        self.assertEqual(
            audit.details["category_name"],
            "Utilities",
        )

        self.assertNotIn(
            "description",
            audit.changes,
        )
        
    def test_update_expense_creates_audit(self):
        response = self.client.post(
            reverse("expense-list-create"),
            {
                "category": self.category.id,
                "date": timezone.localdate().isoformat(),
                "amount": "50000.00",
                "description": "Generator fuel",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        expense_id = response.data["id"]

        response = self.client.patch(
            reverse(
                "expense-detail",
                kwargs={"pk": expense_id},
            ),
            {
                "amount": "60000.00",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.data,
        )

        expense = Expense.objects.get(
            pk=expense_id
        )

        self.assertEqual(
            expense.amount,
            Decimal("60000.00"),
        )

        audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.UPDATE,
            object_id=str(expense.id),
        ).first()

        self.assertIsNotNone(audit)

        self.assertEqual(
            audit.changes["amount"],
            {
                "from": "50000.00",
                "to": "60000.00",
            },
        )
        
    def test_update_expense_audits_only_changed_fields(self):
        response = self.client.post(
            reverse("expense-list-create"),
            {
                "category": self.category.id,
                "date": timezone.localdate().isoformat(),
                "amount": "50000.00",
                "description": "Generator fuel",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        expense_id = response.data["id"]

        response = self.client.patch(
            reverse(
                "expense-detail",
                kwargs={"pk": expense_id},
            ),
            {
                "amount": "60000.00",
                "description": "Diesel purchase",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.data,
        )

        audit = AuditLog.objects.get(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.UPDATE,
            object_id=str(expense_id),
        )

        self.assertEqual(
            audit.changes["amount"],
            {
                "from": "50000.00",
                "to": "60000.00",
            },
        )

        self.assertEqual(
            audit.changes["description"],
            {
                "from": "Generator fuel",
                "to": "Diesel purchase",
            },
        )

        self.assertNotIn(
            "category_id",
            audit.changes,
        )

        self.assertNotIn(
            "date",
            audit.changes,
        )
        
    def test_delete_expense_creates_persistent_audit(self):
        response = self.client.post(
            reverse("expense-list-create"),
            {
                "category": self.category.id,
                "date": timezone.localdate().isoformat(),
                "amount": "50000.00",
                "description": "Generator fuel",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        expense_id = response.data["id"]

        response = self.client.delete(
            reverse(
                "expense-detail",
                kwargs={"pk": expense_id},
            )
        )

        self.assertEqual(
            response.status_code,
            204,
        )

        self.assertFalse(
            Expense.objects.filter(
                pk=expense_id
            ).exists()
        )

        audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.DELETE,
            object_id=str(expense_id),
        ).first()

        self.assertIsNotNone(audit)

        self.assertEqual(
            audit.changes["category_id"],
            self.category.id,
        )

        self.assertEqual(
            audit.changes["date"],
            timezone.localdate().isoformat(),
        )

        self.assertEqual(
            audit.changes["amount"],
            "50000.00",
        )

        self.assertEqual(
            audit.details["category_name"],
            "Utilities",
        )
        
    @patch("billing.views.AuditService.log")
    def test_expense_delete_rolls_back_if_audit_fails(
        self,
        mock_audit_log,
    ):
        response = self.client.post(
            reverse("expense-list-create"),
            {
                "category": self.category.id,
                "date": timezone.localdate().isoformat(),
                "amount": "50000.00",
                "description": "Generator fuel",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        expense_id = response.data["id"]

        mock_audit_log.side_effect = RuntimeError(
            "Audit failure"
        )

        with self.assertRaises(RuntimeError):
            self.client.delete(
                reverse(
                    "expense-detail",
                    kwargs={"pk": expense_id},
                )
            )

        self.assertTrue(
            Expense.objects.filter(
                pk=expense_id
            ).exists()
        )
        
    @patch("billing.views.AuditService.log")
    def test_expense_update_rolls_back_if_audit_fails(
        self,
        mock_audit_log,
    ):
        response = self.client.post(
            reverse("expense-list-create"),
            {
                "category": self.category.id,
                "date": timezone.localdate().isoformat(),
                "amount": "50000.00",
                "description": "Generator fuel",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        expense_id = response.data["id"]

        mock_audit_log.side_effect = RuntimeError(
            "Audit failure"
        )

        with self.assertRaises(RuntimeError):
            self.client.patch(
                reverse(
                    "expense-detail",
                    kwargs={"pk": expense_id},
                ),
                {
                    "amount": "60000.00",
                },
                format="json",
            )

        expense = Expense.objects.get(
            pk=expense_id
        )

        self.assertEqual(
            expense.amount,
            Decimal("50000.00"),
        )
        
    
    def test_expense_from_another_lodge_cannot_be_updated_or_deleted(
        self,
    ):
        response = self.client.post(
            reverse("expense-list-create"),
            {
                "category": self.category.id,
                "date": timezone.localdate().isoformat(),
                "amount": "50000.00",
                "description": "Generator fuel",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        expense_id = response.data["id"]

        other_lodge = Lodge.objects.create(
            name="Other Expense Lodge",
            address="Other Address",
            phone="08000000002",
            email="other-expense@test.com",
        )

        other_user = User.objects.create_user(
            username="other_expense_user",
            password="test-password-123",
        )

        Membership.objects.create(
            user=other_user,
            lodge=other_lodge,
            role="Manager",
            active=True,
        )

        self.client.force_authenticate(
            user=other_user
        )

        update_response = self.client.patch(
            reverse(
                "expense-detail",
                kwargs={"pk": expense_id},
            ),
            {
                "amount": "999999.00",
            },
            format="json",
        )

        self.assertEqual(
            update_response.status_code,
            404,
        )

        delete_response = self.client.delete(
            reverse(
                "expense-detail",
                kwargs={"pk": expense_id},
            )
        )

        self.assertEqual(
            delete_response.status_code,
            404,
        )

        expense = Expense.objects.get(
            pk=expense_id
        )

        self.assertEqual(
            expense.amount,
            Decimal("50000.00"),
        )
        
class ChargeAuditTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="charge_audit_user",
            password="test-password-123",
        )

        self.lodge = Lodge.objects.create(
            name="Charge Audit Test Lodge",
            address="Test Address",
            phone="08000000000",
            email="charge-audit@test.com",
        )

        Membership.objects.create(
            user=self.user,
            lodge=self.lodge,
            role="Manager",
            active=True,
        )

        self.guest = Guest.objects.create(
            lodge=self.lodge,
            full_name="Charge Test Guest",
            phone_number="08000000001",
            active=True,
        )

        self.room = Room.objects.create(
            lodge=self.lodge,
            room_name="Room 301",
            building_location="Main Building",
            room_type="Standard",
            price_per_night=Decimal("50000.00"),
            status="Available",
            maximum_occupancy=2,
            active=True,
        )

        self.service_item = ServiceItem.objects.create(
            lodge=self.lodge,
            category="Food",
            name="Breakfast",
            price=Decimal("5000.00"),
            active=True,
        )

        self.client.force_authenticate(
            user=self.user
        )

    def test_create_charge_creates_charge_and_audit(self):
        check_in = timezone.localdate()
        check_out = check_in + timedelta(days=2)

        reservation_response = self.client.post(
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
            reservation_response.status_code,
            201,
            reservation_response.data,
        )

        reservation = Reservation.objects.get(
            pk=reservation_response.data["id"]
        )

        response = self.client.post(
            reverse("charge-list-create"),
            {
                "reservation": reservation.id,
                "service_item": self.service_item.id,
                "quantity": "2",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        charge = Charge.objects.get(
            pk=response.data["id"]
        )

        self.assertEqual(
            charge.reservation_id,
            reservation.id,
        )

        self.assertEqual(
            charge.service_item_id,
            self.service_item.id,
        )

        self.assertEqual(
            charge.quantity,
            Decimal("2"),
        )

        self.assertEqual(
            charge.unit_price,
            Decimal("5000.00"),
        )

        self.assertEqual(
            charge.total,
            Decimal("10000.00"),
        )

        audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CREATE,
            object_id=str(charge.id),
        ).first()

        self.assertIsNotNone(audit)

        self.assertEqual(
            audit.object_repr,
            str(charge),
        )

        self.assertEqual(
            audit.actor_role,
            "Manager",
        )
        
    def test_create_charge_audit_contains_expected_changes(self):
        check_in = timezone.localdate()
        check_out = check_in + timedelta(days=2)

        reservation_response = self.client.post(
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
            reservation_response.status_code,
            201,
            reservation_response.data,
        )

        reservation = Reservation.objects.get(
            pk=reservation_response.data["id"]
        )

        response = self.client.post(
            reverse("charge-list-create"),
            {
                "reservation": reservation.id,
                "service_item": self.service_item.id,
                "quantity": "2",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        charge = Charge.objects.get(
            pk=response.data["id"]
        )

        audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CREATE,
            object_id=str(charge.id),
        ).filter(
            content_type=ContentType.objects.get_for_model(charge)
        ).get()

        self.assertEqual(
            audit.changes["reservation_id"],
            {
                "from": None,
                "to": reservation.id,
            },
        )

        self.assertEqual(
            audit.changes["service_item_id"],
            {
                "from": None,
                "to": self.service_item.id,
            },
        )

        self.assertEqual(
            audit.changes["category"],
            {
                "from": None,
                "to": "Food",
            },
        )

        self.assertEqual(
            audit.changes["description"],
            {
                "from": None,
                "to": "Breakfast",
            },
        )

        self.assertEqual(
            audit.changes["quantity"],
            {
                "from": None,
                "to": "2",
            },
        )

        self.assertEqual(
            audit.changes["unit_price"],
            {
                "from": None,
                "to": "5000.00",
            },
        )

        self.assertEqual(
            audit.details["total"],
            "10000.00",
        )
        
    def test_create_charge_cross_tenant_is_rejected(self):
        other_lodge = Lodge.objects.create(
            name="Other Lodge",
            address="Other Address",
            phone="08000000002",
            email="other-lodge@test.com",
        )

        other_guest = Guest.objects.create(
            lodge=other_lodge,
            full_name="Other Guest",
            phone_number="08000000003",
            active=True,
        )

        other_room = Room.objects.create(
            lodge=other_lodge,
            room_name="Other Room",
            building_location="Other Building",
            room_type="Standard",
            price_per_night=Decimal("50000.00"),
            status="Available",
            maximum_occupancy=2,
            active=True,
        )

        reservation_response = self.client.post(
            reverse("reservation-list"),
            {
                "guest": self.guest.id,
                "room": self.room.id,
                "check_in_date": timezone.localdate().isoformat(),
                "check_out_date": (
                    timezone.localdate() + timedelta(days=2)
                ).isoformat(),
                "number_of_guests": 1,
                "status": "Reserved",
            },
            format="json",
        )

        self.assertEqual(
            reservation_response.status_code,
            201,
            reservation_response.data,
        )

        reservation = Reservation.objects.get(
            pk=reservation_response.data["id"]
        )

        # Move the reservation to the other lodge directly so that
        # the Charge serializer must reject the cross-tenant request.
        reservation.lodge = other_lodge
        reservation.guest = other_guest
        reservation.room = other_room
        reservation.save(
            update_fields=["lodge", "guest", "room"]
        )

        response = self.client.post(
            reverse("charge-list-create"),
            {
                "reservation": reservation.id,
                "service_item": self.service_item.id,
                "quantity": "1",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
            response.data,
        )

        self.assertFalse(
            Charge.objects.filter(
                reservation=reservation
            ).exists()
        )

        self.assertFalse(
            AuditLog.objects.filter(
                object_id__isnull=False,
                object_id__in=[],
            ).exists()
        )
        
   
    def test_create_charge_rolls_back_if_audit_fails(self):
        check_in = timezone.localdate()
        check_out = check_in + timedelta(days=2)

        reservation_response = self.client.post(
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
            reservation_response.status_code,
            201,
            reservation_response.data,
        )

        reservation = Reservation.objects.get(
            pk=reservation_response.data["id"]
        )

        with patch(
            "billing.views.AuditService.log",
            side_effect=RuntimeError("Audit failure"),
        ):
            with self.assertRaises(RuntimeError):
                self.client.post(
                    reverse("charge-list-create"),
                    {
                        "reservation": reservation.id,
                        "service_item": self.service_item.id,
                        "quantity": "2",
                    },
                    format="json",
                )

        self.assertFalse(
            Charge.objects.filter(
                reservation=reservation,
                service_item=self.service_item,
            ).exists()
        )
        
class SalaryPaymentAuditTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="salary_audit_user",
            password="test-password-123",
        )

        self.lodge = Lodge.objects.create(
            name="Salary Audit Test Lodge",
            address="Test Address",
            phone="08000000000",
            email="salary-audit@test.com",
        )

        Membership.objects.create(
            user=self.user,
            lodge=self.lodge,
            role="Manager",
            active=True,
        )

        self.staff = Staff.objects.create(
            lodge=self.lodge,
            name="Test Staff",
            role="Receptionist",
            phone="08000000001",
            email="staff@test.com",
            employment_date="2026-01-01",
            salary=Decimal("150000.00"),
            active=True,
        )

        self.client.force_authenticate(
            user=self.user
        )

    def test_create_salary_payment_creates_payment_and_audit(self):
        response = self.client.post(
            reverse("salary-payment-list-create"),
            {
                "staff": self.staff.id,
                "amount": "150000.00",
                "payment_date": "2026-08-31",
                "salary_month": "2026-08-15",
                "notes": "August salary",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        salary_payment = SalaryPayment.objects.get(
            staff=self.staff
        )

        audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CREATE,
            object_id=str(salary_payment.id),
        ).filter(
            content_type=ContentType.objects.get_for_model(
                salary_payment
            )
        ).get()

        self.assertEqual(
            audit.actor_role,
            "Manager",
        )
        self.assertEqual(
            audit.object_repr,
            str(salary_payment),
        )

    def test_create_salary_payment_audit_contains_expected_changes(self):
        response = self.client.post(
            reverse("salary-payment-list-create"),
            {
                "staff": self.staff.id,
                "amount": "150000.00",
                "payment_date": "2026-08-31",
                "salary_month": "2026-08-15",
                "notes": "August salary",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        salary_payment = SalaryPayment.objects.get(
            staff=self.staff
        )

        audit = AuditLog.objects.filter(
            lodge=self.lodge,
            actor=self.user,
            action=AuditLog.Action.CREATE,
            object_id=str(salary_payment.id),
        ).filter(
            content_type=ContentType.objects.get_for_model(
                salary_payment
            )
        ).get()

        self.assertEqual(
            audit.changes["staff_id"],
            {
                "from": None,
                "to": self.staff.id,
            },
        )

        self.assertEqual(
            audit.changes["amount"],
            {
                "from": None,
                "to": "150000.00",
            },
        )

        self.assertEqual(
            audit.changes["payment_date"],
            {
                "from": None,
                "to": "2026-08-31",
            },
        )

        self.assertEqual(
            audit.changes["salary_month"],
            {
                "from": None,
                "to": "2026-08-01",
            },
        )

        self.assertEqual(
            audit.details["staff_name"],
            "Test Staff",
        )

        self.assertEqual(
            audit.details["staff_role"],
            "Receptionist",
        )
        
    def test_create_salary_payment_cross_tenant_is_rejected(self):
        other_lodge = Lodge.objects.create(
            name="Other Salary Lodge",
            address="Other Address",
            phone="08000000002",
            email="other-salary@test.com",
        )

        other_staff = Staff.objects.create(
            lodge=other_lodge,
            name="Other Staff",
            role="Receptionist",
            phone="08000000003",
            email="other-staff@test.com",
            employment_date="2026-01-01",
            salary=Decimal("150000.00"),
            active=True,
        )

        response = self.client.post(
            reverse("salary-payment-list-create"),
            {
                "staff": other_staff.id,
                "amount": "150000.00",
                "payment_date": "2026-08-31",
                "salary_month": "2026-08-15",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

        self.assertFalse(
            SalaryPayment.objects.filter(
                staff=other_staff
            ).exists()
        )
        
    def test_create_salary_payment_rolls_back_if_audit_fails(self):
        with patch(
            "billing.views.AuditService.log",
            side_effect=RuntimeError("Audit failure"),
        ):
            with self.assertRaises(RuntimeError):
                self.client.post(
                    reverse("salary-payment-list-create"),
                    {
                        "staff": self.staff.id,
                        "amount": "150000.00",
                        "payment_date": "2026-08-31",
                        "salary_month": "2026-08-15",
                        "notes": "August salary",
                    },
                    format="json",
                )

        self.assertFalse(
            SalaryPayment.objects.filter(
                staff=self.staff,
                salary_month="2026-08-01",
            ).exists()
        )

        self.assertFalse(
            AuditLog.objects.filter(
                lodge=self.lodge,
                actor=self.user,
                action=AuditLog.Action.CREATE,
            ).exists()
        )