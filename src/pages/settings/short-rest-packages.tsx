import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { apiFetch, getAuth } from "@/lib/auth";

type ShortRestPackage = {
  id: number;
  name: string;
  duration_hours: number;
  price: string | number;
  active: boolean;
};

export default function ShortRestPackages() {
  const router = useRouter();

  const [packages, setPackages] = useState<ShortRestPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    if (!auth) {
      router.replace("/login");
      return;
    }

    if (auth.role !== "Owner" && auth.role !== "Manager") {
      router.replace("/dashboard");
      return;
    }

    fetchPackages();
  }, [router]);

  const fetchPackages = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(
        "/api/short-rest-packages/"
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load short-rest packages."
        );
      }

      const data: ShortRestPackage[] = await response.json();

      setPackages(data);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load packages."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDurationHours("");
    setPrice("");
    setActive(true);
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    const trimmedName = name.trim();
    const duration = Number(durationHours);
    const amount = Number(price);

    if (!trimmedName) {
      setError("Package name is required.");
      return;
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      setError("Duration must be greater than 0.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Price must be greater than 0.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: trimmedName,
        duration_hours: duration,
        price: amount.toFixed(2),
        active,
      };

      const url = editingId
        ? `/api/short-rest-packages/${editingId}/`
        : "/api/short-rest-packages/";

      const method = editingId ? "PATCH" : "POST";

      const response = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.detail || "Failed to save short-rest package."
        );
      }

      resetForm();
      await fetchPackages();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save package."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: ShortRestPackage) => {
    setError("");

    setEditingId(item.id);
    setName(item.name);
    setDurationHours(String(item.duration_hours));
    setPrice(String(item.price));
    setActive(item.active);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-gray-600">
            Loading short-rest packages...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Settings
          </button>

          <h1 className="text-3xl font-bold text-gray-900">
            Short Rest Packages
          </h1>

          <p className="mt-2 text-gray-600">
            Configure the fixed-duration short-rest packages
            available for reservations.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingId ? "Edit Package" : "Add Package"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Prices are configured separately for each lodge.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Package Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="e.g. 2 Hours"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Duration (Hours)
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={durationHours}
                onChange={(event) =>
                  setDurationHours(event.target.value)
                }
                placeholder="2"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Price
              </label>

              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ₦
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(event) =>
                    setPrice(event.target.value)
                  }
                  placeholder="7000"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) =>
                    setActive(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />

                Active
              </label>
            </div>

            <div className="flex gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Package"
                  : "Add Package"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-xl font-semibold text-gray-900">
              Package List
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Inactive packages remain available for historical
              reservations but cannot be selected for new
              bookings.
            </p>
          </div>

          {packages.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">
                No short-rest packages have been created yet.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {packages.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {item.name}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {item.duration_hours}{" "}
                      {item.duration_hours === 1
                        ? "hour"
                        : "hours"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-gray-900">
                      ₦
                      {Number(item.price).toLocaleString(
                        "en-NG"
                      )}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}