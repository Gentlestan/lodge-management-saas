
from rest_framework import serializers

from .models import (
    ServiceItem,
    Charge,
    Payment,
    WalkInOrder,
    WalkInOrderItem,
    WalkInPayment,
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
            "recorded_by",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "recorded_by",
            "created_at",

        ]

    def validate_reservation(self, reservation):
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

        if reservation.lodge_id != membership.lodge_id:
            raise serializers.ValidationError(
                "You cannot make a payment for a reservation from another lodge."
            )

        return reservation


class WalkInOrderItemSerializer(serializers.ModelSerializer):
    total = serializers.ReadOnlyField()

    service_item_name = serializers.CharField(
        source="service_item.name",
        read_only=True,
    )

    class Meta:
        model = WalkInOrderItem
        fields = [
            "id",
            "service_item",
            "service_item_name",
            "quantity",
            "unit_price",
            "total",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "service_item_name",
            "unit_price",
            "total",
            "created_at",
        ]

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "Quantity must be at least 1."
            )
        return value

    def validate(self, attrs):
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

        service_item = attrs.get(
            "service_item",
            self.instance.service_item
            if self.instance
            else None,
        )

        if not service_item:
            raise serializers.ValidationError(
                {
                    "service_item":
                    "A service item is required."
                }
            )

        if service_item.lodge_id != membership.lodge_id:
            raise serializers.ValidationError(
                {
                    "service_item": (
                        "You cannot use a service item "
                        "from another lodge."
                    )
                }
            )

        if not service_item.active:
            raise serializers.ValidationError(
                {
                    "service_item": (
                        "This service item is no longer active."
                    )
                }
            )

        if service_item.category not in ["Food", "Drinks"]:
            raise serializers.ValidationError(
                {
                    "service_item": (
                        "Walk-in orders can only contain "
                        "Food or Drinks."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        service_item = validated_data["service_item"]

        validated_data["unit_price"] = service_item.price

        return WalkInOrderItem.objects.create(
            **validated_data
        )

    def update(self, instance, validated_data):
        service_item = validated_data.get(
            "service_item",
            instance.service_item,
        )

        if service_item != instance.service_item:
            validated_data["unit_price"] = service_item.price

        return super().update(
            instance,
            validated_data,
        )



from rest_framework import serializers

from .models import (
    ServiceItem,
    Charge,
    Payment,
    WalkInOrder,
    WalkInOrderItem,
    WalkInPayment,
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
            "recorded_by",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "recorded_by",
            "created_at",

        ]

    def validate_reservation(self, reservation):
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

        if reservation.lodge_id != membership.lodge_id:
            raise serializers.ValidationError(
                "You cannot make a payment for a reservation from another lodge."
            )

        return reservation

class WalkInOrderSerializer(serializers.ModelSerializer):
    items = WalkInOrderItemSerializer(
        many=True,
        read_only=True,
    )
    total = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()

    class Meta:
        model = WalkInOrder
        fields = [
            "id",
            "customer_name",
            "status",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
            "items",
            "total",
            "total_paid",
            "balance",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
            "items",
            "total",
            "total_paid",
            "balance",
        ]

    def get_total(self, obj):
        return sum(
            item.total
            for item in obj.items.all()
        )

    def get_total_paid(self, obj):
        return sum(
            payment.amount
            for payment in obj.payments.all()
        )

    def get_balance(self, obj):
        total = self.get_total(obj)
        total_paid = self.get_total_paid(obj)
        return total - total_paid

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

        return WalkInOrder.objects.create(
            lodge=membership.lodge,
            created_by=request.user,
            **validated_data,
        )


class WalkInOrderItemSerializer(serializers.ModelSerializer):
    total = serializers.ReadOnlyField()

    service_item_name = serializers.CharField(
        source="service_item.name",
        read_only=True,
    )

    class Meta:
        model = WalkInOrderItem
        fields = [
            "id",
            "service_item",
            "service_item_name",
            "quantity",
            "unit_price",
            "total",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "service_item_name",
            "unit_price",
            "total",
            "created_at",
        ]

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "Quantity must be at least 1."
            )
        return value

    def validate(self, attrs):
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

        service_item = attrs.get(
            "service_item",
            self.instance.service_item
            if self.instance
            else None,
        )

        if not service_item:
            raise serializers.ValidationError(
                {
                    "service_item":
                    "A service item is required."
                }
            )

        if service_item.lodge_id != membership.lodge_id:
            raise serializers.ValidationError(
                {
                    "service_item": (
                        "You cannot use a service item "
                        "from another lodge."
                    )
                }
            )

        if not service_item.active:
            raise serializers.ValidationError(
                {
                    "service_item": (
                        "This service item is no longer active."
                    )
                }
            )

        if service_item.category not in ["Food", "Drinks"]:
            raise serializers.ValidationError(
                {
                    "service_item": (
                        "Walk-in orders can only contain "
                        "Food or Drinks."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        service_item = validated_data["service_item"]

        validated_data["unit_price"] = service_item.price

        return WalkInOrderItem.objects.create(
            **validated_data
        )

    def update(self, instance, validated_data):
        service_item = validated_data.get(
            "service_item",
            instance.service_item,
        )

        if service_item != instance.service_item:
            validated_data["unit_price"] = service_item.price

        return super().update(
            instance,
            validated_data,
        )



class WalkInPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalkInPayment
        fields = [
            "id",
            "order",
            "amount",
            "payment_method",
            "reference",
            "notes",
            "recorded_by",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "recorded_by",
            "created_at",
        ]

    def validate(self, attrs):
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

        order = attrs.get("order")

        if not order:
            raise serializers.ValidationError(
                {"order": "A walk-in order is required."}
            )

        if order.lodge_id != membership.lodge_id:
            raise serializers.ValidationError(
                {
                    "order": (
                        "You cannot make a payment "
                        "for another lodge."
                    )
                }
            )

        if order.status == "Cancelled":
            raise serializers.ValidationError(
                {
                    "order": (
                        "This walk-in order "
                        "has been cancelled."
                    )
                }
            )

        if order.status == "Paid":
            raise serializers.ValidationError(
                {
                    "order": (
                        "This walk-in order "
                        "has already been paid."
                    )
                }
            )

        amount = attrs.get("amount")

        if amount is None or amount <= 0:
            raise serializers.ValidationError(
                {
                    "amount": (
                        "Payment amount must be "
                        "greater than zero."
                    )
                }
            )

        total = sum(
            item.total
            for item in order.items.all()
        )

        paid = sum(
            payment.amount
            for payment in order.payments.all()
        )

        balance = total - paid

        if balance <= 0:
            raise serializers.ValidationError(
                {
                    "order": (
                        "This walk-in order has "
                        "no outstanding balance."
                    )
                }
            )

        if amount > balance:
            raise serializers.ValidationError(
                {
                    "amount": (
                        f"Payment cannot exceed the "
                        f"outstanding balance of "
                        f"₦{balance:,.2f}."
                    )
                }
            )

        return attrs


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




class WalkInPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalkInPayment
        fields = [
            "id",
            "order",
            "amount",
            "payment_method",
            "reference",
            "notes",
            "recorded_by",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "recorded_by",
            "created_at",
        ]

    def validate(self, attrs):
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

        order = attrs.get("order")

        if not order:
            raise serializers.ValidationError(
                {"order": "A walk-in order is required."}
            )

        if order.lodge_id != membership.lodge_id:
            raise serializers.ValidationError(
                {
                    "order": (
                        "You cannot make a payment "
                        "for another lodge."
                    )
                }
            )

        if order.status == "Cancelled":
            raise serializers.ValidationError(
                {
                    "order": (
                        "This walk-in order "
                        "has been cancelled."
                    )
                }
            )

        if order.status == "Paid":
            raise serializers.ValidationError(
                {
                    "order": (
                        "This walk-in order "
                        "has already been paid."
                    )
                }
            )

        amount = attrs.get("amount")

        if amount is None or amount <= 0:
            raise serializers.ValidationError(
                {
                    "amount": (
                        "Payment amount must be "
                        "greater than zero."
                    )
                }
            )

        total = sum(
            item.total
            for item in order.items.all()
        )

        paid = sum(
            payment.amount
            for payment in order.payments.all()
        )

        balance = total - paid

        if balance <= 0:
            raise serializers.ValidationError(
                {
                    "order": (
                        "This walk-in order has "
                        "no outstanding balance."
                    )
                }
            )

        if amount > balance:
            raise serializers.ValidationError(
                {
                    "amount": (
                        f"Payment cannot exceed the "
                        f"outstanding balance of "
                        f"₦{balance:,.2f}."
                    )
                }
            )

        return attrs


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

