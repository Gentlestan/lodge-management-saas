
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from rest_framework import serializers

from tenants.models import Membership


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        user = authenticate(
            username=username,
            password=password,
        )

        if not user:
            raise serializers.ValidationError(
                "Invalid username or password."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "This account is inactive."
            )

        attrs["user"] = user

        return attrs


class UserAccountSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=[
            ("Manager", "Manager"),
            ("Receptionist", "Receptionist"),
        ]
    )

    active = serializers.BooleanField(
        source="membership_active"
    )

    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "role",
            "active",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        role = validated_data.pop("role")
        active = validated_data.pop("membership_active")
        password = validated_data.pop("password", None)

        if not password:
            raise serializers.ValidationError(
                {
                    "password": "Password is required."
                }
            )

        request = self.context["request"]

        owner_membership = (
            request.user.memberships
            .filter(
                active=True,
                role="Owner",
            )
            .select_related("lodge")
            .first()
        )

        if not owner_membership:
            raise serializers.ValidationError(
                "Only lodge owners can create user accounts."
            )

        lodge = owner_membership.lodge

        username = validated_data.get("username")
        email = validated_data.get("email", "")

        if User.objects.filter(
            username=username
        ).exists():
            raise serializers.ValidationError(
                {
                    "username":
                    "A user with this username already exists."
                }
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        user.is_active = active
        user.save(update_fields=["is_active"])

        Membership.objects.create(
            user=user,
            lodge=lodge,
            role=role,
            active=active,
        )

        return user

    def update(self, instance, validated_data):
        role = validated_data.pop(
            "role",
            None,
        )

        active = validated_data.pop(
            "membership_active",
            None,
        )

        password = validated_data.pop(
            "password",
            None,
        )

        instance.username = validated_data.get(
            "username",
            instance.username,
        )

        instance.email = validated_data.get(
            "email",
            instance.email,
        )

        if password:
            instance.set_password(password)

        if active is not None:
            instance.is_active = active

        instance.save()

        membership = self.context["membership"]

        if membership:
            if role:
                membership.role = role

            if active is not None:
                membership.active = active

            membership.save()

        return instance

