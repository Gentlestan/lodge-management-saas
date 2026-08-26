import { useRouter } from "next/router";
import { useEffect, useState } from "react";

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
        const response = await fetch(
          `http://127.0.0.1:8000/api/guests/${id}/`
        );

        if (!response.ok) {
          throw new Error("Guest not found");
        }

        const data = await response.json();
        setGuest(data);

        const reservationsResponse = await fetch(
          `http://127.0.0.1:8000/api/reservations/?guest=${id}`
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
      <main className="min-h-screen bg-gray-100 p-6">
        <p>Loading guest...</p>
      </main>
    );
  }

  if (error || !guest) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <h1 className="text-2xl font-bold">Guest Not Found</h1>
        <p className="mt-2">{error}</p>

        <button
          onClick={() => router.push("/guests")}
          className="mt-4 rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Guests
        </button>
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
      return <p className="text-gray-500">{emptyMessage}</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-sm text-gray-500">
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3">Check-out</th>
              <th className="px-4 py-3">Guests</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {reservationList.map((reservation) => (
              <tr key={reservation.id} className="border-b">
                <td className="px-4 py-3">{reservation.room_name}</td>
                <td className="px-4 py-3">
                  {reservation.check_in_date}
                </td>
                <td className="px-4 py-3">
                  {reservation.check_out_date}
                </td>
                <td className="px-4 py-3">
                  {reservation.number_of_guests}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                      reservation.status === "Checked Out"
                        ? "bg-gray-100 text-gray-700"
                        : reservation.status === "Checked In"
                        ? "bg-blue-100 text-blue-700"
                        : reservation.status === "Cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {reservation.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {reservationList.length > 5 && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="font-medium text-blue-600 hover:text-blue-800"
            >
              {showAll ? "Show Less" : "View More"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Guest Profile
          </h1>

          <p className="mt-1 text-gray-500">
            View guest information and reservation history
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 rounded-xl bg-white shadow">
          <div className="flex overflow-x-auto border-b">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`whitespace-nowrap px-6 py-4 font-medium ${
                activeTab === "overview"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Overview
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reservations")}
              className={`whitespace-nowrap px-6 py-4 font-medium ${
                activeTab === "reservations"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Reservations
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("stay-history")}
              className={`whitespace-nowrap px-6 py-4 font-medium ${
                activeTab === "stay-history"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Stay History
            </button>
          </div>
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="mb-2 text-sm font-medium text-gray-500">
                  Full Name
                </h2>
                <p className="text-lg font-semibold text-gray-800">
                  {guest.full_name}
                </p>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-medium text-gray-500">
                  Phone Number
                </h2>
                <p>{guest.phone_number}</p>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-medium text-gray-500">
                  Email
                </h2>
                <p>{guest.email || "Not provided"}</p>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-medium text-gray-500">
                  Gender
                </h2>
                <p>{guest.gender || "Not specified"}</p>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-medium text-gray-500">
                  ID Type
                </h2>
                <p>{guest.id_type || "Not provided"}</p>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-medium text-gray-500">
                  ID Number
                </h2>
                <p>{guest.id_number || "Not provided"}</p>
              </div>

              <div className="md:col-span-2">
                <h2 className="mb-2 text-sm font-medium text-gray-500">
                  Address
                </h2>
                <p>{guest.address || "Not provided"}</p>
              </div>

              <div className="md:col-span-2">
                <h2 className="mb-2 text-sm font-medium text-gray-500">
                  Notes
                </h2>
                <p>{guest.notes || "None"}</p>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-medium text-gray-500">
                  Status
                </h2>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                    guest.active
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {guest.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Reservations */}
        {activeTab === "reservations" && (
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-2 text-xl font-semibold text-gray-800">
              Reservations
            </h2>

            <p className="mb-4 text-sm text-gray-500">
              Current, upcoming, and cancelled reservations for this guest.
            </p>

            {renderReservationsTable(
              displayedReservations,
              "No reservations found.",
              showAllReservations,
              setShowAllReservations
            )}
          </div>
        )}

        {/* Stay History */}
        {activeTab === "stay-history" && (
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-2 text-xl font-semibold text-gray-800">
              Stay History
            </h2>

            <p className="mb-4 text-sm text-gray-500">
              Completed stays for this guest.
            </p>

            {renderReservationsTable(
              displayedStayHistory,
              "No completed stays found.",
              showAllStayHistory,
              setShowAllStayHistory
            )}
          </div>
        )}

        {/* Back to Guests */}
        <div className="mt-6">
          <button
            onClick={() => router.push("/guests")}
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Back to Guests
          </button>
        </div>
      </div>
    </main>
  );
}