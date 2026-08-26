import { useState } from "react";

type AddPaymentProps = {
  reservationId: number;
  onPaymentAdded: (payment: Payment) => void;
  onSummaryUpdated: (summary: BillingSummary) => void;
};

type Payment = {
  id: number;
  amount: string;
  payment_method: string;
  reference: string;
  notes: string;
  created_at: string;
};

type BillingSummary = {
  reservation: number;
  total_charges: number;
  total_payments: number;
  balance: number;
  payment_status: string;
};

export default function AddPayment({
  reservationId,
  onPaymentAdded,
  onSummaryUpdated,
}: AddPaymentProps) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  const handleAddPayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      alert("Enter a valid payment amount.");
      return;
    }

    setAddingPayment(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/billing/payments/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reservation: reservationId,
            amount: Number(paymentAmount),
            payment_method: paymentMethod,
            reference: paymentReference,
            notes: paymentNotes,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error(error);
        alert("Failed to record payment.");
        return;
      }

      const newPayment = await response.json();

      onPaymentAdded(newPayment);

      const summaryResponse = await fetch(
        `http://127.0.0.1:8000/api/billing/reservations/${reservationId}/summary/`
      );

      if (summaryResponse.ok) {
        const updatedSummary = await summaryResponse.json();
        onSummaryUpdated(updatedSummary);
      }

      setPaymentAmount("");
      setPaymentMethod("Cash");
      setPaymentReference("");
      setPaymentNotes("");
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setAddingPayment(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-semibold">
        Record Payment
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Amount
          </label>

          <input
            type="number"
            min="1"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Payment Method
          </label>

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option>Cash</option>
            <option>Transfer</option>
            <option>POS</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Reference
          </label>

          <input
            type="text"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Receipt / Transfer Ref"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Notes
          </label>

          <input
            type="text"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="Initial payment"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <button
        onClick={handleAddPayment}
        disabled={addingPayment}
        className="mt-4 rounded-lg bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {addingPayment ? "Recording..." : "Record Payment"}
      </button>
    </div>
  );
}