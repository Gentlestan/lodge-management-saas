
from rest_framework import serializers

from .models import (
    ServiceItem,
    Charge,
    Payment,
    ExpenseCategory,
    Expense,
    Staff,
    SalaryPayment,
)


class ServiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceItem
        fields = [
            "id",
            "name",
            "category",
            "price",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        request = self.context["request"]

        membership = (
            request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            raise serializers.ValidationError(
                "You do not have an active lodge membership."
            )

        validated_data["lodge"] = membership.lodge

        return ServiceItem.objects.create(**validated_data)


class ChargeSerializer(serializers.ModelSerializer):
    total = serializers.ReadOnlyField()

    def create(self, validated_data):
        request = self.context.get("request")

        membership = (
            request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            raise serializers.ValidationError(
                "No active lodge membership found."
            )

        lodge = membership.lodge

        reservation = validated_data.get("reservation")
        service_item = validated_data.get("service_item")

        if reservation and reservation.lodge_id != lodge.id:
            raise serializers.ValidationError(
                {
                    "reservation": (
                        "You cannot create a charge "
                        "for a reservation from another lodge."
                    )
                }
            )

        if service_item and service_item.lodge_id != lodge.id:
            raise serializers.ValidationError(
                {
                    "service_item": (
                        "You cannot use a service item "
                        "from another lodge."
                    )
                }
            )

        if service_item:
            validated_data["category"] = service_item.category
            validated_data["description"] = service_item.name
            validated_data["unit_price"] = service_item.price

        return Charge.objects.create(**validated_data)

    class Meta:
        model = Charge
        fields = [
            "id",
            "reservation",
            "service_item",
            "category",
            "description",
            "quantity",
            "unit_price",
            "total",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "category",
            "description",
            "unit_price",
            "total",
            "created_at",
        ]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "reservation",
            "amount",
            "payment_method",
            "reference",
            "notes",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = [
            "id",
            "name",
            "description",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Category name cannot be empty."
            )

        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authentication is required."
            )

        membership = (
            request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            raise serializers.ValidationError(
                "No active lodge membership found."
            )

        queryset = ExpenseCategory.objects.filter(
            lodge=membership.lodge,
            name__iexact=value,
        )

        if self.instance:
            queryset = queryset.exclude(
                id=self.instance.id
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "An expense category with this name already exists."
            )

        return value

    def create(self, validated_data):
        request = self.context["request"]

        membership = (
            request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            raise serializers.ValidationError(
                "No active lodge membership found."
            )

        return ExpenseCategory.objects.create(
            lodge=membership.lodge,
            **validated_data,
        )


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(
        source="category.name"
    )

    class Meta:
        model = Expense
        fields = [
            "id",
            "category",
            "category_name",
            "date",
            "amount",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "category_name",
            "created_at",
            "updated_at",
        ]

    def validate_category(self, category):
        request = self.context["request"]

        membership = (
            request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            raise serializers.ValidationError(
                "No active lodge membership found."
            )

        if category.lodge_id != membership.lodge_id:
            raise serializers.ValidationError(
                "You cannot use an expense category from another lodge."
            )

        return category


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = [
            "id",
            "name",
            "role",
            "phone",
            "email",
            "employment_date",
            "employment_end_date",
            "salary",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        request = self.context["request"]

        membership = (
            request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            raise serializers.ValidationError(
                "No active lodge membership found."
            )

        return Staff.objects.create(
            lodge=membership.lodge,
            **validated_data,
        )


class SalaryPaymentSerializer(serializers.ModelSerializer):
    staff_name = serializers.ReadOnlyField(
        source="staff.name"
    )

    staff_role = serializers.CharField(
        source="staff.role",
        read_only=True,
    )

    class Meta:
        model = SalaryPayment
        fields = [
            "id",
            "staff",
            "staff_name",
            "staff_role",
            "amount",
            "payment_date",
            "salary_month",
            "notes",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "staff_name",
            "staff_role",
            "created_at",
        ]

    def validate_staff(self, staff):
        request = self.context["request"]

        membership = (
            request.user.memberships.filter(
                active=True
            )
            .select_related("lodge")
            .first()
        )

        if not membership:
            raise serializers.ValidationError(
                "No active lodge membership found."
            )

        if staff.lodge_id != membership.lodge_id:
            raise serializers.ValidationError(
                "You cannot make a salary payment for staff from another lodge."
            )

        return staff

    def validate_salary_month(self, value):
        """
        Normalize salary_month to the first day of the month.

        Example:
        2026-08-01 -> August 2026
        2026-08-15 -> August 2026
        2026-08-31 -> August 2026
        """

        return value.replace(day=1)

    def validate(self, attrs):
        staff = attrs.get("staff")

        # During an update, use the existing staff if staff
        # wasn't included in the request.
        if staff is None and self.instance:
            staff = self.instance.staff

        salary_month = attrs.get("salary_month")

        # During an update, use the existing salary month if
        # salary_month wasn't included in the request.
        if salary_month is None and self.instance:
            salary_month = self.instance.salary_month

        if staff and salary_month:
            queryset = SalaryPayment.objects.filter(
                staff=staff,
                salary_month=salary_month,
            )

            # Exclude the current record when editing.
            if self.instance:
                queryset = queryset.exclude(
                    id=self.instance.id
                )

            if queryset.exists():
                raise serializers.ValidationError(
                    {
                        "salary_month": (
                            f"{staff.name} already has a salary payment "
                            f"for {salary_month.strftime('%B %Y')}."
                        )
                    }
                )

        return attrs

