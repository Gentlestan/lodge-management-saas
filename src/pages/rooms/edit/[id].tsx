
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";

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
  const [buildingLocation, setBuildingLocation] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchRoom = async () => {
      const response = await apiFetch(`/api/rooms/${id}/`);

      if (!response.ok) {
        throw new Error("Failed to load room");
      }

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
      setBuildingLocation(room.building_location || "");
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
      building_location: buildingLocation,
      internal_notes: internalNotes,
      active: true,
    };

    const response = await apiFetch(
      `/api/rooms/${id}/`,
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
      const errorData = await response.json();

      console.error(
        "Django update error:",
        errorData
      );

      alert(
        `Failed to update room: ${JSON.stringify(
          errorData
        )}`
      );
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl">

        {/* Back */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() =>
              router.push(`/rooms/${id}`)
            }
            className="text-sm font-medium text-blue-600 transition hover:text-blue-800"
          >
            ← Back to Room
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Edit Room
          </h1>

          <p className="mt-2 text-gray-500">
            Update the room information and settings.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleUpdate}
          className="rounded-xl bg-white p-6 shadow-sm sm:p-8"
        >
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Basic Information
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Update the room name, type, pricing and current
              status.
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">

            {/* Room Name */}
            <div>
              <label
                htmlFor="roomName"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Room Number/Name
              </label>

              <input
                id="roomName"
                value={roomName}
                onChange={(e) =>
                  setRoomName(e.target.value)
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Building / Location */}
            <div>
              <label
                htmlFor="buildingLocation"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Building / Location
                <span className="ml-1 text-xs font-normal text-gray-400">
                  (Optional)
                </span>
              </label>

              <input
                id="buildingLocation"
                value={buildingLocation}
                onChange={(e) =>
                  setBuildingLocation(e.target.value)
                }
                placeholder="e.g. Main Building, Annex, East Wing"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Room Type */}
            <div>
              <label
                htmlFor="roomType"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Room Type
              </label>

              <input
                id="roomType"
                value={roomType}
                onChange={(e) =>
                  setRoomType(e.target.value)
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Price */}
            <div>
              <label
                htmlFor="price"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Price per Night
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  ₦
                </span>

                <input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value)
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Status
              </label>

              <select
                id="status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option>Available</option>
                <option>Cleaning</option>
                <option>Maintenance</option>
              </select>
            </div>
          </div>

          {/* Room Details */}
          <div className="mt-10 border-t border-gray-200 pt-8">
            <h2 className="text-xl font-semibold text-gray-900">
              Room Details
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add or update additional information about the
              room.
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">

            {/* Bed Type */}
            <div>
              <label
                htmlFor="bedType"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Bed Type
              </label>

              <input
                id="bedType"
                value={bedType}
                onChange={(e) =>
                  setBedType(e.target.value)
                }
                placeholder="e.g. King Bed"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Maximum Occupancy */}
            <div>
              <label
                htmlFor="maximumOccupancy"
                className="mb-2 block text-sm font-medium text-gray-700"
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
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Floor */}
            <div>
              <label
                htmlFor="floorLocation"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Floor / Location
              </label>

              <input
                id="floorLocation"
                value={floorLocation}
                onChange={(e) =>
                  setFloorLocation(e.target.value)
                }
                placeholder="e.g. Ground Floor"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Images */}
            <div>
              <label
                htmlFor="images"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Images
              </label>

              <input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setImages(e.target.files)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Description
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              rows={4}
              placeholder="Describe the room"
              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Amenities */}
          <div className="mt-6">
            <label
              htmlFor="amenities"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Amenities
            </label>

            <input
              id="amenities"
              value={amenities}
              onChange={(e) =>
                setAmenities(e.target.value)
              }
              placeholder="e.g. AC, TV, Wi-Fi, Water Heater"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Internal Notes */}
          <div className="mt-6">
            <label
              htmlFor="internalNotes"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Internal Notes
            </label>

            <textarea
              id="internalNotes"
              value={internalNotes}
              onChange={(e) =>
                setInternalNotes(e.target.value)
              }
              rows={4}
              placeholder="Private notes for staff"
              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() =>
                router.push(`/rooms/${id}`)
              }
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
            >
              Update Room
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

