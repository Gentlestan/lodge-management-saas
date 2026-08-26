import { useRouter } from "next/router";
import { useEffect, useState } from "react";

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
        const response = await fetch(
          `http://127.0.0.1:8000/api/rooms/${id}/`
        );

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
    return <main><p>Loading room...</p></main>;
  }

  if (!room) {
    return (
      <main>
        <h1>Room Not Found</h1>

        <button onClick={() => router.push("/rooms")}>
          Back to Rooms
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>{room.room_name}</h1>

      <p>Room Type: {room.room_type}</p>

      <p>Price per night: ₦{room.price_per_night}</p>

      <p>Status: {room.status}</p>

      {room.description && (
        <p>Description: {room.description}</p>
      )}

      {room.amenities && (
        <p>Amenities: {room.amenities}</p>
      )}

      {room.bed_type && (
        <p>Bed Type: {room.bed_type}</p>
      )}

      {room.maximum_occupancy && (
        <p>Maximum Occupancy: {room.maximum_occupancy}</p>
      )}

      {room.floor_location && (
        <p>Floor/Location: {room.floor_location}</p>
      )}

      {room.internal_notes && (
        <p>Internal Notes: {room.internal_notes}</p>
      )}

      <button onClick={() => router.push("/rooms")}>
        Back to Rooms
      </button>
    </main>
  );
}