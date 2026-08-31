
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .serializers import LoginSerializer, UserAccountSerializer
from tenants.models import Membership


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        membership = (
            Membership.objects
            .select_related("lodge")
            .filter(
                user=user,
                active=True,
            )
            .first()
        )

        if not membership:
            return Response(
                {
                    "detail": "You do not belong to an active lodge."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                },
                "lodge": {
                    "id": membership.lodge.id,
                    "name": membership.lodge.name,
                },
                "role": membership.role,
            }
        )


class OwnerAccountManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def get_owner_membership(self, request):
        return (
            Membership.objects
            .select_related("lodge")
            .filter(
                user=request.user,
                active=True,
                role="Owner",
            )
            .first()
        )

    def get(self, request):
        membership = self.get_owner_membership(request)

        if not membership:
            return Response(
                {
                    "detail": "Only lodge owners can manage user accounts."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        memberships = (
            Membership.objects
            .select_related("user")
            .filter(
                lodge=membership.lodge,
                role__in=["Manager", "Receptionist"],
            )
            .order_by("user__username")
        )

        users = []

        for user_membership in memberships:
            users.append(
                {
                    "id": user_membership.user.id,
                    "username": user_membership.user.username,
                    "email": user_membership.user.email,
                    "role": user_membership.role,
                    "active": user_membership.active,
                }
            )

        return Response(users)

    def post(self, request):
        membership = self.get_owner_membership(request)

        if not membership:
            return Response(
                {
                    "detail": "Only lodge owners can manage user accounts."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = UserAccountSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        created_membership = (
            user.memberships
            .select_related("lodge")
            .filter(
                lodge=membership.lodge,
            )
            .first()
        )

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": created_membership.role,
                "active": created_membership.active,
            },
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        membership = self.get_owner_membership(request)

        if not membership:
            return Response(
                {
                    "detail": "Only lodge owners can manage user accounts."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        user_id = request.data.get("id")

        if not user_id:
            return Response(
                {
                    "detail": "User id is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_membership = (
            Membership.objects
            .select_related("user")
            .filter(
                user_id=user_id,
                lodge=membership.lodge,
                role__in=["Manager", "Receptionist"],
            )
            .first()
        )

        if not target_membership:
            return Response(
                {
                    "detail": "User account not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )
            
        if target_membership.user == request.user:
            return Response(
                {
                    "detail": "You cannot modify your own owner account here."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = UserAccountSerializer(
            target_membership.user,
            data=request.data,
            partial=True,
            context={
                "request": request,
                "membership": target_membership,
            },
        )

        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": target_membership.role,
                "active": target_membership.active,
            }
        )
