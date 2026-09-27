from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from tenants.models import Lodge, Membership

from .models import AuditLog
from .services import AuditService


User = get_user_model()


class AuditServiceTests(TestCase):
    def setUp(self):
        self.lodge = Lodge.objects.create(
            name="Test Lodge",
        )

        self.other_lodge = Lodge.objects.create(
            name="Other Lodge",
        )

        self.user = User.objects.create_user(
            username="testuser",
            password="testpassword123",
        )

        Membership.objects.create(
            user=self.user,
            lodge=self.lodge,
            role="Receptionist",
            active=True,
        )

        Membership.objects.create(
            user=self.user,
            lodge=self.other_lodge,
            role="Manager",
            active=True,
        )

    def test_creates_audit_entry(self):
        audit = AuditService.log(
            actor=self.user,
            lodge=self.lodge,
            action=AuditLog.Action.CREATE,
            details={
                "source": "Front Desk",
            },
        )

        self.assertEqual(audit.actor, self.user)
        self.assertEqual(audit.lodge, self.lodge)
        self.assertEqual(audit.actor_role, "Receptionist")
        self.assertEqual(audit.action, AuditLog.Action.CREATE)
        self.assertEqual(audit.details["source"], "Front Desk")
        self.assertEqual(audit.changes, {})

    def test_records_object_information(self):
        audit = AuditService.log(
            actor=self.user,
            lodge=self.lodge,
            action=AuditLog.Action.UPDATE,
            obj=self.lodge,
            changes={
                "name": {
                    "from": "Test Lodge",
                    "to": "Updated Lodge",
                },
            },
        )

        expected_content_type = ContentType.objects.get_for_model(
            self.lodge,
            for_concrete_model=False,
        )

        self.assertEqual(audit.content_type, expected_content_type)
        self.assertEqual(audit.object_id, str(self.lodge.pk))
        self.assertEqual(audit.object_repr, str(self.lodge))
        self.assertEqual(
            audit.changes["name"]["from"],
            "Test Lodge",
        )
        self.assertEqual(
            audit.changes["name"]["to"],
            "Updated Lodge",
        )

    def test_system_event_without_object(self):
        audit = AuditService.log(
            actor=self.user,
            lodge=self.lodge,
            action=AuditLog.Action.UPDATE,
            obj=None,
            details={
                "source": "System",
            },
        )

        self.assertIsNone(audit.content_type)
        self.assertIsNone(audit.object_id)
        self.assertEqual(audit.object_repr, "")
        self.assertEqual(audit.details["source"], "System")

    def test_sensitive_fields_are_removed(self):
        audit = AuditService.log(
            actor=self.user,
            lodge=self.lodge,
            action=AuditLog.Action.UPDATE,
            changes={
                "password": {
                    "from": "old-password",
                    "to": "new-password",
                },
                "id_number": {
                    "from": "OLD123",
                    "to": "NEW456",
                },
                "email": {
                    "from": "old@example.com",
                    "to": "new@example.com",
                },
            },
            details={
                "nested": {
                    "password": "secret",
                    "id_number": "SECRET-ID",
                    "source": "Account Management",
                },
            },
        )

        self.assertNotIn("password", audit.changes)
        self.assertNotIn("id_number", audit.changes)
        self.assertIn("email", audit.changes)

        self.assertNotIn("password", audit.details["nested"])
        self.assertNotIn("id_number", audit.details["nested"])
        self.assertEqual(
            audit.details["nested"]["source"],
            "Account Management",
        )

    def test_requires_lodge(self):
        with self.assertRaises(ValueError):
            AuditService.log(
                actor=self.user,
                lodge=None,
                action=AuditLog.Action.CREATE,
            )

    def test_rejects_invalid_action(self):
        with self.assertRaises(ValueError):
            AuditService.log(
                actor=self.user,
                lodge=self.lodge,
                action="NOT_A_REAL_ACTION",
            )

    def test_superuser_role_is_recorded(self):
        superuser = User.objects.create_superuser(
            username="admin",
            password="adminpassword123",
        )

        audit = AuditService.log(
            actor=superuser,
            lodge=self.lodge,
            action=AuditLog.Action.UPDATE,
        )

        self.assertEqual(audit.actor_role, "Superuser")

    def test_role_is_taken_from_supplied_lodge(self):
        audit = AuditService.log(
            actor=self.user,
            lodge=self.other_lodge,
            action=AuditLog.Action.UPDATE,
        )

        self.assertEqual(audit.actor_role, "Manager")
        

class AuditLogAPITests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.owner = User.objects.create_user(
            username="audit_owner",
            password="test-password-123",
        )

        self.manager = User.objects.create_user(
            username="audit_manager",
            password="test-password-123",
        )

        self.lodge = Lodge.objects.create(
            name="Audit API Test Lodge",
            address="Test Address",
            phone="08000000000",
            email="audit-api@test.com",
        )

        Membership.objects.create(
            user=self.owner,
            lodge=self.lodge,
            role="Owner",
            active=True,
        )

        Membership.objects.create(
            user=self.manager,
            lodge=self.lodge,
            role="Manager",
            active=True,
        )

    def test_owner_can_access_audit_logs(self):
        AuditLog.objects.create(
            lodge=self.lodge,
            actor=self.owner,
            actor_role="Owner",
            action=AuditLog.Action.CREATE,
            object_repr="Test Object",
            details={"test": True},
        )

        self.client.force_authenticate(
            user=self.owner
        )

        response = self.client.get(
            reverse("audit-log-list")
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["object_repr"],
            "Test Object",
        )

    def test_manager_cannot_access_audit_logs(self):
        self.client.force_authenticate(
            user=self.manager
        )

        response = self.client.get(
            reverse("audit-log-list")
        )

        self.assertEqual(response.status_code, 403)
        
    def test_owner_only_sees_audit_logs_for_own_lodge(self):
        other_owner = User.objects.create_user(
            username="other_audit_owner",
            password="test-password-123",
        )

        other_lodge = Lodge.objects.create(
            name="Other Audit Lodge",
            address="Other Address",
            phone="08000000001",
            email="other-audit@test.com",
        )

        Membership.objects.create(
            user=other_owner,
            lodge=other_lodge,
            role="Owner",
            active=True,
        )

        AuditLog.objects.create(
            lodge=self.lodge,
            actor=self.owner,
            actor_role="Owner",
            action=AuditLog.Action.CREATE,
            object_repr="Own Lodge Record",
        )

        AuditLog.objects.create(
            lodge=other_lodge,
            actor=other_owner,
            actor_role="Owner",
            action=AuditLog.Action.CREATE,
            object_repr="Other Lodge Record",
        )

        self.client.force_authenticate(
            user=self.owner
        )

        response = self.client.get(
            reverse("audit-log-list")
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["object_repr"],
            "Own Lodge Record",
        )