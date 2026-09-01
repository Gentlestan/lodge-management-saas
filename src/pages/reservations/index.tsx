
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

const RESERVATIONS_PER_PAGE = 10;

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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
    return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredReservations = reservations.filter((reservation) => {
    const searchTerm = search.toLowerCase().trim();

    const matchesSearch =
      reservation.guest_name.toLowerCase().includes(searchTerm) ||
      reservation.room_name.toLowerCase().includes(searchTerm);

    const matchesStatus =
      statusFilter === "All" || reservation.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(
    filteredReservations.length / RESERVATIONS_PER_PAGE
  );

  const startIndex = (currentPage - 1) * RESERVATIONS_PER_PAGE;

  const paginatedReservations = filteredReservations.slice(
    startIndex,
    startIndex + RESERVATIONS_PER_PAGE
  );

  const startItem =
    filteredReservations.length === 0 ? 0 : startIndex + 1;

  const endItem = Math.min(
    startIndex + RESERVATIONS_PER_PAGE,
    filteredReservations.length
  );

  const goToPage = (page: number) => {
    setCurrentPage(page);
    setOpenMenu(null);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "Reserved":
        return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";

      case "Checked In":
        return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200";

      case "Checked Out":
        return "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200";

      case "Cancelled":
        return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";

      default:
        return "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200";
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "Reserved":
        return "bg-amber-500";

      case "Checked In":
        return "bg-blue-500";

      case "Checked Out":
        return "bg-gray-400";

      case "Cancelled":
        return "bg-red-500";

      default:
        return "bg-gray-400";
    }
  };

  const getActionItems = (reservation: Reservation) => {
    switch (reservation.status) {
      case "Reserved":
        return [
          {
            label: "View reservation",
            href: `/reservations/${reservation.id}`,
          },
          {
            label: "Edit reservation",
            href: `/reservations/edit/${reservation.id}`,
          },
          {
            label: "Billing",
            href: `/reservations/billing/${reservation.id}`,
          },
        ];

      case "Checked In":
        return [
          {
            label: "View reservation",
            href: `/reservations/${reservation.id}`,
          },
          {
            label: "Billing",
            href: `/reservations/billing/${reservation.id}`,
          },
        ];

      case "Checked Out":
        return [
          {
            label: "View reservation",
            href: `/reservations/${reservation.id}`,
          },
          {
            label: "Billing",
            href: `/reservations/billing/${reservation.id}`,
          },
        ];

      case "Cancelled":
        return [
          {
            label: "View reservation",
            href: `/reservations/${reservation.id}`,
          },
        ];

      default:
        return [
          {
            label: "View reservation",
            href: `/reservations/${reservation.id}`,
          },
        ];
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <span>Front Desk</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-700">Reservations</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Reservations
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage guest bookings, stays and reservation details.
            </p>
          </div>

          <button
            type="button"
            onClick={() => (window.location.href = "/reservations/new")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span className="text-lg leading-none">+</span>
            Add Reservation
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />

            <p className="mt-4 text-sm text-gray-500">
              Loading reservations...
            </p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm text-red-600">
                !
              </div>

              <div>
                <p className="font-semibold text-red-800">
                  Unable to load reservations
                </p>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && reservations.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
              📅
            </div>

            <h2 className="mt-5 text-xl font-semibold text-gray-900">
              No reservations yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Add your first reservation to start managing guest bookings and
              stays.
            </p>

            <button
              type="button"
              onClick={() => (window.location.href = "/reservations/new")}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <span className="text-lg leading-none">+</span>
              Add Reservation
            </button>
          </div>
        )}

        {/* MAIN CONTENT */}
        {!loading && !error && reservations.length > 0 && (
          <>
            {/* SEARCH & FILTER */}
            <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <label
                    htmlFor="reservation-search"
                    className="sr-only"
                  >
                    Search reservations
                  </label>

                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    🔎
                  </span>

                  <input
                    id="reservation-search"
                    type="text"
                    placeholder="Search by guest or room..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-11 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="lg:w-56">
                  <label
                    htmlFor="status-filter"
                    className="sr-only"
                  >
                    Filter by status
                  </label>

                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Checked In">Checked In</option>
                    <option value="Checked Out">Checked Out</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* RESULT COUNT */}
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {startItem}-{endItem}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-700">
                  {filteredReservations.length}
                </span>{" "}
                {filteredReservations.length === 1
                  ? "reservation"
                  : "reservations"}
              </p>
            </div>

            {/* NO FILTER RESULTS */}
            {filteredReservations.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
                  🔎
                </div>

                <h2 className="mt-4 font-semibold text-gray-800">
                  No matching reservations
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Try changing your search or selected status.
                </p>
              </div>
            )}

            {/* RESERVATIONS TABLE */}
            {paginatedReservations.length > 0 && (
              <>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[950px]">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Guest
                          </th>

                          <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Room
                          </th>

                          <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Stay
                          </th>

                          <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Guests
                          </th>

                          <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Status
                          </th>

                          <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {paginatedReservations.map((reservation) => {
                          const actions = getActionItems(reservation);

                          return (
                            <tr
                              key={reservation.id}
                              className="group transition hover:bg-gray-50"
                            >
                              {/* GUEST */}
                              <td className="px-5 py-4">
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {reservation.guest_name}
                                  </p>

                                  <p className="mt-0.5 text-xs text-gray-400">
                                    Reservation #{reservation.id}
                                  </p>
                                </div>
                              </td>

                              {/* ROOM */}
                              <td className="px-5 py-4">
                                <span className="inline-flex rounded-md bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700">
                                  {reservation.room_name}
                                </span>
                              </td>

                              {/* STAY */}
                              <td className="px-5 py-4">
                                <div className="text-sm">
                                  <p className="font-medium text-gray-800">
                                    {formatDate(reservation.check_in_date)}
                                  </p>

                                  <p className="mt-0.5 text-xs text-gray-400">
                                    to{" "}
                                    {formatDate(
                                      reservation.check_out_date
                                    )}
                                  </p>
                                </div>
                              </td>

                              {/* GUEST COUNT */}
                              <td className="px-5 py-4">
                                <span className="text-sm font-medium text-gray-700">
                                  {reservation.number_of_guests}
                                </span>

                                <span className="ml-1 text-xs text-gray-400">
                                  {reservation.number_of_guests === 1
                                    ? "guest"
                                    : "guests"}
                                </span>
                              </td>

                              {/* STATUS */}
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                                    reservation.status
                                  )}`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
                                      reservation.status
                                    )}`}
                                  />

                                  {reservation.status}
                                </span>
                              </td>

                              {/* ACTION */}
                              <td className="relative px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      (window.location.href = `/reservations/${reservation.id}`)
                                    }
                                    className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                  >
                                    View
                                  </button>

                                  <div className="relative">
                                    <button
                                      type="button"
                                      aria-label={`More actions for ${reservation.guest_name}`}
                                      aria-expanded={
                                        openMenu === reservation.id
                                      }
                                      onClick={() =>
                                        setOpenMenu(
                                          openMenu === reservation.id
                                            ? null
                                            : reservation.id
                                        )
                                      }
                                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg leading-none text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                                    >
                                      ⋮
                                    </button>

                                    {openMenu === reservation.id && (
                                      <>
                                        <button
                                          type="button"
                                          aria-label="Close menu"
                                          className="fixed inset-0 z-10 h-full w-full cursor-default"
                                          onClick={() => setOpenMenu(null)}
                                        />

                                        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-left shadow-lg">
                                          {actions.map((action) => (
                                            <button
                                              key={action.label}
                                              type="button"
                                              onClick={() => {
                                                setOpenMenu(null);
                                                window.location.href =
                                                  action.href;
                                              }}
                                              className="block w-full px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                                            >
                                              {action.label}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PAGINATION */}
                {totalPages > 1 && (
                  <div className="mt-5 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500">
                      Page{" "}
                      <span className="font-semibold text-gray-700">
                        {currentPage}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-gray-700">
                        {totalPages}
                      </span>
                    </p>

                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => goToPage(currentPage - 1)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>

                      {Array.from(
                        { length: totalPages },
                        (_, index) => index + 1
                      ).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => goToPage(page)}
                          className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => goToPage(currentPage + 1)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

