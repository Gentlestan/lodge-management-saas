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


class ChargeSerializer(serializers.ModelSerializer):
    total = serializers.ReadOnlyField()

    def create(self, validated_data):
        service_item = validated_data.get("service_item")

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

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Category name cannot be empty."
            )

        queryset = ExpenseCategory.objects.filter(
            name__iexact=value
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
        
class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = [
            "id",
            "name",
            "role",
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


class SalaryPaymentSerializer(serializers.ModelSerializer):
    staff_name = serializers.ReadOnlyField(
        source="staff.name"
    )
    
    staff_role = serializers.CharField(
        source="staff.role",
        read_only=True
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
            "created_at",
        ]       