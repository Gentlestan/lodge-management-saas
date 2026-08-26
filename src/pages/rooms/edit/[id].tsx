import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function EditRoom() {
  const router = useRouter();
  const { id } = router.query;

  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("Available");
  const [description, setDescription] = useState("");
  const [amenities, setAmenities] = useState("");
  const [images, setImages] = useState<FileList | null>(null);
  const [bedType, setBedType] = useState("");
  const [maximumOccupancy, setMaximumOccupancy] = useState("");
  const [floorLocation, setFloorLocation] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchRoom = async () => {
      const response = await fetch(
        `http://127.0.0.1:8000/api/rooms/${id}/`
      );

      const room = await response.json();

      setRoomName(room.room_name || "");
      setRoomType(room.room_type || "");
      setPrice(room.price_per_night || "");
      setStatus(room.status || "Available");
      setDescription(room.description || "");
      setAmenities(room.amenities || "");
      setBedType(room.bed_type || "");
      setMaximumOccupancy(
        room.maximum_occupancy?.toString() || ""
      );
      setFloorLocation(room.floor_location || "");
      setInternalNotes(room.internal_notes || "");
    };

    fetchRoom();
  }, [id]);

  async function handleUpdate(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const updatedRoom = {
      room_name: roomName,
      room_type: roomType,
      price_per_night: price,
      status,
      description,
      amenities,
      bed_type: bedType,
      maximum_occupancy: maximumOccupancy
        ? Number(maximumOccupancy)
        : null,
      floor_location: floorLocation,
      internal_notes: internalNotes,
      active: true,
    };

    const response = await fetch(
      `http://127.0.0.1:8000/api/rooms/${id}/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedRoom),
      }
    );

    if (response.ok) {
      alert("Room updated successfully!");
      router.push("/rooms");
    } else {
      alert("Failed to update room.");
    }
  }

  return (
    <main>
      <h1>Edit Room</h1>

      <form onSubmit={handleUpdate}>
        <div>
          <label>Room Number/Name</label>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Room Type</label>
          <input
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Price per night</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Available</option>
            <option>Reserved</option>
            <option>Occupied</option>
            <option>Cleaning</option>
            <option>Maintenance</option>
          </select>
        </div>

        <div>
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />
        </div>

        <div>
          <label>Amenities</label>
          <input
            value={amenities}
            onChange={(e) => setAmenities(e.target.value)}
          />
        </div>

        <div>
          <label>Images</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImages(e.target.files)}
          />
        </div>

        <div>
          <label>Bed Type</label>
          <input
            value={bedType}
            onChange={(e) => setBedType(e.target.value)}
          />
        </div>

        <div>
          <label>Maximum Occupancy</label>
          <input
            type="number"
            value={maximumOccupancy}
            onChange={(e) =>
              setMaximumOccupancy(e.target.value)
            }
          />
        </div>

        <div>
          <label>Floor/Location</label>
          <input
            value={floorLocation}
            onChange={(e) =>
              setFloorLocation(e.target.value)
            }
          />
        </div>

        <div>
          <label>Internal Notes</label>
          <textarea
            value={internalNotes}
            onChange={(e) =>
              setInternalNotes(e.target.value)
            }
          />
        </div>

        <button type="submit">Update Room</button>
      </form>
    </main>
  );
}