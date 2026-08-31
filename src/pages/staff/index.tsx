import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { apiFetch, getAuth } from "@/lib/auth";

import StaffDirectory from "@/components/staff/StaffDirectory";
import StaffForm from "@/components/staff/StaffForm";
import StaffEditForm from "@/components/staff/StaffEditForm";

type Staff = {
  id: number;
  name: string;
  role: string;
  phone: string;
  email: string;
  salary: number;
  employment_date: string;
  employment_end_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type Role = "Owner" | "Manager" | "Receptionist";

export default function StaffPage() {
  const router = useRouter();

  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [role, setRole] = useState<Role | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const [name, setName] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [salary, setSalary] = useState("");
  const [employmentDate, setEmploymentDate] = useState("");
  const [employmentEndDate, setEmploymentEndDate] = useState("");
  const [active, setActive] = useState(true);

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editEmploymentDate, setEditEmploymentDate] = useState("");
  const [editEmploymentEndDate, setEditEmploymentEndDate] = useState("");
  const [editActive, setEditActive] = useState(true);

  const [statusFilter, setStatusFilter] = useState<
    "active" | "inactive" | "all"
  >("active");

  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);

  const canManage = role === "Owner" || role === "Manager";

  useEffect(() => {
    const auth = getAuth();

    if (!auth) {
      router.replace("/login");
      return;
    }

    if (
      auth.role !== "Owner" &&
      auth.role !== "Manager" &&
      auth.role !== "Receptionist"
    ) {
      router.replace("/dashboard");
      return;
    }

    setRole(auth.role as Role);
    setAuthorized(true);
  }, [router]);

  const fetchStaff = async () => {
    try {
      let endpoint = "/api/billing/staff/";

      if (statusFilter === "active") {
        endpoint += "?active=true";
      }

      if (statusFilter === "inactive") {
        endpoint += "?active=false";
      }

      const response = await apiFetch(endpoint);

      if (!response.ok) {
        throw new Error("Failed to fetch staff");
      }

      const data = await response.json();
      setStaff(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authorized) {
      return;
    }

    fetchStaff();
  }, [authorized, statusFilter]);

  const resetForm = () => {
    setName("");
    setStaffRole("");
    setPhone("");
    setEmail("");
    setSalary("");
    setEmploymentDate("");
    setEmploymentEndDate("");
    setActive(true);
  };

  const handleAddStaff = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSaving(true);

    try {
      const response = await apiFetch(
        "/api/billing/staff/",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            role: staffRole,
            phone,
            email,
            salary,
            employment_date: employmentDate,
            employment_end_date: employmentEndDate || null,
            active,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add staff");
      }

      resetForm();
      setShowForm(false);

      await fetchStaff();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (person: Staff) => {
    setEditingStaff(person);

    setEditName(person.name);
    setEditRole(person.role);
    setEditPhone(person.phone);
    setEditEmail(person.email);
    setEditSalary(String(person.salary));
    setEditEmploymentDate(person.employment_date);
    setEditEmploymentEndDate(person.employment_end_date || "");
    setEditActive(person.active);

    setShowForm(false);
  };

  const handleUpdateStaff = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!editingStaff) {
      return;
    }

    setUpdating(true);

    try {
      const response = await apiFetch(
        `/api/billing/staff/${editingStaff.id}/`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: editName,
            role: editRole,
            phone: editPhone,
            email: editEmail,
            salary: editSalary,
             employment_date: editEmploymentDate,
             employment_end_date: editEmploymentEndDate || null,
            active: editActive,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update staff");
      }

      setEditingStaff(null);

      setEditName("");
      setEditRole("");
      setEditPhone("");
      setEditEmail("");
      setEditSalary("");
      setEditEmploymentDate("");
      setEditEmploymentEndDate("");
      setEditActive(true);

      await fetchStaff();
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const cancelEdit = () => {
    setEditingStaff(null);

    setEditName("");
    setEditRole("");
    setEditPhone("");
    setEditEmail("");
    setEditSalary("");
    setEditEmploymentDate("");
    setEditEmploymentEndDate("");
    setEditActive(true);
  };

  if (!authorized) {
    return <div>Checking permissions...</div>;
  }

  if (loading) {
    return <div>Loading staff...</div>;
  }

  return (
    <div>
      
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Staff Directory
          </h1>

          <p className="mt-2 text-gray-600">
            View and manage lodge staff information.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditingStaff(null);

              if (showForm) {
                resetForm();
              }

              setShowForm(!showForm);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "Add Staff"}
          </button>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label
          htmlFor="statusFilter"
          className="text-sm font-medium text-gray-700"
        >
          Staff Status
        </label>

        <select
          id="statusFilter"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as
                | "active"
                | "inactive"
                | "all"
            )
          }
          className="rounded-lg border border-gray-300 bg-white px-3 py-2"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All Staff</option>
        </select>
      </div>

      {canManage && showForm && (
        <StaffForm
          name={name}
          role={staffRole}
          phone={phone}
          email={email}
          salary={salary}
          employmentDate={employmentDate}
          employmentEndDate={employmentEndDate}
          active={active}
          saving={saving}
          setName={setName}
          setRole={setStaffRole}
          setPhone={setPhone}
          setEmail={setEmail}
          setSalary={setSalary}
          setEmploymentDate={setEmploymentDate}
          setEmploymentEndDate={setEmploymentEndDate}
          setActive={setActive}
          onSubmit={handleAddStaff}
          onCancel={() => {
            resetForm();
            setShowForm(false);
          }}
        />
      )}

      {canManage && editingStaff && (
        <StaffEditForm
          staff={editingStaff}
          editName={editName}
          editRole={editRole}
          editPhone={editPhone}
          editEmail={editEmail}
          editSalary={editSalary}
          editEmploymentDate={editEmploymentDate}
          editEmploymentEndDate={editEmploymentEndDate}
          editActive={editActive}
          updating={updating}
          setEditName={setEditName}
          setEditRole={setEditRole}
          setEditPhone={setEditPhone}
          setEditEmail={setEditEmail}
          setEditSalary={setEditSalary}
          setEditEmploymentDate={setEditEmploymentDate}
          setEditEmploymentEndDate={setEditEmploymentEndDate}
          setEditActive={setEditActive}
          onSubmit={handleUpdateStaff}
          onCancel={cancelEdit}
        />
      )}

      <div className="mt-6">
        <StaffDirectory
          staff={staff}
          onEdit={handleEditClick}
          canManage={canManage}
        />
      </div>
    </div>
  );
}