import { useRouter } from "next/router";
import { useEffect, useState } from "react";

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
        const response = await fetch(
          `http://127.0.0.1:8000/api/guests/${id}/`
        );

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
      const response = await fetch(
        `http://127.0.0.1:8000/api/guests/${id}/`,
        {
          method: "PATCH",
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
      <main>
        <p>Loading guest...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <h1>Error</h1>
        <p>{error}</p>

        <button onClick={() => router.push("/guests")}>
          Back to Guests
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>Edit Guest</h1>

      {error && <p>{error}</p>}

      <form onSubmit={handleUpdate}>
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
          {saving ? "Saving..." : "Update Guest"}
        </button>
      </form>
    </main>
  );
}