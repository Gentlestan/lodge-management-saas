import { useEffect, useState } from "react";

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

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/reservations/"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch reservations");
        }

        const data = await response.json();
        setReservations(data);
      } catch (error) {
        console.error(error);
        setError("Unable to load reservations.");
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date + "T00:00:00").toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  };

  const filteredReservations = reservations.filter(
  (reservation) => {
    const searchTerm = search.toLowerCase().trim();

    const matchesSearch =
      reservation.guest_name
        .toLowerCase()
        .includes(searchTerm) ||
      reservation.room_name
        .toLowerCase()
        .includes(searchTerm);

    const matchesStatus =
      statusFilter === "All" ||
      reservation.status === statusFilter;

    return matchesSearch && matchesStatus;
  }
);

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Reservations
            </h1>

            <p className="text-gray-500">
              Manage all lodge reservations
            </p>
          </div>

          <button
            onClick={() =>
              (window.location.href = "/reservations/new")
            }
            className="rounded-lg bg-purple-600 px-5 py-3 font-medium text-white hover:bg-purple-700"
          >
            Add Reservation
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-500">
              Loading reservations...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          reservations.length === 0 && (
            <div className="rounded-xl bg-white p-6 shadow">
              <p className="text-gray-500">
                No reservations found.
              </p>
            </div>
          )}

          <div className="mb-4 flex flex-col gap-3 rounded-xl bg-white p-4 shadow sm:flex-row">
            <input
                type="text"
                placeholder="Search guest or room..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
            />

            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
            >
                <option value="All">All Statuses</option>
                <option value="Reserved">Reserved</option>
                <option value="Checked In">Checked In</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Cancelled">Cancelled</option>
            </select>
            </div>
            {!loading &&
                !error &&
                reservations.length > 0 &&
                filteredReservations.length === 0 && (
                    <div className="rounded-xl bg-white p-6 text-center shadow">
                    <p className="text-gray-500">
                        No reservations match your search or filter.
                    </p>
                    </div>
                )}

        {/* Reservations Table */}
        {!loading &&
          !error &&
          reservations.length > 0 && (
            <div className="overflow-x-auto rounded-xl bg-white shadow">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-sm text-gray-500">
                    <th className="px-6 py-4">
                      Guest
                    </th>

                    <th className="px-6 py-4">
                      Room
                    </th>

                    <th className="px-6 py-4">
                      Check-in
                    </th>

                    <th className="px-6 py-4">
                      Check-out
                    </th>

                    <th className="px-6 py-4">
                      Guests
                    </th>

                    <th className="px-6 py-4">
                      Status
                    </th>

                    <th className="px-6 py-4">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                   {filteredReservations.map((reservation) => (
                    <tr
                      key={reservation.id}
                      className="border-b transition hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {reservation.guest_name}
                      </td>

                      <td className="px-6 py-4">
                        {reservation.room_name}
                      </td>

                      <td className="px-6 py-4">
                        {formatDate(
                          reservation.check_in_date
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {formatDate(
                          reservation.check_out_date
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {reservation.number_of_guests}
                      </td>

                      <td className="px-6 py-4">
                        {reservation.status}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            (window.location.href = `/reservations/${reservation.id}`)
                          }
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </main>
  );
}