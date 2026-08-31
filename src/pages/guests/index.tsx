
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

export default function Guests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchGuests = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch("/api/guests/");

        if (!response.ok) {
          throw new Error("Failed to fetch guests");
        }

        const data = await response.json();
        setGuests(data);
      } catch (error) {
        console.error(error);
        setError("Unable to load guests.");
      } finally {
        setLoading(false);
      }
    };

    fetchGuests();
  }, []);

  const filteredGuests = guests.filter((guest) => {
    const searchTerm = search.toLowerCase().trim();

    if (!searchTerm) {
      return guest.active;
    }

    return (
      guest.full_name.toLowerCase().includes(searchTerm) ||
      guest.phone_number.toLowerCase().includes(searchTerm)
    );
  });

  const deactivateGuest = async (guest: Guest) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${guest.full_name}?`
    );

    if (!confirmed) return;

    try {
      const response = await apiFetch(
      `/api/guests/${guest.id}/`,
      {
        method: "PATCH",
        body: JSON.stringify({
          active: false,
        }),
      }
    );

      if (!response.ok) {
        throw new Error("Failed to deactivate guest");
      }

      setGuests((previousGuests) =>
        previousGuests.map((item) =>
          item.id === guest.id
            ? { ...item, active: false }
            : item
        )
      );
    } catch (error) {
      console.error(error);
      alert("Unable to deactivate guest.");
    }
  };

  const reactivateGuest = async (guest: Guest) => {
    const confirmed = window.confirm(
      `Are you sure you want to reactivate ${guest.full_name}?`
    );

    if (!confirmed) return;

    try {
      const response = await apiFetch(
        `/api/guests/${guest.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            active: true,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to reactivate guest");
      }

      setGuests((previousGuests) =>
        previousGuests.map((item) =>
          item.id === guest.id
            ? { ...item, active: true }
            : item
        )
      );
    } catch (error) {
      console.error(error);
      alert("Unable to reactivate guest.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Guests
            </h1>

            <p className="mt-1 text-gray-500">
              Manage lodge guests and their information
            </p>
          </div>

          <button
            onClick={() =>
              (window.location.href = "/guests/new")
            }
            className="rounded-lg bg-green-600 px-5 py-3 font-medium text-white transition hover:bg-green-700"
          >
            Add Guest
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow">
          <label
            htmlFor="guestSearch"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Search guests
          </label>

          <input
            id="guestSearch"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name or phone number..."
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-500">
              Loading guests...
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
          guests.length === 0 && (
            <div className="rounded-xl bg-white p-6 shadow">
              <p className="text-gray-500">
                No guests registered yet.
              </p>
            </div>
          )}

        {/* No search results */}
        {!loading &&
          !error &&
          guests.length > 0 &&
          filteredGuests.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-center shadow">
              <p className="text-gray-500">
                No guests found.
              </p>
            </div>
          )}

        {/* Guest List */}
        {!loading &&
          !error &&
          filteredGuests.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="rounded-xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Guest Name */}
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {guest.full_name}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {guest.phone_number}
                    </p>
                  </div>

                  {/* Basic Information */}
                  <div className="space-y-2 text-sm text-gray-600">
                    {guest.email && (
                      <p>
                        <span className="font-medium">
                          Email:
                        </span>{" "}
                        {guest.email}
                      </p>
                    )}

                    {guest.gender && (
                      <p>
                        <span className="font-medium">
                          Gender:
                        </span>{" "}
                        {guest.gender}
                      </p>
                    )}

                    {guest.id_type && (
                      <p>
                        <span className="font-medium">
                          ID:
                        </span>{" "}
                        {guest.id_type}
                        {guest.id_number
                          ? ` - ${guest.id_number}`
                          : ""}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="mt-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                        guest.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {guest.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        (window.location.href = `/guests/${guest.id}`)
                      }
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      View Profile
                    </button>

                    <button
                      onClick={() =>
                        (window.location.href = `/guests/edit/${guest.id}`)
                      }
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Edit
                    </button>

                    {guest.active ? (
                      <button
                        onClick={() => deactivateGuest(guest)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => reactivateGuest(guest)}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </main>
  );
}
