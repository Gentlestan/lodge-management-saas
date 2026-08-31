import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";

type Guest = {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  address: string;
  id_type: string;
  id_number: string;
  gender: string;
  notes: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type Reservation = {
  id: number;
  room_name: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  status: string;
};

type Tab = "overview" | "reservations" | "stay-history";

export default function GuestProfile() {
  const router = useRouter();
  const { id } = router.query;

  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showAllReservations, setShowAllReservations] = useState(false);
  const [showAllStayHistory, setShowAllStayHistory] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchGuest = async () => {
      try {
        const response = await apiFetch(`/api/guests/${id}/`);

        if (!response.ok) {
          throw new Error("Guest not found");
        }

        const data = await response.json();
        setGuest(data);

        const reservationsResponse = await apiFetch(
          `/api/reservations/?guest=${id}`
        );

        if (reservationsResponse.ok) {
          const reservationsData: Reservation[] =
            await reservationsResponse.json();

          setReservations(
            reservationsData.sort(
              (a, b) =>
                new Date(b.check_in_date).getTime() -
                new Date(a.check_in_date).getTime()
            )
          );
        }
      } catch (error) {
        console.error(error);
        setError("Unable to load guest.");
      } finally {
        setLoading(false);
      }
    };

    fetchGuest();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-purple-600" />
              <p className="text-sm font-medium text-slate-600">
                Loading guest...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !guest) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-600">
              !
            </div>

            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Guest Not Found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {error || "The guest you are looking for could not be found."}
            </p>

            <button
              type="button"
              onClick={() => router.push("/guests")}
              className="mt-6 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
            >
              Back to Guests
            </button>
          </div>
        </div>
      </main>
    );
  }

  const activeReservations = reservations.filter(
    (reservation) => reservation.status !== "Checked Out"
  );

  const stayHistory = reservations.filter(
    (reservation) => reservation.status === "Checked Out"
  );

  const displayedReservations = showAllReservations
    ? activeReservations
    : activeReservations.slice(0, 5);

  const displayedStayHistory = showAllStayHistory
    ? stayHistory
    : stayHistory.slice(0, 5);

  const renderReservationsTable = (
    reservationList: Reservation[],
    emptyMessage: string,
    showAll: boolean,
    setShowAll: (value: boolean) => void
  ) => {
    if (reservationList.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Room
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Check-in
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Check-out
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Guests
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {reservationList.map((reservation) => (
                <tr
                  key={reservation.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4 text-sm font-medium text-slate-900">
                    {reservation.room_name}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {reservation.check_in_date}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {reservation.check_out_date}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {reservation.number_of_guests}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        reservation.status === "Checked Out"
                          ? "bg-slate-100 text-slate-700"
                          : reservation.status === "Checked In"
                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                          : reservation.status === "Cancelled"
                          ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                          : "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200"
                      }`}
                    >
                      {reservation.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {reservationList.length > 5 && (
          <div className="border-t border-slate-200 bg-white px-5 py-4 text-center">
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="text-sm font-semibold text-purple-600 transition hover:text-purple-800"
            >
              {showAll ? "Show Less" : "View More"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/guests")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-purple-600 transition hover:text-purple-800"
          >
            <span className="text-lg">←</span>
            Back to Guests
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Guest Profile
              </h1>

              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                View guest information and reservation history.
              </p>
            </div>

            <span
              className={`inline-flex w-fit items-center rounded-full px-4 py-2 text-sm font-semibold ${
                guest.active
                  ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                  : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {guest.active ? "Active Guest" : "Inactive Guest"}
            </span>
          </div>
        </div>

        {/* TABS */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`whitespace-nowrap px-6 py-4 text-sm font-semibold transition ${
                activeTab === "overview"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "border-b-2 border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Overview
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reservations")}
              className={`whitespace-nowrap px-6 py-4 text-sm font-semibold transition ${
                activeTab === "reservations"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "border-b-2 border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Reservations
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("stay-history")}
              className={`whitespace-nowrap px-6 py-4 text-sm font-semibold transition ${
                activeTab === "stay-history"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "border-b-2 border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Stay History
            </button>
          </div>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Guest Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Personal and identification details for this guest.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Full Name
                  </p>

                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {guest.full_name}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Phone Number
                  </p>

                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {guest.phone_number}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </p>

                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {guest.email || "Not provided"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Gender
                  </p>

                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {guest.gender || "Not specified"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    ID Type
                  </p>

                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {guest.id_type || "Not provided"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    ID Number
                  </p>

                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {guest.id_number || "Not provided"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Address
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {guest.address || "Not provided"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Notes
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {guest.notes || "None"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESERVATIONS */}
        {activeTab === "reservations" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-slate-900">
                Reservations
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current, upcoming, and cancelled reservations for this guest.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {renderReservationsTable(
                displayedReservations,
                "No reservations found.",
                showAllReservations,
                setShowAllReservations
              )}
            </div>
          </div>
        )}

        {/* STAY HISTORY */}
        {activeTab === "stay-history" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-slate-900">
                Stay History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Completed stays for this guest.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {renderReservationsTable(
                displayedStayHistory,
                "No completed stays found.",
                showAllStayHistory,
                setShowAllStayHistory
              )}
            </div>
          </div>
        )}

        {/* BACK */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => router.push("/guests")}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            Back to Guests
          </button>
        </div>
      </div>
    </main>
  );
}
