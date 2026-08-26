import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type Reservation = {
  id: number;
  guest_name: string;
  room_name: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  status: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  special_requests: string;
  notes: string;
  guest: number;
  room: number;
  created_at: string;
  updated_at: string;
};

export default function ReservationDetails() {
  const router = useRouter();
  const { id } = router.query;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchReservation = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/reservations/${id}/`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch reservation");
        }

        const data = await response.json();
        setReservation(data);
      } catch (error) {
        console.error(error);
        setError("Unable to load reservation.");
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [id]);

  if (loading) return <p>Loading reservation...</p>;
  if (error) return <p>{error}</p>;
  if (!reservation) return <p>Reservation not found.</p>;

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Reservation Details
          </h1>
          <p className="mt-1 text-gray-500">
            View and manage reservation information
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                Guest
              </h2>
              <p className="text-lg font-semibold">
                {reservation.guest_name}
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                Room
              </h2>
              <p className="text-lg font-semibold">
                {reservation.room_name}
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                Check-in
              </h2>
              <p>{reservation.check_in_date}</p>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                Actual Check-in
              </h2>
              <p>
                {reservation.checked_in_at
                  ? new Date(
                      reservation.checked_in_at
                    ).toLocaleString()
                  : "Not checked in yet"}
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                Check-out
              </h2>
              <p>{reservation.check_out_date}</p>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                Actual Check-out
              </h2>
              <p>
                {reservation.checked_out_at
                  ? new Date(
                      reservation.checked_out_at
                    ).toLocaleString()
                  : "Not checked out yet"}
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                Number of guests
              </h2>
              <p>{reservation.number_of_guests}</p>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                Status
              </h2>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                  reservation.status === "Reserved"
                    ? "bg-yellow-100 text-yellow-700"
                    : reservation.status === "Checked In"
                    ? "bg-blue-100 text-blue-700"
                    : reservation.status === "Checked Out"
                    ? "bg-green-100 text-green-700"
                    : reservation.status === "Cancelled"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {reservation.status}
              </span>
            </div>
          </div>

          <div className="mt-6 border-t pt-6">
            <div className="mb-4">
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                Special Requests
              </h2>
              <p>{reservation.special_requests || "None"}</p>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                Notes
              </h2>
              <p>{reservation.notes || "None"}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {reservation.status === "Reserved" && (
              <button
                onClick={async () => {
                  const confirmed = window.confirm(
                    "Are you sure you want to check in this guest?"
                  );

                  if (!confirmed) return;

                  try {
                    const response = await fetch(
                      `http://127.0.0.1:8000/api/reservations/${reservation.id}/check_in/`,
                      {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                        },
                      }
                    );

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(
                        data.detail || "Failed to check in guest"
                      );
                    }

                    alert("Guest checked in successfully!");
                    window.location.reload();
                  } catch (error) {
                    console.error(error);

                    if (error instanceof Error) {
                      alert(error.message);
                    } else {
                      alert("Unable to check in guest.");
                    }
                  }
                }}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
              >
                Check In
              </button>
            )}

            {reservation.status === "Checked In" && (
              <button
                onClick={async () => {
                  const confirmed = window.confirm(
                    "Are you sure you want to check out this guest?"
                  );

                  if (!confirmed) return;

                  try {
                    const response = await fetch(
                      `http://127.0.0.1:8000/api/reservations/${reservation.id}/check_out/`,
                      {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                        },
                      }
                    );

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(
                        data.detail || "Failed to check out guest"
                      );
                    }

                    alert("Guest checked out successfully!");

                    window.location.reload();
                  } catch (error) {
                    console.error(error);

                    if (error instanceof Error) {
                      alert(error.message);
                    } else {
                      alert("Unable to check out guest.");
                    }
                  }
                }}
                className="rounded-lg bg-green-600 px-5 py-3 font-medium text-white transition hover:bg-green-700"
              >
                Check Out
              </button>
            )}

            {reservation.status !== "Cancelled" &&
              reservation.status !== "Checked Out" &&
              reservation.status !== "Checked In" && (
                <>
                  <button
                    onClick={() =>
                      (window.location.href = `/reservations/edit/${reservation.id}`)
                    }
                    className="rounded-lg bg-purple-600 px-5 py-3 font-medium text-white transition hover:bg-purple-700"
                  >
                    Edit Reservation
                  </button>

                  <button
                    onClick={async () => {
                      const confirmed = window.confirm(
                        "Are you sure you want to cancel this reservation?"
                      );

                      if (!confirmed) return;

                      try {
                        const response = await fetch(
                          `http://127.0.0.1:8000/api/reservations/${reservation.id}/`,
                          {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              status: "Cancelled",
                            }),
                          }
                        );

                        if (!response.ok) {
                          throw new Error(
                            "Failed to cancel reservation"
                          );
                        }

                        alert("Reservation cancelled successfully!");
                        window.location.reload();
                      } catch (error) {
                        console.error(error);
                        alert("Unable to cancel reservation.");
                      }
                    }}
                    className="rounded-lg bg-red-600 px-5 py-3 font-medium text-white transition hover:bg-red-700"
                  >
                    Cancel Reservation
                  </button>
                </>
              )}

            <button
              onClick={() =>
                (window.location.href = "/reservations")
              }
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Back to Reservations
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}