
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

type ShortRestPackage = {
  id: number;
  name: string;
  duration_hours: number;
  price: number | string;
  active: boolean;
};

type Reservation = {
  id: number;
  room: number;
  stay_type: string;
  check_in_date: string;
  check_out_date: string;
  short_rest_package: number | null;
  short_rest_start: string | null;
  short_rest_end: string | null;
  number_of_guests: number;
  status: string;
};

export default function NewReservation() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [shortRestPackages, setShortRestPackages] =
  useState<ShortRestPackage[]>([]);

const [stayType, setStayType] =
  useState("Overnight");

const [shortRestPackage, setShortRestPackage] =
  useState("");

const [shortRestDate, setShortRestDate] =
  useState("");

const [shortRestStartTime, setShortRestStartTime] =
  useState("");
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
        const [
          guestsResponse,
          roomsResponse,
          reservationsResponse,
          shortRestPackagesResponse,
        ] = await Promise.all([
          apiFetch("/api/guests/"),
          apiFetch("/api/rooms/"),
          apiFetch("/api/reservations/"),
          apiFetch("/api/short-rest-packages/?active=true"),
        ]);

        if (
          !guestsResponse.ok ||
          !roomsResponse.ok ||
          !reservationsResponse.ok ||
          !shortRestPackagesResponse.ok
        ) {
          throw new Error("Failed to load guests or rooms");
        }

        const guestsData = await guestsResponse.json();
        const roomsData = await roomsResponse.json();
        const reservationsData = await reservationsResponse.json();
        const shortRestPackagesData = await shortRestPackagesResponse.json();

        setGuests(guestsData);
        setRooms(roomsData);
        setReservations(reservationsData);
        setShortRestPackages(
        shortRestPackagesData.filter(
          (item: ShortRestPackage) => item.active
        )
      );
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

  const selectedShortRestPackage =
  shortRestPackages.find(
    (item) => item.id === Number(shortRestPackage)
  ) || null;

const getShortRestEnd = () => {
  if (
    !shortRestDate ||
    !shortRestStartTime ||
    !selectedShortRestPackage
  ) {
    return null;
  }

  const start = new Date(
    `${shortRestDate}T${shortRestStartTime}:00`
  );

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const end = new Date(
    start.getTime() +
      selectedShortRestPackage.duration_hours *
        60 *
        60 *
        1000
  );

  const endDateKey = [
    end.getFullYear(),
    String(end.getMonth() + 1).padStart(2, "0"),
    String(end.getDate()).padStart(2, "0"),
  ].join("-");

  if (endDateKey !== shortRestDate) {
    return null;
  }

  return end;
};

const shortRestEnd = getShortRestEnd();

 const availableRooms = rooms.filter((roomItem) => {
  if (!roomItem.active) {
    return false;
  }

  if (roomItem.status === "Maintenance") {
    return false;
  }

  // ---------------------------------------------------------
  // OVERNIGHT ROOM AVAILABILITY
  // ---------------------------------------------------------
  if (stayType === "Overnight") {
    if (!checkInDate || !checkOutDate) {
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

      // Existing overnight reservation
      if (reservation.stay_type === "Overnight") {
        return (
          reservation.check_in_date < checkOutDate &&
          reservation.check_out_date > checkInDate
        );
      }

      // Existing short-rest reservation
      if (
        reservation.stay_type === "Short Rest" &&
        reservation.short_rest_start
      ) {
        const shortRestDate =
          reservation.short_rest_start.slice(0, 10);

        return (
          shortRestDate >= checkInDate &&
          shortRestDate < checkOutDate
        );
      }

      return false;
    });

    return !hasOverlap;
  }

  // ---------------------------------------------------------
  // SHORT REST ROOM AVAILABILITY
  // ---------------------------------------------------------
  if (stayType === "Short Rest") {
    if (
      !shortRestDate ||
      !shortRestStartTime ||
      !shortRestEnd
    ) {
      return false;
    }

    const selectedStart = new Date(
      `${shortRestDate}T${shortRestStartTime}:00`
    );

    if (Number.isNaN(selectedStart.getTime())) {
      return false;
    }

    const selectedEnd = shortRestEnd;

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

      // Existing overnight reservation
      if (reservation.stay_type === "Overnight") {
        return (
          reservation.check_in_date <= shortRestDate &&
          reservation.check_out_date > shortRestDate
        );
      }

      // Existing short-rest reservation
      if (
        reservation.stay_type === "Short Rest" &&
        reservation.short_rest_start &&
        reservation.short_rest_end
      ) {
        const existingStart = new Date(
          reservation.short_rest_start
        );

        const existingEnd = new Date(
          reservation.short_rest_end
        );

        if (
          Number.isNaN(existingStart.getTime()) ||
          Number.isNaN(existingEnd.getTime())
        ) {
          return false;
        }

        // [start, end) overlap rule.
        return (
          existingStart < selectedEnd &&
          existingEnd > selectedStart
        );
      }

      return false;
    });

    return !hasOverlap;
  }

  return false;
});

  const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setError("");

  if (!guest) {
    setError("Please select a guest.");
    return;
  }

  if (!room) {
    setError("Please select a room.");
    return;
  }

  if (!numberOfGuests) {
    setError("Please enter the number of guests.");
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

  // ---------------------------------------------------------
  // OVERNIGHT VALIDATION
  // ---------------------------------------------------------
  if (stayType === "Overnight") {
    if (!checkInDate || !checkOutDate) {
      setError(
        "Check-in and check-out dates are required for an overnight stay."
      );
      return;
    }

    if (checkOutDate <= checkInDate) {
      setError("Check-out date must be after check-in date.");
      return;
    }
  }

  // ---------------------------------------------------------
  // SHORT REST VALIDATION
  // ---------------------------------------------------------
  if (stayType === "Short Rest") {
    if (!shortRestDate) {
      setError("Please select the short-rest booking date.");
      return;
    }

    if (!shortRestPackage) {
      setError("Please select a short-rest package.");
      return;
    }

    if (!shortRestStartTime) {
      setError("Please select a short-rest start time.");
      return;
    }

    if (!shortRestEnd) {
      setError(
        "The selected short-rest booking cannot cross midnight."
      );
      return;
    }
  }

  setSaving(true);

  try {
    let requestBody;

    if (stayType === "Overnight") {
      requestBody = {
        guest: Number(guest),
        room: Number(room),
        stay_type: "Overnight",
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        number_of_guests: Number(numberOfGuests),
        status: "Reserved",
        special_requests: specialRequests,
        notes,
      };
    } else {
      const shortRestStart = new Date(
        `${shortRestDate}T${shortRestStartTime}:00`
      );

      if (Number.isNaN(shortRestStart.getTime())) {
        throw new Error("Invalid short-rest start time.");
      }

      requestBody = {
        guest: Number(guest),
        room: Number(room),
        stay_type: "Short Rest",
        short_rest_package: Number(shortRestPackage),
        short_rest_start: shortRestStart.toISOString(),
        check_in_date: shortRestDate,
        check_out_date: shortRestDate,
        number_of_guests: Number(numberOfGuests),
        status: "Reserved",
        special_requests: specialRequests,
        notes,
      };
    }

    const response = await apiFetch("/api/reservations/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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
          {/* STAY TYPE */}
          <div>
            <label
              htmlFor="stayType"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Stay Type
            </label>

            <select
              id="stayType"
              value={stayType}
              onChange={(e) => {
                const value = e.target.value;
                setStayType(value);

                if (value === "Overnight") {
                  setShortRestPackage("");
                  setShortRestDate("");
                  setShortRestStartTime("");
                } else {
                  setCheckInDate("");
                  setCheckOutDate("");
                }
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            >
              <option value="Overnight">Overnight</option>
              <option value="Short Rest">Short Rest</option>
            </select>
          </div>

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

          {/* STAY DATES / SHORT REST DETAILS */}

          {stayType === "Overnight" && (
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
          )}

          {stayType === "Short Rest" && (
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="shortRestDate"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Booking date
                </label>

                <input
                  id="shortRestDate"
                  type="date"
                  value={shortRestDate}
                  onChange={(e) => setShortRestDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              <div>
                <label
                  htmlFor="shortRestPackage"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Short Rest Package
                </label>

                <select
                  id="shortRestPackage"
                  value={shortRestPackage}
                  onChange={(e) => setShortRestPackage(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                >
                  <option value="">Select package</option>

                  {shortRestPackages.map((packageItem) => (
                    <option
                      key={packageItem.id}
                      value={packageItem.id}
                    >
                      {packageItem.name} — ₦
                      {Number(packageItem.price).toLocaleString(
                        "en-NG"
                      )}
                    </option>
                  ))}
                </select>

                {selectedShortRestPackage && (
                  <div className="mt-3 rounded-lg bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-600">
                      Duration:{" "}
                      <span className="font-semibold text-slate-800">
                        {selectedShortRestPackage.duration_hours}{" "}
                        hours
                      </span>
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Price:{" "}
                      <span className="font-semibold text-slate-800">
                        ₦
                        {Number(
                          selectedShortRestPackage.price
                        ).toLocaleString("en-NG")}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="shortRestStartTime"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Start time
                </label>

                <input
                  id="shortRestStartTime"
                  type="time"
                  value={shortRestStartTime}
                  onChange={(e) =>
                    setShortRestStartTime(e.target.value)
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              {shortRestEnd && (
                <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-4">
                  <p className="text-sm text-purple-700">
                    Expected end time
                  </p>

                  <p className="mt-1 text-lg font-semibold text-purple-900">
                    {shortRestEnd.toLocaleTimeString("en-NG", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}

              {shortRestDate &&
                shortRestStartTime &&
                selectedShortRestPackage &&
                !shortRestEnd && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm text-amber-800">
                      This package would cross midnight. Please
                      choose an earlier start time.
                    </p>
                  </div>
                )}
            </div>
          )}
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
