
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/auth";

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
        const response = await apiFetch("/api/reservations/");

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

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "Reserved":
        return "bg-yellow-100 text-yellow-700";

      case "Checked In":
        return "bg-blue-100 text-blue-700";

      case "Checked Out":
        return "bg-gray-100 text-gray-700";

      case "Cancelled":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Reservations
            </h1>

            <p className="mt-1 text-gray-500">
              Manage all lodge reservations
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              (window.location.href = "/reservations/new")
            }
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            + Add Reservation
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">
              Loading reservations...
            </p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-6">
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading &&
          !error &&
          reservations.length === 0 && (
            <div className="rounded-xl bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
                📅
              </div>

              <h2 className="mt-4 text-lg font-semibold text-gray-800">
                No reservations yet
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Add your first reservation to start managing
                guest bookings.
              </p>

              <button
                type="button"
                onClick={() =>
                  (window.location.href = "/reservations/new")
                }
                className="mt-5 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Add Reservation
              </button>
            </div>
          )}

        {/* SEARCH & FILTER */}
        {!loading &&
          !error &&
          reservations.length > 0 && (
            <>
              <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="flex-1">
                    <label
                      htmlFor="reservation-search"
                      className="sr-only"
                    >
                      Search reservations
                    </label>

                    <input
                      id="reservation-search"
                      type="text"
                      placeholder="Search guest or room..."
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="md:w-56">
                    <label
                      htmlFor="status-filter"
                      className="sr-only"
                    >
                      Filter by status
                    </label>

                    <select
                      id="status-filter"
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="All">
                        All Statuses
                      </option>

                      <option value="Reserved">
                        Reserved
                      </option>

                      <option value="Checked In">
                        Checked In
                      </option>

                      <option value="Checked Out">
                        Checked Out
                      </option>

                      <option value="Cancelled">
                        Cancelled
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* NO FILTER RESULTS */}
              {filteredReservations.length === 0 && (
                <div className="mb-6 rounded-xl bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
                    🔎
                  </div>

                  <h2 className="mt-4 font-semibold text-gray-800">
                    No matching reservations
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    No reservations match your search or
                    selected status.
                  </p>
                </div>
              )}

              {/* RESERVATIONS TABLE */}
              {filteredReservations.length > 0 && (
                <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="border-b bg-gray-50 text-left">
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Guest
                          </th>

                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Room
                          </th>

                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Check-in
                          </th>

                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Check-out
                          </th>

                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Guests
                          </th>

                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Status
                          </th>

                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredReservations.map(
                          (reservation) => (
                            <tr
                              key={reservation.id}
                              className="border-b last:border-b-0 transition hover:bg-gray-50"
                            >
                              <td className="px-6 py-4">
                                <p className="font-semibold text-gray-800">
                                  {reservation.guest_name}
                                </p>
                              </td>

                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-gray-700">
                                  {reservation.room_name}
                                </p>
                              </td>

                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(
                                  reservation.check_in_date
                                )}
                              </td>

                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(
                                  reservation.check_out_date
                                )}
                              </td>

                              <td className="px-6 py-4 text-sm text-gray-600">
                                {reservation.number_of_guests}
                              </td>

                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                    reservation.status
                                  )}`}
                                >
                                  {reservation.status}
                                </span>
                              </td>

                              <td className="px-6 py-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    (window.location.href = `/reservations/${reservation.id}`)
                                  }
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
      </div>
    </main>
  );
}

