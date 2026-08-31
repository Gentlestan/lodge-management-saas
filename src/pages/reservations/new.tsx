
import { FormEvent, useEffect, useState } from "react";

import { apiFetch } from "@/lib/auth";

type Guest = {
  id: number;
  full_name: string;
  active: boolean;
};

type Room = {
  id: number;
  room_name: string;
  status: string;
  active: boolean;
  maximum_occupancy: number;
};

type Reservation = {
  id: number;
  room: number;
  check_in_date: string;
  check_out_date: string;
  status: string;
};

export default function NewReservation() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guest, setGuest] = useState("");
  const [room, setRoom] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [guestsResponse, roomsResponse, reservationsResponse] =
          await Promise.all([
            apiFetch("/api/guests/"),
            apiFetch("/api/rooms/"),
            apiFetch("/api/reservations/"),
          ]);

        if (
          !guestsResponse.ok ||
          !roomsResponse.ok ||
          !reservationsResponse.ok
        ) {
          throw new Error("Failed to load guests or rooms");
        }

        const guestsData = await guestsResponse.json();
        const roomsData = await roomsResponse.json();
        const reservationsData = await reservationsResponse.json();

        setGuests(guestsData);
        setRooms(roomsData);
        setReservations(reservationsData);
      } catch (error) {
        console.error(error);
        setError("Unable to load guests or rooms.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedRoom = rooms.find(
    (roomItem) => roomItem.id === Number(room)
  );

  const availableRooms = rooms.filter((roomItem) => {
    if (!roomItem.active) {
      return false;
    }

    if (!checkInDate || !checkOutDate) {
      return false;
    }

    if (roomItem.status === "Maintenance") {
      return false;
    }

    const hasOverlap = reservations.some((reservation) => {
      if (reservation.room !== roomItem.id) {
        return false;
      }

      if (
        reservation.status === "Cancelled" ||
        reservation.status === "Checked Out"
      ) {
        return false;
      }

      return (
        reservation.check_in_date < checkOutDate &&
        reservation.check_out_date > checkInDate
      );
    });

    return !hasOverlap;
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (checkOutDate <= checkInDate) {
      setError("Check-out date must be after check-in date.");
      return;
    }

    if (
      selectedRoom &&
      Number(numberOfGuests) > selectedRoom.maximum_occupancy
    ) {
      setError(
        `This room can accommodate a maximum of ${selectedRoom.maximum_occupancy} guests.`
      );
      return;
    }

    setSaving(true);

    try {
      const response = await apiFetch("/api/reservations/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guest: Number(guest),
          room: Number(room),
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          number_of_guests: Number(numberOfGuests),
          status: "Reserved",
          special_requests: specialRequests,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const firstError = Object.values(data)?.[0];

        if (Array.isArray(firstError)) {
          throw new Error(String(firstError[0]));
        }

        if (typeof firstError === "string") {
          throw new Error(firstError);
        }

        throw new Error(
          data.detail || "Unable to create reservation."
        );
      }

      alert("Reservation created successfully!");
      window.location.href = "/reservations";
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unable to create reservation.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-purple-600" />
              <p className="text-sm font-medium text-slate-600">
                Loading reservation form...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        {/* HEADER */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
            Reservations
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Add Reservation
          </h1>

          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Create a new reservation for your lodge.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm text-red-600">
              !
            </div>

            <div>
              <p className="text-sm font-semibold text-red-800">
                Unable to create reservation
              </p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          {/* GUEST & ROOM */}
          <div className="border-b border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Reservation Details
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select the guest, room and stay dates.
              </p>
            </div>

            <div className="space-y-6">
              {/* Guest */}
              <div>
                <label
                  htmlFor="guest"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Guest
                </label>

                <select
                  id="guest"
                  value={guest}
                  onChange={(e) => setGuest(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                >
                  <option value="">Select guest</option>

                  {guests
                    .filter((guestItem) => guestItem.active)
                    .map((guestItem) => (
                      <option
                        key={guestItem.id}
                        value={guestItem.id}
                      >
                        {guestItem.full_name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Room */}
              <div>
                <label
                  htmlFor="room"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Room
                </label>

                <select
                  id="room"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                >
                  <option value="">Select available room</option>

                  {availableRooms.map((roomItem) => (
                    <option
                      key={roomItem.id}
                      value={roomItem.id}
                    >
                      {roomItem.room_name}
                    </option>
                  ))}
                </select>

                {selectedRoom && (
                  <div className="mt-3 rounded-lg bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-600">
                      Maximum occupancy:{" "}
                      <span className="font-semibold text-slate-800">
                        {selectedRoom.maximum_occupancy} guests
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* DATES */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="checkInDate"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Check-in date
                  </label>

                  <input
                    id="checkInDate"
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="checkOutDate"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Check-out date
                  </label>

                  <input
                    id="checkOutDate"
                    type="date"
                    value={checkOutDate}
                    min={checkInDate || undefined}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
              </div>

              {/* NUMBER OF GUESTS */}
              <div>
                <label
                  htmlFor="numberOfGuests"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Number of guests
                </label>

                <input
                  id="numberOfGuests"
                  type="number"
                  min="1"
                  max={selectedRoom?.maximum_occupancy || undefined}
                  value={numberOfGuests}
                  onChange={(e) => setNumberOfGuests(e.target.value)}
                  required
                  placeholder="Enter number of guests"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              {/* STATUS */}
              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Reservation Status
                </label>

                <input
                  id="status"
                  type="text"
                  value="Reserved"
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600"
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  A new reservation starts as Reserved. Check-in and
                  check-out are handled from the reservation details page.
                </p>
              </div>
            </div>
          </div>

          {/* REQUESTS & NOTES */}
          <div className="border-b border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Additional Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add any requests or internal information related to the stay.
              </p>
            </div>

            <div className="space-y-6">
              {/* SPECIAL REQUESTS */}
              <div>
                <label
                  htmlFor="specialRequests"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Special Requests
                </label>

                <textarea
                  id="specialRequests"
                  value={specialRequests}
                  onChange={(e) =>
                    setSpecialRequests(e.target.value)
                  }
                  rows={4}
                  placeholder="Example: Extra pillow, late arrival..."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              {/* NOTES */}
              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Internal Notes
                </label>

                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Internal notes about this reservation..."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col-reverse gap-3 bg-slate-50 p-6 sm:flex-row sm:justify-end sm:p-8">
            <button
              type="button"
              onClick={() =>
                (window.location.href = "/reservations")
              }
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Reservation"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
