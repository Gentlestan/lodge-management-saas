import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/router";

import { apiFetch, getAuth } from "@/lib/auth";

type ServiceItem = {
  id: number;
  name: string;
  category: string;
  price?: number | string;
  unit_price?: number | string;
  active: boolean;
};

type WalkInOrderItem = {
  id: number;
  service_item: number;
  service_item_name: string;
  quantity: number;
  unit_price: number | string;
  total: number;
  created_at: string;
};

type WalkInOrder = {
  id: number;
  customer_name: string;
  status: string;
  notes: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  items: WalkInOrderItem[];
  total: number;
  total_paid: number;
  balance: number;
};

type WalkInPayment = {
  id: number;
  order: number;
  amount: number | string;
  payment_method: string;
  reference: string;
  notes: string;
  recorded_by: number | null;
  created_at: string;
};

const PAYMENT_METHODS = [
  "Cash",
  "Transfer",
  "POS",
  "Other",
];

const formatCurrency = (
  value: number | string | null | undefined
) => {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDateTime = (value: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-NG");
};

const getServiceItemPrice = (item: ServiceItem) => {
  return Number(item.price ?? item.unit_price ?? 0);
};

export default function FoodDrinksPage() {
  const router = useRouter();

  // ------------------------------------------------------------
  // AUTH
  // ------------------------------------------------------------

  const [authorized, setAuthorized] = useState(false);

  // ------------------------------------------------------------
  // GENERAL
  // ------------------------------------------------------------

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ------------------------------------------------------------
  // SERVICE ITEMS
  // ------------------------------------------------------------

  const [serviceItems, setServiceItems] = useState<
    ServiceItem[]
  >([]);

  // ------------------------------------------------------------
  // ORDERS
  // ------------------------------------------------------------

  const [orders, setOrders] = useState<WalkInOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] =
    useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] =
    useState<WalkInOrder | null>(null);

  // ------------------------------------------------------------
  // ORDER FILTERS
  // ------------------------------------------------------------

  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] =
    useState("All");
  const [orderDateFilter, setOrderDateFilter] =
    useState("Today");

    const getTodayDateInput = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const [orderCustomDate, setOrderCustomDate] =
  useState(getTodayDateInput());

  // ------------------------------------------------------------
  // NEW ORDER
  // ------------------------------------------------------------

  const [customerName, setCustomerName] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [creatingOrder, setCreatingOrder] =
    useState(false);

  // ------------------------------------------------------------
  // EDIT ORDER
  // ------------------------------------------------------------

  const [editingOrder, setEditingOrder] =
    useState(false);
  const [editCustomerName, setEditCustomerName] =
    useState("");
  const [editOrderNotes, setEditOrderNotes] =
    useState("");
  const [savingOrder, setSavingOrder] =
    useState(false);

  // ------------------------------------------------------------
  // ADD ITEM TO CURRENT ORDER
  // ------------------------------------------------------------

  const [selectedServiceItemId, setSelectedServiceItemId] =
    useState("");
  const [itemQuantity, setItemQuantity] =
    useState("1");
  const [addingItem, setAddingItem] =
    useState(false);

  // ------------------------------------------------------------
  // EDIT ITEM QUANTITY
  // ------------------------------------------------------------

  const [editingItemId, setEditingItemId] =
    useState<number | null>(null);
  const [editItemQuantity, setEditItemQuantity] =
    useState("");
  const [updatingItemId, setUpdatingItemId] =
    useState<number | null>(null);

  // ------------------------------------------------------------
  // CANCEL ORDER
  // ------------------------------------------------------------

  const [cancellingOrder, setCancellingOrder] =
    useState(false);

  // ------------------------------------------------------------
  // PAYMENTS
  // ------------------------------------------------------------

  const [payments, setPayments] = useState<
    WalkInPayment[]
  >([]);

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("Cash");

  const [paymentReference, setPaymentReference] =
    useState("");

  const [paymentNotes, setPaymentNotes] =
    useState("");

  const [recordingPayment, setRecordingPayment] =
    useState(false);

  // ------------------------------------------------------------
  // AUTH
  // ------------------------------------------------------------

  useEffect(() => {
    const auth = getAuth();

    if (!auth) {
      router.replace("/login");
      return;
    }

    if (
      auth.role !== "Owner" &&
      auth.role !== "Manager" &&
      auth.role !== "Receptionist"
    ) {
      router.replace("/dashboard");
      return;
    }

    setAuthorized(true);
  }, [router]);

  // ------------------------------------------------------------
  // LOAD SERVICE ITEMS
  // ------------------------------------------------------------

  useEffect(() => {
    if (!authorized) {
      return;
    }

    const fetchServiceItems = async () => {
      try {
        const response = await apiFetch(
          "/api/billing/service-items/?active=true"
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load food and drinks items."
          );
        }

        const data: ServiceItem[] =
          await response.json();

        const foodAndDrinks = data.filter(
          (item) =>
            item.active &&
            (item.category === "Food" ||
              item.category === "Drinks")
        );

        setServiceItems(foodAndDrinks);

        if (
          foodAndDrinks.length > 0 &&
          !selectedServiceItemId
        ) {
          setSelectedServiceItemId(
            String(foodAndDrinks[0].id)
          );
        }
      } catch (error) {
        console.error(error);

        setError(
          "Unable to load food and drinks items."
        );
      }
    };

    fetchServiceItems();
  }, [authorized, selectedServiceItemId]);

  // ------------------------------------------------------------
  // LOAD ORDERS
  // ------------------------------------------------------------

  const fetchOrders = async () => {
    if (!authorized) {
      return;
    }

    try {
      const params = new URLSearchParams();

     if (orderDateFilter === "Today") {
        params.set("date", "today");
        } else if (orderDateFilter === "All") {
        params.set("date", "all");
        } else if (
        orderDateFilter === "Custom" &&
        orderCustomDate
        ) {
        params.set("date", orderCustomDate);
        }

      if (orderStatusFilter !== "All") {
        params.set(
          "status",
          orderStatusFilter
        );
      }

      if (orderSearch.trim()) {
        params.set(
          "search",
          orderSearch.trim()
        );
      }

      const response = await apiFetch(
        `/api/billing/walk-in-orders/?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load walk-in orders."
        );
      }

      const data: WalkInOrder[] =
        await response.json();

      setOrders(data);

      // Automatically select newest order.
      if (data.length > 0) {
        const selectedStillExists = data.some(
          (order) =>
            order.id === selectedOrderId
        );

        if (
          !selectedOrderId ||
          !selectedStillExists
        ) {
          setSelectedOrderId(data[0].id);
        }
      } else {
        setSelectedOrderId(null);
      }
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load walk-in orders."
      );
    }
  };

  // ------------------------------------------------------------
  // ORDER FILTER EFFECT
  // ------------------------------------------------------------

  useEffect(() => {
    if (!authorized) {
      return;
    }

    const timeout = window.setTimeout(() => {
      fetchOrders();
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    authorized,
    orderDateFilter,
    orderCustomDate,
    orderStatusFilter,
    orderSearch,
  ]);

  // ------------------------------------------------------------
  // INITIAL PAGE LOADING
  // ------------------------------------------------------------

  useEffect(() => {
    if (!authorized) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setLoading(false);
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [authorized]);

  // ------------------------------------------------------------
  // LOAD ONE ORDER
  // ------------------------------------------------------------

  const fetchSelectedOrder = async (
    orderId: number
  ) => {
    try {
      setError("");

      const [
        orderResponse,
        paymentsResponse,
      ] = await Promise.all([
        apiFetch(
          `/api/billing/walk-in-orders/${orderId}/`
        ),
        apiFetch(
          `/api/billing/walk-in-payments/?order=${orderId}`
        ),
      ]);

      if (!orderResponse.ok) {
        throw new Error(
          "Failed to load the selected order."
        );
      }

      if (!paymentsResponse.ok) {
        throw new Error(
          "Failed to load order payments."
        );
      }

      const orderData: WalkInOrder =
        await orderResponse.json();

      const paymentsData: WalkInPayment[] =
        await paymentsResponse.json();

      setSelectedOrder(orderData);
      setPayments(paymentsData);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load selected order."
      );
    }
  };

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrder(null);
      setPayments([]);
      return;
    }

    fetchSelectedOrder(selectedOrderId);
  }, [selectedOrderId]);

  // ------------------------------------------------------------
  // CREATE ORDER
  // ------------------------------------------------------------

  const handleCreateOrder = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    setCreatingOrder(true);
    setError("");

    try {
      const response = await apiFetch(
        "/api/billing/walk-in-orders/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_name:
              customerName.trim(),
            notes: orderNotes.trim(),
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Failed to create walk-in order."
        );
      }

      const createdOrder =
        data as WalkInOrder;

      setCustomerName("");
      setOrderNotes("");

      setSelectedOrderId(
        createdOrder.id
      );

      await fetchOrders();
      await fetchSelectedOrder(
        createdOrder.id
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to create walk-in order."
      );
    } finally {
      setCreatingOrder(false);
    }
  };

  // ------------------------------------------------------------
  // START EDIT ORDER
  // ------------------------------------------------------------

  const handleStartEditOrder = () => {
    if (!selectedOrder) {
      return;
    }

    if (selectedOrder.status !== "Open") {
      setError(
        "Only open orders can be edited."
      );
      return;
    }

    setEditCustomerName(
      selectedOrder.customer_name || ""
    );

    setEditOrderNotes(
      selectedOrder.notes || ""
    );

    setEditingOrder(true);
    setError("");
  };

  // ------------------------------------------------------------
  // CANCEL EDIT ORDER
  // ------------------------------------------------------------

  const handleCancelEditOrder = () => {
    setEditingOrder(false);

    setEditCustomerName("");
    setEditOrderNotes("");
  };

  // ------------------------------------------------------------
  // SAVE ORDER EDIT
  // ------------------------------------------------------------

  const handleSaveOrder = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (!selectedOrder) {
      return;
    }

    if (selectedOrder.status !== "Open") {
      setError(
        "Only open orders can be edited."
      );
      return;
    }

    setSavingOrder(true);
    setError("");

    try {
      const response = await apiFetch(
        `/api/billing/walk-in-orders/${selectedOrder.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_name:
              editCustomerName.trim(),
            notes:
              editOrderNotes.trim(),
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Failed to update the order."
        );
      }

      setEditingOrder(false);
      setEditCustomerName("");
      setEditOrderNotes("");

      await fetchSelectedOrder(
        selectedOrder.id
      );

      await fetchOrders();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update order."
      );
    } finally {
      setSavingOrder(false);
    }
  };

  // ------------------------------------------------------------
  // ADD ITEM
  // ------------------------------------------------------------

  const handleAddItem = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (!selectedOrder) {
      setError(
        "Create or select an order first."
      );
      return;
    }

    if (selectedOrder.status !== "Open") {
      setError(
        "Items can only be added to an open order."
      );
      return;
    }

    const totalPaid = Number(
      selectedOrder.total_paid ?? 0
    );

    if (totalPaid > 0) {
      setError(
        "This order already has a payment. The current order cannot be changed after payment has started."
      );
      return;
    }

    const quantity = Number(itemQuantity);

    if (
      !selectedServiceItemId ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      setError(
        "Select an item and enter a valid quantity."
      );
      return;
    }

    setAddingItem(true);
    setError("");

    try {
      const response = await apiFetch(
        `/api/billing/walk-in-orders/${selectedOrder.id}/items/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            service_item:
              Number(selectedServiceItemId),
            quantity,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Failed to add item to the order."
        );
      }

      setItemQuantity("1");

      await fetchSelectedOrder(
        selectedOrder.id
      );

      await fetchOrders();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to add item."
      );
    } finally {
      setAddingItem(false);
    }
  };

  // ------------------------------------------------------------
  // START EDIT ITEM
  // ------------------------------------------------------------

  const handleStartEditItem = (
    item: WalkInOrderItem
  ) => {
    if (!selectedOrder) {
      return;
    }

    if (selectedOrder.status !== "Open") {
      setError(
        "Only open orders can be changed."
      );
      return;
    }

    const totalPaid = Number(
      selectedOrder.total_paid ?? 0
    );

    if (totalPaid > 0) {
      setError(
        "This order already has a payment. Items cannot be changed after payment has started."
      );
      return;
    }

    setEditingItemId(item.id);
    setEditItemQuantity(
      String(item.quantity)
    );
    setError("");
  };

  // ------------------------------------------------------------
  // CANCEL ITEM EDIT
  // ------------------------------------------------------------

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditItemQuantity("");
  };

  // ------------------------------------------------------------
  // UPDATE ITEM QUANTITY
  // ------------------------------------------------------------

  const handleUpdateItemQuantity = async (
    itemId: number
  ) => {
    if (!selectedOrder) {
      return;
    }

    if (selectedOrder.status !== "Open") {
      setError(
        "Only open orders can be changed."
      );
      return;
    }

    const totalPaid = Number(
      selectedOrder.total_paid ?? 0
    );

    if (totalPaid > 0) {
      setError(
        "This order already has a payment. Items cannot be changed after payment has started."
      );
      return;
    }

    const quantity = Number(
      editItemQuantity
    );

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      setError(
        "Enter a valid quantity."
      );
      return;
    }

    setUpdatingItemId(itemId);
    setError("");

    try {
      const response = await apiFetch(
        `/api/billing/walk-in-order-items/${itemId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quantity,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Failed to update item quantity."
        );
      }

      setEditingItemId(null);
      setEditItemQuantity("");

      await fetchSelectedOrder(
        selectedOrder.id
      );

      await fetchOrders();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update item quantity."
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  // ------------------------------------------------------------
  // REMOVE ITEM
  // ------------------------------------------------------------

  const handleDeleteItem = async (
    itemId: number
  ) => {
    if (!selectedOrder) {
      return;
    }

    if (selectedOrder.status !== "Open") {
      setError(
        "Paid or cancelled orders cannot be changed."
      );
      return;
    }

    const totalPaid = Number(
      selectedOrder.total_paid ?? 0
    );

    if (totalPaid > 0) {
      setError(
        "This order already has a payment. Items cannot be changed after payment has started."
      );
      return;
    }

    const confirmed = window.confirm(
      "Remove this item from the order?"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const response = await apiFetch(
        `/api/billing/walk-in-order-items/${itemId}/`,
        {
          method: "DELETE",
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Failed to remove the item."
        );
      }

      await fetchSelectedOrder(
        selectedOrder.id
      );

      await fetchOrders();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to remove item."
      );
    }
  };

  // ------------------------------------------------------------
  // CANCEL ORDER
  // ------------------------------------------------------------

  const handleCancelOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    if (selectedOrder.status !== "Open") {
      setError(
        "Only open orders can be cancelled."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel Order #${selectedOrder.id}?`
    );

    if (!confirmed) {
      return;
    }

    setCancellingOrder(true);
    setError("");

    try {
      const response = await apiFetch(
        `/api/billing/walk-in-orders/${selectedOrder.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "Cancelled",
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Failed to cancel the order."
        );
      }

      setEditingOrder(false);
      setEditingItemId(null);
      setEditItemQuantity("");

      await fetchOrders();

      await fetchSelectedOrder(
        selectedOrder.id
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to cancel order."
      );
    } finally {
      setCancellingOrder(false);
    }
  };

  // ------------------------------------------------------------
  // RECORD PAYMENT
  // ------------------------------------------------------------

  const handleRecordPayment = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (!selectedOrder) {
      setError(
        "Select an order first."
      );
      return;
    }

    if (selectedOrder.status !== "Open") {
      setError(
        "This order cannot receive another payment."
      );
      return;
    }

    const amount = Number(paymentAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Enter a valid payment amount."
      );
      return;
    }

    const balance = Number(
      selectedOrder.balance ?? 0
    );

    if (amount > balance) {
      setError(
        `Payment cannot exceed the remaining balance of ${formatCurrency(
          balance
        )}.`
      );
      return;
    }

    setRecordingPayment(true);
    setError("");

    try {
      const response = await apiFetch(
        `/api/billing/walk-in-payments/?order=${selectedOrder.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order: selectedOrder.id,
            amount,
            payment_method:
              paymentMethod,
            reference:
              paymentReference.trim(),
            notes:
              paymentNotes.trim(),
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Failed to record payment."
        );
      }

      setPaymentAmount("");
      setPaymentMethod("Cash");
      setPaymentReference("");
      setPaymentNotes("");

      await fetchSelectedOrder(
        selectedOrder.id
      );

      await fetchOrders();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to record payment."
      );
    } finally {
      setRecordingPayment(false);
    }
  };

  // ------------------------------------------------------------
  // CURRENT ITEM PREVIEW
  // ------------------------------------------------------------

  const selectedServiceItem =
    serviceItems.find(
      (item) =>
        String(item.id) ===
        selectedServiceItemId
    ) || null;

  const selectedItemPrice =
    selectedServiceItem
      ? getServiceItemPrice(
          selectedServiceItem
        )
      : 0;

  const quantityPreview =
    Number(itemQuantity);

  const previewTotal =
    Number.isFinite(quantityPreview) &&
    quantityPreview > 0
      ? selectedItemPrice *
        quantityPreview
      : 0;

  // ------------------------------------------------------------
  // DERIVED ORDER PERMISSIONS
  // ------------------------------------------------------------

  const orderHasPayment =
    Number(
      selectedOrder?.total_paid ?? 0
    ) > 0;

  const canEditOrder =
    selectedOrder?.status === "Open";

  const canEditItems =
    selectedOrder?.status === "Open" &&
    !orderHasPayment;

  // ------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------

  if (!authorized || loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-gray-600">
              Loading Food & Drinks...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------------
  // PAGE
  // ------------------------------------------------------------

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Food & Drinks
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Create one walk-in order and keep adding food
            and drinks to the same bill.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* ==================================================
              LEFT SIDE
             ================================================== */}
          <div className="space-y-6">
            {/* NEW ORDER */}
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  New Walk-in Order
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Create the bill first. You can then add
                  Jollof Rice, Coke, Beef, Drinks, or any
                  other items to this same order.
                </p>
              </div>

              <form
                onSubmit={handleCreateOrder}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="customerName"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Customer Name
                  </label>

                  <input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={(e) =>
                      setCustomerName(
                        e.target.value
                      )
                    }
                    placeholder="Optional"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="orderNotes"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Notes
                  </label>

                  <textarea
                    id="orderNotes"
                    value={orderNotes}
                    onChange={(e) =>
                      setOrderNotes(
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingOrder
                    ? "Creating..."
                    : "Create Order"}
                </button>
              </form>
            </section>

            {/* ORDER LIST */}
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Orders
                  </h2>

                 <p className="mt-1 text-sm text-gray-500">
                    {orderDateFilter === "Today"
                        ? "Today's walk-in orders"
                        : orderDateFilter === "Custom"
                        ? `Walk-in orders for ${orderCustomDate}`
                        : "All walk-in orders"}
                    </p>
                </div>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {orders.length}
                </span>
              </div>

              {/* SEARCH */}
              <div className="mb-4">
                <label
                  htmlFor="orderSearch"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Search Order
                </label>

                <input
                  id="orderSearch"
                  type="text"
                  value={orderSearch}
                  onChange={(e) =>
                    setOrderSearch(
                      e.target.value
                    )
                  }
                  placeholder="Customer name or order #"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* FILTERS */}
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="dateFilter"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Date
                  </label>

                  <select
                    id="dateFilter"
                    value={orderDateFilter}
                    onChange={(e) =>
                      setOrderDateFilter(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Today">
                      Today
                    </option>

                    <option value="Custom">
                    Custom Date
                    </option>

                    <option value="All">
                      All Orders
                    </option>
                  </select>

                  {orderDateFilter === "Custom" && (
                    <div className="mt-3">
                        <label
                        htmlFor="customOrderDate"
                        className="mb-1 block text-sm font-medium text-gray-700"
                        >
                        Select Date
                        </label>

                        <input
                        id="customOrderDate"
                        type="date"
                        value={orderCustomDate}
                        onChange={(e) =>
                            setOrderCustomDate(e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="statusFilter"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>

                  <select
                    id="statusFilter"
                    value={
                      orderStatusFilter
                    }
                    onChange={(e) =>
                      setOrderStatusFilter(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="All">
                      All Statuses
                    </option>

                    <option value="Open">
                      Open
                    </option>

                    <option value="Paid">
                      Paid
                    </option>

                    <option value="Cancelled">
                      Cancelled
                    </option>
                  </select>
                </div>
              </div>

              {/* CLEAR */}
              {(orderSearch ||
                orderStatusFilter !== "All" ||
                orderDateFilter !== "Today") && (
                <button
                  type="button"
                  onClick={() => {
                    setOrderSearch("");
                    setOrderStatusFilter(
                      "All"
                    );
                    setOrderDateFilter(
                      "Today"
                    );
                     setOrderCustomDate(getTodayDateInput());
                  }}
                  className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Clear filters
                </button>
              )}

              {/* ORDERS */}
              <div className="space-y-3">
                {orders.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center">
                    <p className="font-medium text-gray-700">
                      No orders found
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Create a new order or adjust
                      your filters.
                    </p>
                  </div>
                ) : (
                  orders.map((order) => {
                    const selected =
                      order.id ===
                      selectedOrderId;

                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() =>
                          setSelectedOrderId(
                            order.id
                          )
                        }
                        className={`w-full rounded-lg border p-4 text-left transition ${
                          selected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">
                              Order #{order.id}
                            </p>

                            <p className="mt-1 truncate text-sm text-gray-600">
                              {order.customer_name ||
                                "Walk-in Customer"}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                              order.status ===
                              "Paid"
                                ? "bg-green-100 text-green-700"
                                : order.status ===
                                  "Open"
                                ? "bg-yellow-100 text-yellow-700"
                                : order.status ===
                                  "Cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDateTime(
                              order.created_at
                            )}
                          </span>

                          <span className="font-semibold text-gray-900">
                            {formatCurrency(
                              order.total
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* ==================================================
              RIGHT SIDE
             ================================================== */}

          {!selectedOrder ? (
            <section className="flex min-h-[500px] items-center justify-center rounded-xl bg-white p-8 text-center shadow-sm">
              <div>
                <p className="text-lg font-semibold text-gray-800">
                  No order selected
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Create an order or select one from
                  the list.
                </p>
              </div>
            </section>
          ) : (
            <div className="space-y-6">
              {/* ==============================================
                  CURRENT ORDER
                 ============================================== */}
              <section className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-gray-900">
                        Order #{selectedOrder.id}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          selectedOrder.status ===
                          "Paid"
                            ? "bg-green-100 text-green-700"
                            : selectedOrder.status ===
                              "Open"
                            ? "bg-yellow-100 text-yellow-700"
                            : selectedOrder.status ===
                              "Cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {selectedOrder.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-600">
                      {selectedOrder.customer_name ||
                        "Walk-in Customer"}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Created{" "}
                      {formatDateTime(
                        selectedOrder.created_at
                      )}
                    </p>
                  </div>

                  {canEditOrder && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={
                          editingOrder
                            ? handleCancelEditOrder
                            : handleStartEditOrder
                        }
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {editingOrder
                          ? "Close Edit"
                          : "Edit Order"}
                      </button>

                      <button
                        type="button"
                        onClick={
                          handleCancelOrder
                        }
                        disabled={
                          cancellingOrder
                        }
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cancellingOrder
                          ? "Cancelling..."
                          : "Cancel Order"}
                      </button>
                    </div>
                  )}
                </div>

                {/* EDIT ORDER */}
                {editingOrder &&
                  selectedOrder.status ===
                    "Open" && (
                    <form
                      onSubmit={
                        handleSaveOrder
                      }
                      className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4"
                    >
                      <h3 className="font-semibold text-gray-900">
                        Edit Order
                      </h3>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label
                            htmlFor="editCustomerName"
                            className="mb-1 block text-sm font-medium text-gray-700"
                          >
                            Customer Name
                          </label>

                          <input
                            id="editCustomerName"
                            type="text"
                            value={
                              editCustomerName
                            }
                            onChange={(e) =>
                              setEditCustomerName(
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="editOrderNotes"
                            className="mb-1 block text-sm font-medium text-gray-700"
                          >
                            Notes
                          </label>

                          <textarea
                            id="editOrderNotes"
                            value={
                              editOrderNotes
                            }
                            onChange={(e) =>
                              setEditOrderNotes(
                                e.target.value
                              )
                            }
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={
                            savingOrder
                          }
                          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingOrder
                            ? "Saving..."
                            : "Save Changes"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            handleCancelEditOrder
                          }
                          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                {selectedOrder.notes &&
                  !editingOrder && (
                    <div className="mt-5 rounded-lg bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Notes
                      </p>

                      <p className="mt-1 text-sm text-gray-700">
                        {selectedOrder.notes}
                      </p>
                    </div>
                  )}

                {/* BILL TOTALS */}
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">
                      Order Total
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {formatCurrency(
                        selectedOrder.total
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-green-700">
                      Paid
                    </p>

                    <p className="mt-1 text-2xl font-bold text-green-700">
                      {formatCurrency(
                        selectedOrder.total_paid
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">
                      Balance
                    </p>

                    <p className="mt-1 text-2xl font-bold text-red-700">
                      {formatCurrency(
                        selectedOrder.balance
                      )}
                    </p>
                  </div>
                </div>
              </section>

              {/* ==============================================
                  ORDER ITEMS / CART
                 ============================================== */}
              <section className="rounded-xl bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Items in this Order
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Add as many food and drinks as the
                    customer wants. Everything below belongs
                    to this one bill.
                  </p>

                  {orderHasPayment &&
                    selectedOrder.status ===
                      "Open" && (
                      <p className="mt-2 text-sm font-medium text-amber-700">
                        This order has received a payment,
                        so its items are now locked.
                      </p>
                    )}
                </div>

                {/* ITEM TABLE */}
                {selectedOrder.items.length ===
                0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center">
                    <p className="font-medium text-gray-700">
                      No items added yet
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Add the customer's first food or
                      drink below.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                          <th className="px-4 py-3">
                            Item
                          </th>

                          <th className="px-4 py-3">
                            Qty
                          </th>

                          <th className="px-4 py-3">
                            Price
                          </th>

                          <th className="px-4 py-3">
                            Total
                          </th>

                          <th className="px-4 py-3 text-right">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100 bg-white">
                        {selectedOrder.items.map(
                          (item) => {
                            const editing =
                              editingItemId ===
                              item.id;

                            return (
                              <tr
                                key={
                                  item.id
                                }
                              >
                                <td className="px-4 py-4 font-medium text-gray-900">
                                  {
                                    item.service_item_name
                                  }
                                </td>

                                <td className="px-4 py-4 text-gray-600">
                                  {editing ? (
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={
                                        editItemQuantity
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        setEditItemQuantity(
                                          e.target.value
                                        )
                                      }
                                      className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                  ) : (
                                    item.quantity
                                  )}
                                </td>

                                <td className="px-4 py-4 text-gray-600">
                                  {formatCurrency(
                                    item.unit_price
                                  )}
                                </td>

                                <td className="px-4 py-4 font-semibold text-gray-900">
                                  {formatCurrency(
                                    item.total
                                  )}
                                </td>

                                <td className="px-4 py-4 text-right">
                                  {editing ? (
                                    <div className="flex flex-wrap justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateItemQuantity(
                                            item.id
                                          )
                                        }
                                        disabled={
                                          updatingItemId ===
                                          item.id
                                        }
                                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {updatingItemId ===
                                        item.id
                                          ? "Saving..."
                                          : "Save"}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={
                                          handleCancelEditItem
                                        }
                                        disabled={
                                          updatingItemId ===
                                          item.id
                                        }
                                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : canEditItems ? (
                                    <div className="flex flex-wrap justify-end gap-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleStartEditItem(
                                            item
                                          )
                                        }
                                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                      >
                                        Edit
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteItem(
                                            item.id
                                          )
                                        }
                                        className="text-sm font-medium text-red-600 hover:text-red-700"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>

                      <tfoot className="border-t bg-gray-50">
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-4 text-right font-semibold text-gray-700"
                          >
                            Order Total
                          </td>

                          <td className="px-4 py-4 font-bold text-gray-900">
                            {formatCurrency(
                              selectedOrder.total
                            )}
                          </td>

                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* ADD MORE ITEMS */}
                {selectedOrder.status ===
                  "Open" && (
                  <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900">
                        Add another item
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        This will be added to Order #
                        {selectedOrder.id}, not create a
                        new order.
                      </p>

                      {orderHasPayment && (
                        <p className="mt-2 text-sm font-medium text-amber-700">
                          Items cannot be added because this
                          order has already received a payment.
                        </p>
                      )}
                    </div>

                    <form
                      onSubmit={
                        handleAddItem
                      }
                      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_130px_auto]"
                    >
                      <div>
                        <label
                          htmlFor="serviceItem"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Food / Drink
                        </label>

                        <select
                          id="serviceItem"
                          value={
                            selectedServiceItemId
                          }
                          onChange={(e) =>
                            setSelectedServiceItemId(
                              e.target.value
                            )
                          }
                          disabled={
                            orderHasPayment
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                        >
                          {serviceItems.length ===
                          0 ? (
                            <option value="">
                              No food or drinks available
                            </option>
                          ) : (
                            serviceItems.map(
                              (item) => (
                                <option
                                  key={
                                    item.id
                                  }
                                  value={
                                    item.id
                                  }
                                >
                                  {item.name} —{" "}
                                  {formatCurrency(
                                    getServiceItemPrice(
                                      item
                                    )
                                  )}
                                </option>
                              )
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="itemQuantity"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Quantity
                        </label>

                        <input
                          id="itemQuantity"
                          type="number"
                          min="1"
                          step="1"
                          value={
                            itemQuantity
                          }
                          onChange={(e) =>
                            setItemQuantity(
                              e.target.value
                            )
                          }
                          disabled={
                            orderHasPayment
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={
                            addingItem ||
                            serviceItems.length ===
                              0 ||
                            orderHasPayment
                          }
                          className="w-full rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {addingItem
                            ? "Adding..."
                            : "Add Item"}
                        </button>
                      </div>
                    </form>

                    {selectedServiceItem &&
                      !orderHasPayment && (
                        <p className="mt-3 text-sm text-gray-600">
                          Line total:{" "}
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(
                              previewTotal
                            )}
                          </span>
                        </p>
                      )}
                  </div>
                )}
              </section>

              {/* ==============================================
                  PAYMENTS
                 ============================================== */}
              <section className="rounded-xl bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Payments
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Payments belong to this entire order.
                  </p>
                </div>

                {selectedOrder.status ===
                  "Open" &&
                  Number(
                    selectedOrder.balance
                  ) > 0 && (
                    <form
                      onSubmit={
                        handleRecordPayment
                      }
                      className="space-y-4"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label
                            htmlFor="paymentAmount"
                            className="mb-1 block text-sm font-medium text-gray-700"
                          >
                            Amount
                          </label>

                          <input
                            id="paymentAmount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={
                              paymentAmount
                            }
                            onChange={(e) =>
                              setPaymentAmount(
                                e.target.value
                              )
                            }
                            placeholder={`Balance: ${formatCurrency(
                              selectedOrder.balance
                            )}`}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="paymentMethod"
                            className="mb-1 block text-sm font-medium text-gray-700"
                          >
                            Method
                          </label>

                          <select
                            id="paymentMethod"
                            value={
                              paymentMethod
                            }
                            onChange={(e) =>
                              setPaymentMethod(
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          >
                            {PAYMENT_METHODS.map(
                              (method) => (
                                <option
                                  key={
                                    method
                                  }
                                  value={
                                    method
                                  }
                                >
                                  {method}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label
                            htmlFor="paymentReference"
                            className="mb-1 block text-sm font-medium text-gray-700"
                          >
                            Reference
                          </label>

                          <input
                            id="paymentReference"
                            type="text"
                            value={
                              paymentReference
                            }
                            onChange={(e) =>
                              setPaymentReference(
                                e.target.value
                              )
                            }
                            placeholder="Optional"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="paymentNotes"
                            className="mb-1 block text-sm font-medium text-gray-700"
                          >
                            Notes
                          </label>

                          <input
                            id="paymentNotes"
                            type="text"
                            value={
                              paymentNotes
                            }
                            onChange={(e) =>
                              setPaymentNotes(
                                e.target.value
                              )
                            }
                            placeholder="Optional"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          recordingPayment
                        }
                        className="rounded-lg bg-green-600 px-5 py-2.5 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {recordingPayment
                          ? "Recording..."
                          : "Record Payment"}
                      </button>
                    </form>
                  )}

                {selectedOrder.status ===
                  "Paid" && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    This order has been fully paid.
                  </div>
                )}

                {selectedOrder.status ===
                  "Cancelled" && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    This order has been cancelled.
                  </div>
                )}

                {/* PAYMENT HISTORY */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Payment History
                  </h3>

                  {payments.length ===
                  0 ? (
                    <p className="mt-3 text-sm text-gray-500">
                      No payments recorded yet.
                    </p>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3">
                              Date
                            </th>

                            <th className="px-4 py-3">
                              Method
                            </th>

                            <th className="px-4 py-3">
                              Reference
                            </th>

                            <th className="px-4 py-3">
                              Amount
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 bg-white">
                          {payments.map(
                            (payment) => (
                              <tr
                                key={
                                  payment.id
                                }
                              >
                                <td className="px-4 py-4 text-sm text-gray-600">
                                  {formatDateTime(
                                    payment.created_at
                                  )}
                                </td>

                                <td className="px-4 py-4 text-sm font-medium text-gray-900">
                                  {
                                    payment.payment_method
                                  }
                                </td>

                                <td className="px-4 py-4 text-sm text-gray-600">
                                  {payment.reference ||
                                    "-"}
                                </td>

                                <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                  {formatCurrency(
                                    payment.amount
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}