
import { useState } from "react";

import { useRouter } from "next/router";

import { apiFetch } from "@/lib/auth";

export default function NewGuest() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [gender, setGender] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await apiFetch("/api/guests/", {
        method: "POST",
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
        throw new Error("Failed to create guest");
      }

      alert("Guest added successfully!");
      router.push("/guests");
    } catch (error) {
      console.error(error);
      setError("Unable to add guest. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        {/* HEADER */}
       <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push("/guests")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-purple-600 transition hover:text-purple-800"
        >
          <span className="text-lg">←</span>
          Back to Guests
        </button>

        

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Add Guest
          </h1>

          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Register a new guest and save their information.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-600">
              !
            </div>

            <div>
              <p className="text-sm font-semibold text-red-800">
                Unable to add guest
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          {/* BASIC INFORMATION */}
          <section className="border-b border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Guest Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the guest&apos;s basic contact information.
              </p>
            </div>

            <div className="space-y-6">
              {/* FULL NAME */}
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
                  placeholder="Enter guest full name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              {/* PHONE */}
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
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              {/* EMAIL */}
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
                  placeholder="guest@example.com"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              {/* ADDRESS */}
              <div>
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
                  placeholder="Enter guest address"
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>
            </div>
          </section>

          {/* IDENTIFICATION & PERSONAL DETAILS */}
          <section className="border-b border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Identification & Personal Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add identification and personal information where applicable.
              </p>
            </div>

            <div className="space-y-6">
              {/* ID TYPE + ID NUMBER */}
              <div className="grid gap-6 md:grid-cols-2">
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
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
                    placeholder="Enter ID number"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
              </div>

              {/* GENDER */}
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </section>

          {/* NOTES */}
          <section className="border-b border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Additional Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add any additional information that may be useful for the
                lodge.
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
                placeholder="Enter any additional notes about this guest..."
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              />
            </div>
          </section>

          {/* ACTIONS */}
          <section className="flex flex-col-reverse gap-3 bg-slate-50 p-6 sm:flex-row sm:justify-end sm:p-8">
            <button
              type="button"
              onClick={() => router.push("/guests")}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Guest"}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}

