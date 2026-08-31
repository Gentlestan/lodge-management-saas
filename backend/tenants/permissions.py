from rest_framework.permissions import BasePermission

from .models import Membership


class IsLodgeMember(BasePermission):
    """
    Allows access only to authenticated users
    who belong to an active lodge.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        return Membership.objects.filter(
            user=request.user,
            active=True,
        ).exists()


class IsRoomManagerOrOwner(BasePermission):
    """
    Owner and Manager can fully manage rooms.
    Receptionist can view rooms and perform
    permitted operational status actions.
    """

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True

        membership = Membership.objects.filter(
            user=request.user,
            active=True,
        ).first()

        if not membership:
            return False

        # Everyone in the lodge can view rooms.
        if view.action in ["list", "retrieve"]:
            return True

        # Receptionist can perform operational
        # room status actions.
        if view.action == "mark_available":
            return membership.role in [
                "Owner",
                "Manager",
                "Receptionist",
            ]

        # Creating, editing, deleting, etc.
        # remains restricted to Owner and Manager.
        return membership.role in ["Owner", "Manager"]


class IsServiceItemManagerOrOwner(BasePermission):
    """
    Receptionist can only view service items.
    Owner and Manager can create, edit and deactivate them.
    """

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True

        membership = Membership.objects.filter(
            user=request.user,
            active=True,
        ).first()

        if not membership:
            return False

        # Everyone can view
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return True

        # Only Owner & Manager can modify
        return membership.role in ["Owner", "Manager"]


class IsExpenseCategoryManagerOrOwner(BasePermission):
    """
    Receptionist can only view expense categories.
    Owner and Manager can create, edit and deactivate them.
    """

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True

        membership = Membership.objects.filter(
            user=request.user,
            active=True,
        ).first()

        if not membership:
            return False

        # Everyone can view
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return True

        # Only Owner & Manager can modify
        return membership.role in ["Owner", "Manager"]
    
class IsExpenseManagerOrOwner(BasePermission):
    """
    Owner and Manager can fully manage expenses.
    Receptionist can view and create expenses,
    but cannot edit or deactivate them.
    """

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True

        membership = Membership.objects.filter(
            user=request.user,
            active=True,
        ).first()

        if not membership:
            return False

        # Everyone in the lodge can view expenses.
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return True

        # Everyone can create expenses.
        if request.method == "POST":
            return True

        # Only Owner & Manager can modify existing expenses.
        return membership.role in ["Owner", "Manager"]
    
class IsStaffManagerOrOwner(BasePermission):
    """
    Receptionist can only view staff.
    Owner and Manager can create, edit and deactivate staff.
    """

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True

        membership = Membership.objects.filter(
            user=request.user,
            active=True,
        ).first()

        if not membership:
            return False

        # Everyone can view staff
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return True

        # Only Owner & Manager can modify staff
        return membership.role in ["Owner", "Manager"]
    
class IsSalaryPaymentManagerOrOwner(BasePermission):
    """
    Only Owner and Manager can view or record salary payments.
    Receptionist has no access.
    """

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True

        membership = Membership.objects.filter(
            user=request.user,
            active=True,
        ).first()

        if not membership:
            return False

        return membership.role in ["Owner", "Manager"]