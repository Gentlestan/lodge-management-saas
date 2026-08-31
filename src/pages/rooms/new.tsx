import { useState } from "react";
import { apiFetch } from "@/lib/auth";

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
      maximum_occupancy: Number(maximumOccupancy),
      floor_location: floorLocation,
      internal_notes: internalNotes,
      active: true,
    };

    try {
      const response = await apiFetch("/api/rooms/", {
        method: "POST",
        body: JSON.stringify(room),
      });

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
  <main className="min-h-screen bg-gray-100 p-6">
    <div className="mx-auto max-w-4xl">


      {/* HEADER */}

      <div className="mb-6"> 
      <button type="button" 
      onClick={() => window.history.back()} 
      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50" >
         ← Back to Rooms 
      </button>
       </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Add New Room
        </h1>

        <p className="mt-2 text-gray-500">
          Add a new room to your lodge and provide its details.
        </p>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl bg-white p-6 shadow-sm sm:p-8"
      >

        {/* BASIC INFORMATION */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Basic Information
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Enter the main information about the room.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">

          {/* ROOM NAME */}
          <div>
            <label
              htmlFor="roomName"
              className="block text-sm font-medium text-gray-700"
            >
              Room Number/Name
            </label>

            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Room 101"
              required
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* ROOM TYPE */}
          <div>
            <label
              htmlFor="roomType"
              className="block text-sm font-medium text-gray-700"
            >
              Room Type
            </label>

            <input
              id="roomType"
              type="text"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              placeholder="e.g. Standard"
              required
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* PRICE */}
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700"
            >
              Price per night
            </label>

            <input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 25000"
              required
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* STATUS */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>

            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
        </div>

        {/* ROOM DETAILS */}
        <div className="mt-8 border-t pt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Room Details
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Add additional information guests and staff may need.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">

          {/* BED TYPE */}
          <div>
            <label
              htmlFor="bedType"
              className="block text-sm font-medium text-gray-700"
            >
              Bed Type
            </label>

            <input
              id="bedType"
              type="text"
              value={bedType}
              onChange={(e) => setBedType(e.target.value)}
              placeholder="e.g. King Bed"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* MAXIMUM OCCUPANCY */}
          <div>
            <label
              htmlFor="maximumOccupancy"
              className="block text-sm font-medium text-gray-700"
            >
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
              required
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* FLOOR */}
          <div>
            <label
              htmlFor="floorLocation"
              className="block text-sm font-medium text-gray-700"
            >
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
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* AMENITIES */}
          <div>
            <label
              htmlFor="amenities"
              className="block text-sm font-medium text-gray-700"
            >
              Amenities
            </label>

            <input
              id="amenities"
              type="text"
              value={amenities}
              onChange={(e) =>
                setAmenities(e.target.value)
              }
              placeholder="e.g. AC, TV, Wi-Fi, Water Heater"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="mt-6">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            placeholder="Describe the room"
            rows={4}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* IMAGES */}
        <div className="mt-6">
          <label
            htmlFor="images"
            className="block text-sm font-medium text-gray-700"
          >
            Images
          </label>

          <input
            id="images"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImages(e.target.files)}
            className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
          />

          <p className="mt-1 text-xs text-gray-500">
            You can select multiple room images.
          </p>
        </div>

        {/* INTERNAL NOTES */}
        <div className="mt-6">
          <label
            htmlFor="internalNotes"
            className="block text-sm font-medium text-gray-700"
          >
            Internal Notes
          </label>

          <textarea
            id="internalNotes"
            value={internalNotes}
            onChange={(e) =>
              setInternalNotes(e.target.value)
            }
            placeholder="Private notes for staff"
            rows={4}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* ACTION */}
        <div className="mt-8 flex justify-end border-t pt-6">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Add Room
          </button>
        </div>

      </form>
    </div>
  </main>
);

}