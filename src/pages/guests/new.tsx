import { useState } from "react";
import { useRouter } from "next/router";

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
      const response = await fetch(
        "http://127.0.0.1:8000/api/guests/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
        }
      );

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
    <main>
      <h1>Add Guest</h1>

      {error && <p>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="phoneNumber">Phone Number</label>
          <input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="idType">ID Type</label>
          <select
            id="idType"
            value={idType}
            onChange={(e) => setIdType(e.target.value)}
          >
            <option value="">Select ID Type</option>
            <option value="National ID">National ID</option>
            <option value="Driver's License">
              Driver's License
            </option>
            <option value="Passport">Passport</option>
          </select>
        </div>

        <div>
          <label htmlFor="idNumber">ID Number</label>
          <input
            id="idNumber"
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Add Guest"}
        </button>
      </form>
    </main>
  );
}