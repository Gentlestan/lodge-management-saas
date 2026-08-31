import { apiFetch } from "../../../lib/auth";
import { useRouter } from "next/router";

import { useEffect, useState } from "react";


import BillingSummary from "@/components/billing/BillingSummary";

import AddPayment from "@/components/billing/AddPaymentForm";

import ChargesList from "@/components/billing/ChargesList";

import AddChargeForm from "@/components/billing/AddChargeForm";

import PaymentsList from "@/components/billing/PaymentsList";

type Charge = {
  id: number;
  category: string;
  description: string;
  quantity: number;
  unit_price: string;
  total: number;
  created_at: string;
};

type ServiceItem = {
  id: number;
  name: string;
  category: string;
  price: string;
  active: boolean;
};

type Payment = {
  id: number;
  amount: string;
  payment_method: string;
  reference: string;
  notes: string;
  created_at: string;
};

type Reservation = {
  id: number;
  guest_name: string;
  room_name: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  status: string;
};

type BillingSummary = {
  reservation: number;
  total_charges: number;
  total_payments: number;
  balance: number;
  payment_status: string;
};

export default function BillingPage() {
  const router = useRouter();
  const { id } = router.query;

  const [summary, setSummary] =
    useState<BillingSummary | null>(null);

  const [reservation, setReservation] =
    useState<Reservation | null>(null);

  const [charges, setCharges] = useState<Charge[]>([]);

  const [payments, setPayments] = useState<Payment[]>([]);

  const [serviceItems, setServiceItems] =
    useState<ServiceItem[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadBilling = async () => {
      try {
        const [
                reservationResponse,
                summaryResponse,
                chargesResponse,
                paymentsResponse,
                serviceItemsResponse,
              ] = await Promise.all([
                apiFetch(`/api/reservations/${id}/`),
                apiFetch(`/api/billing/reservations/${id}/summary/`),
                apiFetch(`/api/billing/charges/?reservation=${id}`),
                apiFetch(`/api/billing/payments/?reservation=${id}`),
                apiFetch("/api/billing/service-items/"),
              ]);

        if (!reservationResponse.ok) {
  throw new Error(
    `Reservation request failed: ${reservationResponse.status}`
  );
}

if (!summaryResponse.ok) {
  throw new Error(
    `Summary request failed: ${summaryResponse.status}`
  );
}

if (!chargesResponse.ok) {
  throw new Error(
    `Charges request failed: ${chargesResponse.status}`
  );
}

if (!paymentsResponse.ok) {
  throw new Error(
    `Payments request failed: ${paymentsResponse.status}`
  );
}

if (!serviceItemsResponse.ok) {
  throw new Error(
    `Service items request failed: ${serviceItemsResponse.status}`
  );
}

        const summaryData =
          await summaryResponse.json();

        const reservationData =
          await reservationResponse.json();

        const chargesData =
          await chargesResponse.json();

        const paymentsData =
          await paymentsResponse.json();

        const serviceItemsData =
          await serviceItemsResponse.json();

        setSummary(summaryData);
        setReservation(reservationData);
        setCharges(chargesData);
        setPayments(paymentsData);
        setServiceItems(serviceItemsData);
      } catch (error) {
        console.error(
          "Failed to load billing:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadBilling();
  }, [id]);

  if (loading) {
    return (
      <p className="p-6">
        Loading billing...
      </p>
    );
  }

  if (!summary || !reservation) {
    return (
      <p className="p-6 text-red-600">
        Unable to load billing information.
      </p>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold text-gray-800">
          Reservation Billing
        </h1>

        <div className="mb-8">
          <p className="text-lg font-semibold text-gray-800">
            {reservation.guest_name} — Room{" "}
            {reservation.room_name}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Check-in: {reservation.check_in_date}
            {" · "}
            Check-out: {reservation.check_out_date}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {reservation.number_of_guests} guests
            {" · "}
            Status: {reservation.status}
          </p>
        </div>

        <BillingSummary
          totalCharges={summary.total_charges}
          totalPaid={summary.total_payments}
          balance={summary.balance}
          paymentStatus={summary.payment_status}
        />

        <AddPayment
          reservationId={Number(id)}
          onPaymentAdded={(newPayment) => {
            setPayments((current) => [
              newPayment,
              ...current,
            ]);
          }}
          onSummaryUpdated={(updatedSummary) => {
            setSummary(updatedSummary);
          }}
        />

        <AddChargeForm
          reservationId={Number(id)}
          serviceItems={serviceItems}
          onChargeAdded={(newCharge) => {
            setCharges((current) => [
              ...current,
              newCharge,
            ]);
          }}
          onSummaryUpdated={(updatedSummary) => {
            setSummary(updatedSummary);
          }}
        />

        <ChargesList charges={charges} />

        <PaymentsList payments={payments} />

        <button
          onClick={() =>
            router.push(`/reservations/${id}`)
          }
          className="mt-6 rounded-lg bg-gray-700 px-5 py-3 font-medium text-white hover:bg-gray-800"
        >
          Back to Reservation
        </button>
      </div>
    </main>
  );
}