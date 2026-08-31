import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";

type Room = {
  id: number;
  room_name: string;
  room_type: string;
  price_per_night: string;
  status: string;
  description: string;
  amenities: string;
  bed_type: string;
  maximum_occupancy: number | null;
  floor_location: string;
  internal_notes: string;
  active: boolean;
};

export default function RoomDetails() {
  const router = useRouter();
  const { id } = router.query;

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchRoom = async () => {
      try {
        const response = await apiFetch(`/api/rooms/${id}/`);

        if (!response.ok) {
          setRoom(null);
          return;
        }

        const data = await response.json();
        setRoom(data);
      } catch (error) {
        console.error("Error fetching room:", error);
        setRoom(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [id]);

  if (loading) {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <p className="text-gray-500">Loading room...</p>
        </div>
      </div>
    </main>
  );
}

if (!room) {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Room Not Found
          </h1>

          <p className="mt-2 text-gray-500">
            The room you are looking for could not be found.
          </p>

          <button
            type="button"
            onClick={() => router.push("/rooms")}
            className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
          >
            Back to Rooms
          </button>
        </div>
      </div>
    </main>
  );
}

return (
  <main className="min-h-screen bg-gray-100 p-6">
    <div className="mx-auto max-w-5xl">

      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/rooms")}
            className="mb-3 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Back to Rooms
          </button>

          <h1 className="text-3xl font-bold text-gray-900">
            {room.room_name}
          </h1>

          <p className="mt-1 text-gray-500">
            Room details and current status
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(`/rooms/edit/${room.id}`)
          }
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
        >
          Edit Room
        </button>
      </div>

      {/* ROOM SUMMARY */}
      <div className="grid gap-6 md:grid-cols-3">

        {/* ROOM TYPE */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Room Type
          </p>

          <p className="mt-2 text-xl font-semibold text-gray-900">
            {room.room_type}
          </p>
        </div>

        {/* PRICE */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Price per Night
          </p>

          <p className="mt-2 text-xl font-bold text-gray-900">
            ₦{Number(room.price_per_night).toLocaleString()}
          </p>
        </div>

        {/* STATUS */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Current Status
          </p>

          <span
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              room.status === "Available"
                ? "bg-green-100 text-green-700"
                : room.status === "Occupied"
                ? "bg-blue-100 text-blue-700"
                : room.status === "Reserved"
                ? "bg-yellow-100 text-yellow-700"
                : room.status === "Cleaning"
                ? "bg-orange-100 text-orange-700"
                : room.status === "Maintenance"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {room.status}
          </span>
        </div>
      </div>

      {/* ROOM INFORMATION */}
      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Room Information
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">

          {/* BED TYPE */}
          {room.bed_type && (
            <div>
              <p className="text-sm font-medium text-gray-500">
                Bed Type
              </p>

              <p className="mt-1 text-gray-900">
                {room.bed_type}
              </p>
            </div>
          )}

          {/* MAX OCCUPANCY */}
          {room.maximum_occupancy && (
            <div>
              <p className="text-sm font-medium text-gray-500">
                Maximum Occupancy
              </p>

              <p className="mt-1 text-gray-900">
                {room.maximum_occupancy} guests
              </p>
            </div>
          )}

          {/* FLOOR */}
          {room.floor_location && (
            <div>
              <p className="text-sm font-medium text-gray-500">
                Floor / Location
              </p>

              <p className="mt-1 text-gray-900">
                {room.floor_location}
              </p>
            </div>
          )}

          {/* ACTIVE */}
          <div>
            <p className="text-sm font-medium text-gray-500">
              Room Status
            </p>

            <p className="mt-1 text-gray-900">
              {room.active ? "Active" : "Inactive"}
            </p>
          </div>
        </div>
      </div>

      {/* DESCRIPTION */}
      {room.description && (
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Description
          </h2>

          <p className="mt-3 leading-7 text-gray-600">
            {room.description}
          </p>
        </div>
      )}

      {/* AMENITIES */}
      {room.amenities && (
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Amenities
          </h2>

          <p className="mt-3 leading-7 text-gray-600">
            {room.amenities}
          </p>
        </div>
      )}

      {/* INTERNAL NOTES */}
      {room.internal_notes && (
        <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-6">
          <h2 className="text-xl font-semibold text-yellow-900">
            Internal Notes
          </h2>

          <p className="mt-3 leading-7 text-yellow-800">
            {room.internal_notes}
          </p>
        </div>
      )}

      {/* BOTTOM ACTION */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => router.push("/rooms")}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Back to Rooms
        </button>
      </div>

    </div>
  </main>
);
}