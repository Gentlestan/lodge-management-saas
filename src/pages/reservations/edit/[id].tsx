import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";

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
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  status: string;
  special_requests: string;
  notes: string;
  guest: number;
  room: number;
};

export default function EditReservation() {
  const router = useRouter();
  const { id } = router.query;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

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
    if (!id) return;

    const fetchData = async () => {
      try {
        const [
          reservationResponse,
          guestsResponse,
          roomsResponse,
        ] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/reservations/${id}/`),
          fetch("http://127.0.0.1:8000/api/guests/"),
          fetch("http://127.0.0.1:8000/api/rooms/"),
        ]);

        if (
          !reservationResponse.ok ||
          !guestsResponse.ok ||
          !roomsResponse.ok
        ) {
          throw new Error("Failed to load reservation data");
        }

        const reservationData = await reservationResponse.json();
        const guestsData = await guestsResponse.json();
        const roomsData = await roomsResponse.json();

        setReservation(reservationData);
        setGuests(guestsData);
        setRooms(roomsData);

        setGuest(String(reservationData.guest));
        setRoom(String(reservationData.room));
        setCheckInDate(reservationData.check_in_date);
        setCheckOutDate(reservationData.check_out_date);
        setNumberOfGuests(String(reservationData.number_of_guests));
        setSpecialRequests(reservationData.special_requests || "");
        setNotes(reservationData.notes || "");
      } catch (error) {
        console.error(error);
        setError("Unable to load reservation.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!id) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/reservations/${id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guest: Number(guest),
            room: Number(room),
            check_in_date: checkInDate,
            check_out_date: checkOutDate,
            number_of_guests: Number(numberOfGuests),
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
          throw new Error(firstError[0]);
        }

        throw new Error("Unable to update reservation.");
      }

      alert("Reservation updated successfully!");
      window.location.href = `/reservations/${id}`;
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unable to update reservation.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading reservation...</p>;
  }

  if (!reservation) {
    return <p>Reservation not found.</p>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Edit Reservation
          </h1>
          <p className="mt-1 text-gray-500">
            Update reservation information
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white p-6 shadow"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="guest"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Guest
              </label>

              <select
                id="guest"
                value={guest}
                onChange={(e) => setGuest(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              >
                <option value="">Select guest</option>

                {guests
                  .filter(
                    (guest) =>
                      guest.active ||
                      guest.id === reservation.guest
                  )
                  .map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.full_name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="room"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Room
              </label>

              <select
                id="room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              >
                <option value="">Select room</option>

                {rooms
                  .filter(
                    (room) =>
                      (room.active &&
                        room.status === "Available") ||
                      room.id === reservation.room
                  )
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="checkInDate"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Check-in date
              </label>

              <input
                id="checkInDate"
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div>
              <label
                htmlFor="checkOutDate"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Check-out date
              </label>

              <input
                id="checkOutDate"
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div>
              <label
                htmlFor="numberOfGuests"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Number of guests
              </label>

              <input
                id="numberOfGuests"
                type="number"
                min="1"
                value={numberOfGuests}
                onChange={(e) => setNumberOfGuests(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="specialRequests"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Special Requests
              </label>

              <textarea
                id="specialRequests"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                placeholder="Any requests from the guest..."
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Internal Notes
              </label>

              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                placeholder="Visible only to lodge staff..."
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-purple-600 px-5 py-3 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() =>
                (window.location.href = `/reservations/${id}`)
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