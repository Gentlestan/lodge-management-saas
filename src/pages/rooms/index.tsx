
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { apiFetch } from "@/lib/auth";

type RoomStatus =
  | "Available"
  | "Occupied"
  | "Cleaning"
  | "Maintenance"
  | "Reserved";

type Room = {
  id: number;
  room_name: string;
  room_type: string;
  price_per_night: string;
  status: RoomStatus;
  description: string;
  amenities: string;
  bed_type: string;
  maximum_occupancy: number | null;
  building_location: string;
  floor_location: string;
  internal_notes: string;
  active: boolean;
};

export default function Rooms() {
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [roomView, setRoomView] = useState<"active" | "inactive">(
    "active"
  );

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await apiFetch("/api/rooms/");

        if (!response.ok) {
          throw new Error("Failed to fetch rooms");
        }

        const data = await response.json();

        setRooms(data);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const markRoomAvailable = async (roomId: number) => {
    try {
      const response = await apiFetch(
        `/api/rooms/${roomId}/mark_available/`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Unable to mark room as available.");
        return;
      }

      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId
            ? { ...room, status: "Available" }
            : room
        )
      );

      alert("Room marked as available.");
    } catch (error) {
      console.error(error);
      alert("Network error.");
    }
  };

  const reactivateRoom = async (roomId: number) => {
    const room = rooms.find((r) => r.id === roomId);

    if (!room) return;

    const confirmed = window.confirm(
      `Reactivate Room ${room.room_name}?`
    );

    if (!confirmed) return;

    try {
      const response = await apiFetch(
        `/api/rooms/${roomId}/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            active: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.detail || "Failed to reactivate room."
        );
        return;
      }

      setRooms((prevRooms) =>
        prevRooms.map((r) =>
          r.id === roomId
            ? { ...r, active: true }
            : r
        )
      );

      alert("Room reactivated successfully.");

      setRoomView("active");
    } catch (error) {
      console.error(error);
      alert("Unable to reactivate room.");
    }
  };

  if (loading) {
    return <p>Loading rooms...</p>;
  }

  /*
   * Dashboard status filter
   *
   * Example:
   * /rooms?status=Occupied
   * /rooms?status=Available
   */

  const status =
    router.isReady &&
    typeof router.query.status === "string"
      ? router.query.status
      : "";

  /*
   * Separate active and inactive rooms.
   */

  const activeRooms = rooms.filter(
    (room) => room.active
  );

  const inactiveRooms = rooms.filter(
    (room) => !room.active
  );

  /*
   * Normalize status comparisons.
   */

  const normalizeStatus = (value: string) =>
    value.trim().toLowerCase();

  /*
   * Apply dashboard status filter only
   * to active rooms.
   */

  const filteredActiveRooms = status
    ? activeRooms.filter(
        (room) =>
          normalizeStatus(room.status) ===
          normalizeStatus(status)
      )
    : activeRooms;

  /*
   * Rooms currently displayed.
   */

  const displayedRooms =
    roomView === "active"
      ? filteredActiveRooms
      : inactiveRooms;

  /*
   * Contextual statistics.
   */

  const availableRooms = activeRooms.filter(
    (room) =>
      normalizeStatus(room.status) === "available"
  ).length;

  /*
   * Room status badge helper.
   */

  const getStatusBadgeClass = (room: Room) => {
    if (!room.active) {
      return "bg-gray-100 text-gray-600";
    }

    switch (normalizeStatus(room.status)) {
      case "available":
        return "bg-green-100 text-green-700";

      case "occupied":
        return "bg-blue-100 text-blue-700";

      case "reserved":
        return "bg-yellow-100 text-yellow-700";

      case "cleaning":
        return "bg-orange-100 text-orange-700";

      case "maintenance":
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
              Rooms
            </h1>

            <p className="mt-1 text-gray-500">
              Manage lodge rooms, availability and room details.
            </p>
          </div>

          <Link
            href="/rooms/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            + Add New Room
          </Link>
        </div>

        {/* ACTIVE / INACTIVE ROOM TOGGLE */}

        <div className="mb-6 flex w-fit overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setRoomView("active")}
            className={`px-5 py-2.5 text-sm font-semibold transition ${
              roomView === "active"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Active Rooms ({activeRooms.length})
          </button>

          <button
            type="button"
            onClick={() => setRoomView("inactive")}
            className={`px-5 py-2.5 text-sm font-semibold transition ${
              roomView === "inactive"
                ? "bg-gray-700 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Inactive Rooms ({inactiveRooms.length})
          </button>
        </div>

        {/* CURRENT FILTER */}

        {status && roomView === "active" && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-blue-800">
              Showing rooms with status:{" "}
              <strong>{status}</strong>
            </p>

            <button
              type="button"
              onClick={() => router.push("/rooms")}
              className="w-fit rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              Show All Rooms
            </button>
          </div>
        )}

        {/* ROOM COUNT */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* FIRST CARD */}

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              {roomView === "active"
                ? "Total Active Rooms"
                : "Total Inactive Rooms"}
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-800">
              {roomView === "active"
                ? activeRooms.length
                : inactiveRooms.length}
            </p>
          </div>

          {/* SECOND CARD */}

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Showing
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {displayedRooms.length}
            </p>
          </div>

          {/* THIRD CARD */}

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              {roomView === "active"
                ? "Available"
                : "Active Rooms"}
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${
                roomView === "active"
                  ? "text-green-600"
                  : "text-blue-600"
              }`}
            >
              {roomView === "active"
                ? availableRooms
                : activeRooms.length}
            </p>
          </div>

        </div>

        {/* ROOM LIST */}

        {displayedRooms.length === 0 ? (

          <div className="rounded-xl bg-white p-12 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
              🏨
            </div>

            <h2 className="mt-4 text-lg font-semibold text-gray-800">
              {roomView === "inactive"
                ? "No inactive rooms."
                : status
                ? `No ${status.toLowerCase()} rooms found.`
                : "No rooms added yet."}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {roomView === "inactive"
                ? "Deactivated rooms will appear here."
                : status
                ? "Try viewing all rooms or choosing another status."
                : "Add your first room to start managing your lodge."}
            </p>

            {roomView === "active" && !status && (
              <Link
                href="/rooms/new"
                className="mt-5 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add New Room
              </Link>
            )}

          </div>

        ) : (

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {displayedRooms.map((room) => (

              <div
                key={room.id}
                className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >

                {/* CARD HEADER */}

                <div className="border-b px-5 py-4">

                  <div className="flex items-start justify-between gap-3">

                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {room.room_name}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {room.room_type}
                      </p>
                    </div>

                    {/* STATUS BADGE */}

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                        room
                      )}`}
                    >
                      {!room.active
                        ? "Inactive"
                        : room.status}
                    </span>

                  </div>

                </div>

                {/* ROOM INFORMATION */}

                <div className="space-y-3 px-5 py-5">

                  <div className="flex items-center justify-between">

                    <span className="text-sm text-gray-500">
                      Price per night
                    </span>

                    <span className="font-semibold text-gray-800">
                      ₦
                      {Number(
                        room.price_per_night
                      ).toLocaleString()}
                    </span>

                  </div>

                  {room.bed_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Bed Type
                      </span>

                      <span className="text-sm font-medium text-gray-700">
                        {room.bed_type}
                      </span>
                    </div>
                  )}

                  {room.maximum_occupancy && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Maximum Occupancy
                      </span>

                      <span className="text-sm font-medium text-gray-700">
                        {room.maximum_occupancy} guests
                      </span>
                    </div>
                  )}

                    {room.building_location && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Building / Location
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {room.building_location}
                      </span>
                    </div>
                  )}

                  {room.floor_location && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Floor / Location
                      </span>

                      <span className="text-sm font-medium text-gray-700">
                        {room.floor_location}
                      </span>
                    </div>
                  )}

                  {room.description && (
                    <div className="border-t pt-3">
                      <p className="text-sm text-gray-500">
                        Description
                      </p>

                      <p className="mt-1 text-sm text-gray-700">
                        {room.description}
                      </p>
                    </div>
                  )}

                  {room.amenities && (
                    <div>
                      <p className="text-sm text-gray-500">
                        Amenities
                      </p>

                      <p className="mt-1 text-sm text-gray-700">
                        {room.amenities}
                      </p>
                    </div>
                  )}

                  {/* CLEANING ACTION */}

                  {room.active &&
                    normalizeStatus(room.status) ===
                      "cleaning" && (
                      <button
                        type="button"
                        onClick={() =>
                          markRoomAvailable(room.id)
                        }
                        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
                      >
                        Mark Available
                      </button>
                    )}

                </div>

                {/* ACTIONS */}

                <div className="flex flex-wrap gap-2 border-t bg-gray-50 px-5 py-4">

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/rooms/${room.id}`
                      )
                    }
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    View Details
                  </button>

                  {room.active ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/rooms/edit/${room.id}`
                          )
                        }
                        className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed =
                            window.confirm(
                              `Deactivate Room ${room.room_name}?`
                            );

                          if (!confirmed) return;

                          try {
                            const response =
                              await apiFetch(
                                `/api/rooms/${room.id}/`,
                                {
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    active: false,
                                  }),
                                }
                              );

                            const data =
                              await response.json();

                            if (response.ok) {
                              setRooms(
                                (prevRooms) =>
                                  prevRooms.map(
                                    (r) =>
                                      r.id === room.id
                                        ? {
                                            ...r,
                                            active: false,
                                          }
                                        : r
                                  )
                              );
                            } else {
                              alert(
                                data.detail ||
                                  "Failed to deactivate room."
                              );
                            }
                          } catch (error) {
                            console.error(error);

                            alert(
                              "Unable to deactivate room."
                            );
                          }
                        }}
                        className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                      >
                        Deactivate
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        reactivateRoom(room.id)
                      }
                      className="flex-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100"
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
