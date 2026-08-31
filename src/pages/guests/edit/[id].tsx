
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";

type Guest = {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  address: string;
  id_type: string;
  id_number: string;
  gender: string;
  notes: string;
  active: boolean;
};

export default function EditGuest() {
  const router = useRouter();
  const { id } = router.query;

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [gender, setGender] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load guest from Django API
  useEffect(() => {
    if (!id) return;

    const fetchGuest = async () => {
      try {
        const response = await apiFetch(`/api/guests/${id}/`);

        if (!response.ok) {
          throw new Error("Guest not found");
        }

        const guest: Guest = await response.json();

        setFullName(guest.full_name || "");
        setPhoneNumber(guest.phone_number || "");
        setEmail(guest.email || "");
        setAddress(guest.address || "");
        setIdType(guest.id_type || "");
        setIdNumber(guest.id_number || "");
        setGender(guest.gender || "");
        setNotes(guest.notes || "");
      } catch (error) {
        console.error(error);
        setError("Unable to load guest.");
      } finally {
        setLoading(false);
      }
    };

    fetchGuest();
  }, [id]);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!id) return;

    setSaving(true);
    setError("");

    try {
      const response = await apiFetch(`/api/guests/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName,
          phone_number: phoneNumber,
          email: email || null,
          address: address || null,
          id_type: idType || null,
          id_number: idNumber || null,
          gender: gender || null,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error(data);
        throw new Error("Failed to update guest");
      }

      alert("Guest updated successfully!");
      router.push(`/guests/${id}`);
    } catch (error) {
      console.error(error);
      setError("Unable to update guest. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-purple-600" />
              <p className="text-sm font-medium text-slate-600">
                Loading guest...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-600">
              !
            </div>

            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Unable to Load Guest
            </h1>

            <p className="mt-2 text-sm text-slate-500">{error}</p>

            <button
              type="button"
              onClick={() => router.push("/guests")}
              className="mt-6 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
            >
              Back to Guests
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push(`/guests/${id}`)}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-purple-600 transition hover:text-purple-800"
          >
            <span className="text-lg">←</span>
            Back to Guest Profile
          </button>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Edit Guest
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Update the guest&apos;s personal and identification information.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <form onSubmit={handleUpdate}>
            {/* Personal Information */}
            <section className="border-b border-slate-200 p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Personal Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update the guest&apos;s basic contact information.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Full Name
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Phone Number
                  </label>

                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="gender"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Gender
                  </label>

                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Address
                  </label>

                  <textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>
            </section>

            {/* Identification */}
            <section className="border-b border-slate-200 p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Identification
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update the guest&apos;s identification details.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="idType"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    ID Type
                  </label>

                  <select
                    id="idType"
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="">Select ID Type</option>
                    <option value="National ID">National ID</option>
                    <option value="Driver's License">
                      Driver&apos;s License
                    </option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="idNumber"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    ID Number
                  </label>

                  <input
                    id="idNumber"
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>
            </section>

            {/* Notes */}
            <section className="border-b border-slate-200 p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Additional Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add or update any notes about this guest.
                </p>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Notes
                </label>

                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>
            </section>

            {/* Error */}
            {error && (
              <div className="px-6 pt-6 sm:px-8">
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              </div>
            )}

            {/* Actions */}
            <section className="flex flex-col gap-3 bg-slate-50 p-6 sm:flex-row sm:justify-end sm:p-8">
              <button
                type="button"
                onClick={() => router.push(`/guests/${id}`)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Update Guest"}
              </button>
            </section>
          </form>
        </div>
      </div>
    </main>
  );
}
