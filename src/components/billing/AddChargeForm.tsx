
import { useState } from "react";

type ServiceItem = {
  id: number;
  name: string;
  category: string;
  price: string;
  active: boolean;
};

type Charge = {
  id: number;
  category: string;
  description: string;
  quantity: number;
  unit_price: string;
  total: number;
  created_at: string;
};

type AddChargeFormProps = {
  reservationId: number;
  serviceItems: ServiceItem[];
  onChargeAdded: (charge: Charge) => void;
  onSummaryUpdated: (summary: BillingSummary) => void;
};

type BillingSummary = {
  reservation: number;
  total_charges: number;
  total_payments: number;
  balance: number;
  payment_status: string;
};

export default function AddChargeForm({
  reservationId,
  serviceItems,
  onChargeAdded,
  onSummaryUpdated,
}: AddChargeFormProps) {
  const [selectedServiceItem, setSelectedServiceItem] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addingCharge, setAddingCharge] = useState(false);

  const handleAddCharge = async () => {
    if (!selectedServiceItem) {
      alert("Please select a service item.");
      return;
    }

    if (quantity < 1) {
      alert("Quantity must be at least 1.");
      return;
    }

    const serviceItem = serviceItems.find(
      (item) => item.id === Number(selectedServiceItem)
    );

    if (!serviceItem) {
      alert("Service item not found.");
      return;
    }

    setAddingCharge(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/billing/charges/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reservation: reservationId,
            service_item: serviceItem.id,
            quantity: quantity,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        console.error(
          "Charge creation failed:",
          errorData
        );

        alert("Failed to add charge.");
        return;
      }

      const newCharge = await response.json();

      onChargeAdded(newCharge);

      const summaryResponse = await fetch(
        `http://127.0.0.1:8000/api/billing/reservations/${reservationId}/summary/`
      );

      if (summaryResponse.ok) {
        const updatedSummary =
          await summaryResponse.json();

        onSummaryUpdated(updatedSummary);
      }

      setSelectedServiceItem("");
      setQuantity(1);
    } catch (error) {
      console.error(
        "Failed to add charge:",
        error
      );

      alert(
        "Something went wrong while adding the charge."
      );
    } finally {
      setAddingCharge(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-semibold">
        Add Charge
      </h2>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Service Item
          </label>

          <select
            value={selectedServiceItem}
            onChange={(e) =>
              setSelectedServiceItem(e.target.value)
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">
              Select an item
            </option>

            {serviceItems
              .filter((item) => item.active)
              .map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name} — ₦
                  {Number(item.price).toLocaleString()}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Quantity
          </label>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) =>
              setQuantity(Number(e.target.value))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleAddCharge}
            disabled={addingCharge}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addingCharge ? "Adding..." : "Add Charge"}
          </button>
        </div>
      </div>
    </div>
  );
}
