import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";
import AppLayout from "@/components/layout/AppLayout";


type DashboardReservation = {
  id: number;
  guest_name: string;
  room_name: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
};

type DashboardData = {
  total_rooms: number;
  available_rooms: number;
  reserved_rooms: number;
  occupied_rooms: number;
  cleaning_rooms: number;
  maintenance_rooms: number;
  check_ins_today: number;
  check_outs_today: number;
  upcoming_reservations: DashboardReservation[];

   alerts: {
    cleaning_rooms: number;
    maintenance_rooms: number;
    overdue_checkouts: number;
  };
  current_guests: number;
};

export default function Dashboard() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await apiFetch("/api/dashboard/");

        if (!response.ok) {
          throw new Error("Failed to load dashboard");
        }

        const data = await response.json();

        setDashboard(data);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <p className="p-6">
        Loading dashboard...
      </p>
    );
  }

  if (!dashboard) {
    return (
      <p className="p-6 text-red-600">
        Unable to load dashboard.
      </p>
    );
  }

  const totalRooms = dashboard.total_rooms;
  const available = dashboard.available_rooms;
  const reserved = dashboard.reserved_rooms;
  const occupied = dashboard.occupied_rooms;
  const cleaning = dashboard.cleaning_rooms;
  const maintenance = dashboard.maintenance_rooms;

  const occupancy =
    totalRooms === 0
      ? 0
      : Math.round((occupied / totalRooms) * 100);

  const todaysCheckIns = dashboard.check_ins_today;
  const todaysCheckOuts = dashboard.check_outs_today;
  const upcoming = dashboard.upcoming_reservations;
  const alerts = dashboard.alerts;

  return (
  
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Lodge Dashboard
          </h1>

          <p className="text-gray-500">
            Manage rooms, guests and reservations
          </p>
        </div>

        {/* Statistics */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">

          {/* Total Rooms */}
          <button
            onClick={() => {
              window.location.href = "/rooms";
            }}
            className="rounded-xl bg-white p-5 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-sm text-gray-500">
              Total Rooms
            </p>

            <h2 className="mt-2 text-3xl font-bold text-gray-800">
              {totalRooms}
            </h2>

            <p className="mt-2 text-sm text-blue-600">
              View all rooms →
            </p>
          </button>

          {/* Available */}
          <button
            onClick={() => {
              window.location.href =
                "/rooms?status=Available";
            }}
            className="rounded-xl bg-white p-5 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-sm text-green-600">
              Available
            </p>

            <h2 className="mt-2 text-3xl font-bold text-green-600">
              {available}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              View available rooms →
            </p>
          </button>

          {/* Occupied */}
          <button
            onClick={() => {
              window.location.href =
                "/rooms?status=Occupied";
            }}
            className="rounded-xl bg-white p-5 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-sm text-blue-600">
              Occupied
            </p>

            <h2 className="mt-2 text-3xl font-bold text-blue-600">
              {occupied}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              View occupied rooms →
            </p>
          </button>

          {/* Reserved */}
          <button
            onClick={() => {
              window.location.href =
                "/rooms?status=Reserved";
            }}
            className="rounded-xl bg-white p-5 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-sm text-yellow-600">
              Reserved
            </p>

            <h2 className="mt-2 text-3xl font-bold text-yellow-600">
              {reserved}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              View reserved rooms →
            </p>
          </button>

          {/* Cleaning */}
          <button
            onClick={() => {
              window.location.href =
                "/rooms?status=Cleaning";
            }}
            className="rounded-xl bg-white p-5 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-sm text-orange-600">
              Cleaning
            </p>

            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {cleaning}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              View cleaning rooms →
            </p>
          </button>

          {/* Maintenance */}
          <button
            onClick={() => {
              window.location.href =
                "/rooms?status=Maintenance";
            }}
            className="rounded-xl bg-white p-5 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-sm text-red-600">
              Maintenance
            </p>

            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {maintenance}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              View maintenance rooms →
            </p>
          </button>
        </div>

        {/* Occupancy */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Occupancy Rate
            </h2>

            <span className="text-2xl font-bold text-blue-600">
              {occupancy}%
            </span>
          </div>

          <div className="h-4 w-full rounded-full bg-gray-200">
            <div
              className="h-4 rounded-full bg-blue-600 transition-all"
              style={{
                width: `${occupancy}%`,
              }}
            />
          </div>
        </div>

                 {/* Operational Alerts */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">
            Operational Alerts
        </h2>

        {alerts.cleaning_rooms === 0 &&
        alerts.maintenance_rooms === 0 &&
        alerts.overdue_checkouts === 0 ? (
            <div className="rounded-lg bg-green-50 p-4 text-green-700">
            No operational alerts at the moment.
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-3">

            {alerts.cleaning_rooms > 0 && (
                <div className="rounded-lg bg-orange-50 p-4">
                <p className="text-sm text-orange-600">
                    Rooms Needing Cleaning
                </p>
                <p className="mt-1 text-2xl font-bold text-orange-700">
                    {alerts.cleaning_rooms}
                </p>
                </div>
            )}

            {alerts.maintenance_rooms > 0 && (
                <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-600">
                    Rooms Under Maintenance
                </p>
                <p className="mt-1 text-2xl font-bold text-red-700">
                    {alerts.maintenance_rooms}
                </p>
                </div>
            )}

            {alerts.overdue_checkouts > 0 && (
                <div className="rounded-lg bg-yellow-50 p-4">
                <p className="text-sm text-yellow-600">
                    Overdue Check-outs
                </p>
                <p className="mt-1 text-2xl font-bold text-yellow-700">
                    {alerts.overdue_checkouts}
                </p>
                </div>
            )}

            </div>
        )}
        </div>

        {/* Today's Activity + Quick Actions */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">

          {/* Today's Activity */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">
              Today's Activity
            </h2>

            <div className="space-y-4">

              {/* Check-ins */}
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <span>
                  Today's Check-ins
                </span>

                <span className="text-xl font-bold">
                  {todaysCheckIns}
                </span>
              </div>

              {/* Check-outs */}
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <span>
                  Today's Check-outs
                </span>

                <span className="text-xl font-bold">
                  {todaysCheckOuts}
                </span>
              </div>

              {/* Current Guests */}
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <span>
                  Current Guests
                </span>

                <span className="text-xl font-bold">
                  {dashboard.current_guests}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">
              Quick Actions
            </h2>

            <div className="grid gap-3">

              <button
                onClick={() => {
                  window.location.href =
                    "/rooms/new";
                }}
                className="rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
              >
                Add Room
              </button>

              <button
                onClick={() => {
                  window.location.href =
                    "/guests/new";
                }}
                className="rounded-lg bg-green-600 py-3 font-medium text-white hover:bg-green-700"
              >
                Add Guest
              </button>

              <button
                onClick={() => {
                  window.location.href =
                    "/reservations/new";
                }}
                className="rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700"
              >
                Add Reservation
              </button>

            </div>
          </div>
        </div>

        {/* Upcoming Check-ins */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Upcoming Check-ins
          </h2>

          {upcoming.length === 0 ? (
            <p className="text-gray-500">
              No upcoming reservations.
            </p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {reservation.guest_name}
                    </p>

                    <p className="text-sm text-gray-500">
                      Room {reservation.room_name}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-medium">
                      {new Date(
                        reservation.check_in_date +
                          "T00:00:00"
                      ).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </p>

                    <p className="text-sm text-gray-500">
                      {reservation.number_of_guests} guests
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
    
  );
}