
import { useRouter } from "next/router";

import { useEffect, useState } from "react";

import { apiFetch } from "../../lib/auth";

type Reservation = {
  id: number;
  guest_name: string;
  room_name: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  status: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  special_requests: string;
  notes: string;
  guest: number;
  room: number;
  created_at: string;
  updated_at: string;
};

export default function ReservationDetails() {
  const router = useRouter();

  const { id } = router.query;

  const [reservation, setReservation] =
    useState<Reservation | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReservation = async () => {
    try {
      const response = await apiFetch(
        `/api/reservations/${id}/`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reservation");
      }

      const data = await response.json();

      setReservation(data);
    } catch (error) {
      console.error(error);
      setError("Unable to load reservation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    fetchReservation();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-purple-600" />

              <p className="text-sm font-medium text-slate-600">
                Loading reservation...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">
              !
            </div>

            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Unable to Load Reservation
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => router.push("/reservations")}
              className="mt-6 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
            >
              Back to Reservations
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!reservation) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl">
              ?
            </div>

            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Reservation Not Found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              The reservation you are looking for could not be
              found.
            </p>

            <button
              type="button"
              onClick={() => router.push("/reservations")}
              className="mt-6 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
            >
              Back to Reservations
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/reservations")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-purple-600 transition hover:text-purple-800"
          >
            <span className="text-lg">←</span>
            Back to Reservations
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                Reservation
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Reservation Details
              </h1>

              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                View and manage reservation information.
              </p>
            </div>

            {/* STATUS */}
            <span
              className={`inline-flex w-fit items-center rounded-full px-4 py-2 text-sm font-semibold ${
                reservation.status === "Reserved"
                  ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200"
                  : reservation.status === "Checked In"
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                  : reservation.status === "Checked Out"
                  ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                  : reservation.status === "Cancelled"
                  ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                  : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {reservation.status}
            </span>
          </div>
        </div>

        {/* MAIN CARD */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* RESERVATION OVERVIEW */}
          <section className="border-b border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Reservation Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Basic information about this reservation.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">

              {/* GUEST */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Guest
                </p>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {reservation.guest_name}
                </p>
              </div>

              {/* ROOM */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Room
                </p>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {reservation.room_name}
                </p>
              </div>

              {/* NUMBER OF GUESTS */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Number of Guests
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  {reservation.number_of_guests} guests
                </p>
              </div>

              {/* STATUS */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reservation Status
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  {reservation.status}
                </p>
              </div>
            </div>
          </section>

          {/* STAY INFORMATION */}
          <section className="border-b border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Stay Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Scheduled and actual check-in/check-out information.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">

              {/* CHECK-IN DATE */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Check-in Date
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  {reservation.check_in_date}
                </p>
              </div>

              {/* CHECK-OUT DATE */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Check-out Date
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  {reservation.check_out_date}
                </p>
              </div>

              {/* ACTUAL CHECK-IN */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Actual Check-in
                </p>

                <p className="mt-2 text-sm font-medium text-slate-900">
                  {reservation.checked_in_at
                    ? new Date(
                        reservation.checked_in_at
                      ).toLocaleString()
                    : "Not checked in yet"}
                </p>
              </div>

              {/* ACTUAL CHECK-OUT */}
              <div className="rounded-xl border border-green-100 bg-green-50/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                  Actual Check-out
                </p>

                <p className="mt-2 text-sm font-medium text-slate-900">
                  {reservation.checked_out_at
                    ? new Date(
                        reservation.checked_out_at
                      ).toLocaleString()
                    : "Not checked out yet"}
                </p>
              </div>
            </div>
          </section>

          {/* REQUESTS & NOTES */}
          <section className="border-b border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Additional Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Special requests and internal notes for this reservation.
              </p>
            </div>

            <div className="space-y-5">

              {/* SPECIAL REQUESTS */}
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Special Requests
                </p>

                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {reservation.special_requests || "None"}
                  </p>
                </div>
              </div>

              {/* NOTES */}
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Internal Notes
                </p>

                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {reservation.notes || "None"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ACTIONS */}
          <section className="flex flex-col gap-3 bg-slate-50 p-6 sm:flex-row sm:flex-wrap sm:p-8">

            {/* CHECK IN */}
            {reservation.status === "Reserved" && (
              <button
                onClick={async () => {
                  const confirmed = window.confirm(
                    "Are you sure you want to check in this guest?"
                  );

                  if (!confirmed) return;

                  try {
                    const response = await apiFetch(
                      `/api/reservations/${reservation.id}/check_in/`,
                      {
                        method: "PATCH",
                      }
                    );

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(
                        data.detail || "Failed to check in guest"
                      );
                    }

                    alert("Guest checked in successfully!");

                    fetchReservation();
                  } catch (error) {
                    console.error(error);

                    if (error instanceof Error) {
                      alert(error.message);
                    } else {
                      alert("Unable to check in guest.");
                    }
                  }
                }}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Check In
              </button>
            )}

            
            {/* BILLING */}
            {(reservation.status === "Reserved" ||
              reservation.status === "Checked In") && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/reservations/billing/${reservation.id}`
                  )
                }
                className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
              >
                View Billing
              </button>
            )}



            {/* CHECK OUT */}
            {reservation.status === "Checked In" && (
              <button
                onClick={async () => {
                  const confirmed = window.confirm(
                    "Are you sure you want to check out this guest?"
                  );

                  if (!confirmed) return;

                  try {
                    const response = await apiFetch(
                      `/api/reservations/${reservation.id}/check_out/`,
                      {
                        method: "PATCH",
                      }
                    );

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(
                        data.detail || "Failed to check out guest"
                      );
                    }

                    alert("Guest checked out successfully!");

                    fetchReservation();
                  } catch (error) {
                    console.error(error);

                    if (error instanceof Error) {
                      alert(error.message);
                    } else {
                      alert("Unable to check out guest.");
                    }
                  }
                }}
                className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
              >
                Check Out
              </button>
            )}

            {/* EDIT + CANCEL */}
            {reservation.status === "Reserved" && (
              <>
                <button
                  onClick={() =>
                    router.push(
                      `/reservations/edit/${reservation.id}`
                    )
                  }
                  className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
                >
                  Edit Reservation
                </button>

                <button
                  onClick={async () => {
                    const confirmed = window.confirm(
                      "Are you sure you want to cancel this reservation?"
                    );

                    if (!confirmed) return;

                    try {
                      const response = await apiFetch(
                        `/api/reservations/${reservation.id}/`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            status: "Cancelled",
                          }),
                        }
                      );

                      const data = await response.json();

                      if (!response.ok) {
                        throw new Error(
                          data.detail ||
                            "Failed to cancel reservation"
                        );
                      }

                      alert(
                        "Reservation cancelled successfully!"
                      );

                      fetchReservation();
                    } catch (error) {
                      console.error(error);

                      if (error instanceof Error) {
                        alert(error.message);
                      } else {
                        alert(
                          "Unable to cancel reservation."
                        );
                      }
                    }
                  }}
                  className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Cancel Reservation
                </button>
              </>
            )}

            {/* BACK */}
            <button
              onClick={() => router.push("/reservations")}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to Reservations
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
