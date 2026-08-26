import { useState } from "react";

export default function NewRoom() {
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const room = {
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

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/rooms/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(room),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        console.error("Django error:", errorData);

        throw new Error("Failed to add room");
      }

      const savedRoom = await response.json();

      console.log("Room saved:", savedRoom);

      alert("Room added successfully!");

      window.location.href = "/rooms";
    } catch (error) {
      console.error("Error adding room:", error);

      alert("Failed to add room. Please try again.");
    }
  }

  return (
    <main>
      <h1>Add New Room</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="roomName">
            Room Number/Name
          </label>

          <input
            id="roomName"
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="e.g. Room 101"
            required
          />
        </div>

        <div>
          <label htmlFor="roomType">
            Room Type
          </label>

          <input
            id="roomType"
            type="text"
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            placeholder="e.g. Standard"
            required
          />
        </div>

        <div>
          <label htmlFor="price">
            Price per night
          </label>

          <input
            id="price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 25000"
            required
          />
        </div>

        <div>
          <label htmlFor="status">
            Status
          </label>

          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Available">Available</option>
            <option value="Reserved">Reserved</option>
            <option value="Occupied">Occupied</option>
            <option value="Cleaning">Cleaning</option>
            <option value="Maintenance">
              Maintenance
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="description">
            Description
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the room"
          />
        </div>

        <div>
          <label htmlFor="amenities">
            Amenities
          </label>

          <input
            id="amenities"
            type="text"
            value={amenities}
            onChange={(e) => setAmenities(e.target.value)}
            placeholder="e.g. AC, TV, Wi-Fi, Water Heater"
          />
        </div>

        <div>
          <label htmlFor="images">
            Images
          </label>

          <input
            id="images"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImages(e.target.files)}
          />
        </div>

        <div>
          <label htmlFor="bedType">
            Bed Type
          </label>

          <input
            id="bedType"
            type="text"
            value={bedType}
            onChange={(e) => setBedType(e.target.value)}
            placeholder="e.g. King Bed"
          />
        </div>

        <div>
          <label htmlFor="maximumOccupancy">
            Maximum Occupancy
          </label>

          <input
            id="maximumOccupancy"
            type="number"
            min="1"
            value={maximumOccupancy}
            onChange={(e) =>
              setMaximumOccupancy(e.target.value)
            }
            placeholder="e.g. 2"
          />
        </div>

        <div>
          <label htmlFor="floorLocation">
            Floor/Location
          </label>

          <input
            id="floorLocation"
            type="text"
            value={floorLocation}
            onChange={(e) =>
              setFloorLocation(e.target.value)
            }
            placeholder="e.g. Ground Floor"
          />
        </div>

        <div>
          <label htmlFor="internalNotes">
            Internal Notes
          </label>

          <textarea
            id="internalNotes"
            value={internalNotes}
            onChange={(e) =>
              setInternalNotes(e.target.value)
            }
            placeholder="Private notes for staff"
          />
        </div>

        <button type="submit">
          Add Room
        </button>
      </form>
    </main>
  );
}