
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

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

export default function Rooms() {
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/rooms/"
        );

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
    const response = await fetch(
      `http://127.0.0.1:8000/api/rooms/${roomId}/mark_available/`,
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
    router.isReady && typeof router.query.status === "string"
      ? router.query.status
      : "";

  // Only show active rooms
  const activeRooms = rooms.filter((room) => room.active);

  // Apply dashboard status filter when one exists
  const filteredRooms = status
    ? activeRooms.filter(
        (room) =>
          room.status.trim().toLowerCase() ===
          status.trim().toLowerCase()
      )
    : activeRooms;

  return (
    <main>
      <h1>Rooms</h1>

      <Link href="/rooms/new">Add New Room</Link>

      {/* Show current filter */}
      {status && (
        <div>
          <p>
            Showing rooms with status:{" "}
            <strong>{status}</strong>
          </p>

          <button
            onClick={() => router.push("/rooms")}
          >
            Show All Rooms
          </button>
        </div>
      )}

      {/* No rooms found */}
      {filteredRooms.length === 0 ? (
        <p>
          {status
            ? `No ${status.toLowerCase()} rooms found.`
            : "No rooms added yet."}
        </p>
      ) : (
        <div>
          {filteredRooms.map((room) => (
            <div key={room.id}>
              <h2>{room.room_name}</h2>

              <p>
                Room Type: {room.room_type}
              </p>

              <p>
                Price per night: ₦
                {Number(
                  room.price_per_night
                ).toLocaleString()}
              </p>

              
                {/* Room Status */}
                <div>
                <p>
                    Status: <strong>{room.status}</strong>
                </p>

                {room.status === "Cleaning" && (
                    <button
                    onClick={() => markRoomAvailable(room.id)}
                    >
                    Mark Available
                    </button>
                )}
                </div>



              {/* Actions */}
              <button
                onClick={() =>
                  router.push(`/rooms/${room.id}`)
                }
              >
                View Details
              </button>

              <button
                onClick={() =>
                  router.push(
                    `/rooms/edit/${room.id}`
                  )
                }
              >
                Edit
              </button>

              <button
                onClick={async () => {
                  const confirmed = window.confirm(
                    `Deactivate Room ${room.room_name}?`
                  );

                  if (!confirmed) return;

                  try {
                    const response = await fetch(
                      `http://127.0.0.1:8000/api/rooms/${room.id}/`,
                      {
                        method: "PATCH",
                        headers: {
                          "Content-Type":
                            "application/json",
                        },
                        body: JSON.stringify({
                          active: false,
                        }),
                      }
                    );

                    if (response.ok) {
                      setRooms((prevRooms) =>
                        prevRooms.filter(
                          (r) =>
                            r.id !== room.id
                        )
                      );
                    } else {
                      alert(
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
              >
                Deactivate
              </button>

              {/* Optional Room Details */}
              {room.description && (
                <p>
                  Description: {room.description}
                </p>
              )}

              {room.amenities && (
                <p>
                  Amenities: {room.amenities}
                </p>
              )}

              {room.bed_type && (
                <p>
                  Bed Type: {room.bed_type}
                </p>
              )}

              {room.maximum_occupancy && (
                <p>
                  Maximum Occupancy:{" "}
                  {room.maximum_occupancy}
                </p>
              )}

              {room.floor_location && (
                <p>
                  Floor/Location:{" "}
                  {room.floor_location}
                </p>
              )}

              <hr />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

