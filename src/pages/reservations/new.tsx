
import { FormEvent, useEffect, useState } from "react";

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
            fetch("http://127.0.0.1:8000/api/guests/"),
            fetch("http://127.0.0.1:8000/api/rooms/"),
            fetch("http://127.0.0.1:8000/api/reservations/"),
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

  // Until dates are selected, don't show rooms yet.
  if (!checkInDate || !checkOutDate) {
    return false;
  }

  // These room statuses cannot accept a reservation at all.
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
      const response = await fetch(
        "http://127.0.0.1:8000/api/reservations/",
        {
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
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(data);

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
      <main className="min-h-screen bg-gray-100 p-6">
        <p className="text-gray-500">
          Loading reservation form...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Add Reservation
          </h1>

          <p className="mt-1 text-gray-500">
            Create a new lodge reservation
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl bg-white p-6 shadow"
        >
          {/* Guest */}

          <div>
            <label
              htmlFor="guest"
              className="mb-2 block font-medium text-gray-700"
            >
              Guest
            </label>

            <select
              id="guest"
              value={guest}
              onChange={(e) => setGuest(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
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
              className="mb-2 block font-medium text-gray-700"
            >
              Room
            </label>

            <select
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
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
              <p className="mt-2 text-sm text-gray-500">
                Maximum occupancy:{" "}
                {selectedRoom.maximum_occupancy} guests
              </p>
            )}
          </div>

          {/* Dates */}

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="checkInDate"
                className="mb-2 block font-medium text-gray-700"
              >
                Check-in date
              </label>

              <input
                id="checkInDate"
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                required
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="checkOutDate"
                className="mb-2 block font-medium text-gray-700"
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
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Number of guests */}

          <div>
            <label
              htmlFor="numberOfGuests"
              className="mb-2 block font-medium text-gray-700"
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
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Status */}

          <div>
            <label
              htmlFor="status"
              className="mb-2 block font-medium text-gray-700"
            >
              Reservation Status
            </label>

            <input
              id="status"
              type="text"
              value="Reserved"
              disabled
              className="w-full rounded-lg border bg-gray-100 px-4 py-3 text-gray-600"
            />

            <p className="mt-2 text-sm text-gray-500">
              A new reservation starts as Reserved. Check-in and
              check-out are handled from the reservation details page.
            </p>
          </div>

          {/* Special Requests */}

          <div>
            <label
              htmlFor="specialRequests"
              className="mb-2 block font-medium text-gray-700"
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
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Notes */}

          <div>
            <label
              htmlFor="notes"
              className="mb-2 block font-medium text-gray-700"
            >
              Internal Notes
            </label>

            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Internal notes about this reservation..."
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Buttons */}

          <div className="flex flex-wrap gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-purple-600 px-5 py-3 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Creating..."
                : "Create Reservation"}
            </button>

            <button
              type="button"
              onClick={() =>
                (window.location.href = "/reservations")
              }
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

