from .models import Membership


def get_current_membership(user):
    """
    Returns the active membership of the logged-in user.
    Platform admins (superusers) return None.
    """
    if not user or not user.is_authenticated:
        return None

    if user.is_superuser:
        return None

    return (
        Membership.objects
        .select_related("lodge")
        .filter(user=user, active=True)
        .first()
    )


def get_current_lodge(user):
    """
    Returns the user's lodge or None.
    """
    membership = get_current_membership(user)
    return membership.lodge if membership else None