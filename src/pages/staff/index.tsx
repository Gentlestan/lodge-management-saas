
import { useEffect, useState } from "react";

type Staff = {
  id: number;
  name: string;
  role: string;
  salary: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

    const [editName, setEditName] = useState("");
    const [editRole, setEditRole] = useState("");
    const [editSalary, setEditSalary] = useState("");
    const [editActive, setEditActive] = useState(true);


    const [statusFilter, setStatusFilter] = useState<
    "active" | "inactive" | "all"
    >("active");


    const [updating, setUpdating] = useState(false);



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchStaff = async () => {
    try {
      
        let url = "http://127.0.0.1:8000/api/billing/staff/";

        if (statusFilter === "active") {
        url += "?active=true";
        }

        if (statusFilter === "inactive") {
        url += "?active=false";
        }

        const response = await fetch(url);



      const data = await response.json();

      setStaff(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [statusFilter]);

  const handleAddStaff = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSaving(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/billing/staff/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            role,
            salary,
            active,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add staff");
      }

      setName("");
      setRole("");
      setSalary("");
      setActive(true);

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
    setEditSalary(String(person.salary));
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
        const response = await fetch(
        `http://127.0.0.1:8000/api/billing/staff/${editingStaff.id}/`,
        {
            method: "PUT",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            name: editName,
            role: editRole,
            salary: editSalary,
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
        setEditSalary("");
        setEditActive(true);

        await fetchStaff();
    } catch (error) {
        console.error(error);
    } finally {
        setUpdating(false);
    }
    };



  if (loading) {
    return <div>Loading staff...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Staff Management
          </h1>

          <p className="mt-1 text-gray-600">
            Manage lodge staff and their salary information.
          </p>
        </div>

        
        <div className="mt-6 flex items-center gap-3">
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
                event.target.value as "active" | "inactive" | "all"
            )
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2"
        >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All Staff</option>
        </select>
        </div>



    
        <button
        onClick={() => {
            setEditingStaff(null);
            setShowForm(!showForm);
        }}
        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
        {showForm ? "Cancel" : "Add Staff"}
        </button>


      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Add Staff
          </h2>

          <form
            onSubmit={handleAddStaff}
            className="mt-5 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>

              <input
                type="text"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value)
                }
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Salary
              </label>

              <input
                type="number"
                value={salary}
                onChange={(event) =>
                  setSalary(event.target.value)
                }
                required
                min="0"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) =>
                  setActive(event.target.checked)
                }
              />

              <label className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {saving ? "Saving..." : "Save Staff"}
            </button>
          </form>
        </div>
      )}

    
        {editingStaff && (
        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
                Edit Staff
            </h2>

            <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
                Cancel
            </button>
            </div>

            <form
            onSubmit={handleUpdateStaff}
            className="mt-5 space-y-4"
            >
            <div>
                <label className="block text-sm font-medium text-gray-700">
                Name
                </label>

                <input
                type="text"
                value={editName}
                onChange={(event) =>
                    setEditName(event.target.value)
                }
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">
                Role
                </label>

                <input
                type="text"
                value={editRole}
                onChange={(event) =>
                    setEditRole(event.target.value)
                }
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">
                Salary
                </label>

                <input
                type="number"
                value={editSalary}
                onChange={(event) =>
                    setEditSalary(event.target.value)
                }
                required
                min="0"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
            </div>

            <div className="flex items-center gap-2">
                <input
                type="checkbox"
                checked={editActive}
                onChange={(event) =>
                    setEditActive(event.target.checked)
                }
                />

                <label className="text-sm font-medium text-gray-700">
                Active
                </label>
            </div>

            <button
                type="submit"
                disabled={updating}
                className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
                {updating ? "Updating..." : "Update Staff"}
            </button>
            </form>
        </div>
        )}



      <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Name
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Role
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Salary
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Status
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {staff.map((person) => (
              <tr
                key={person.id}
                className="border-b last:border-b-0"
              >
                <td className="px-4 py-4">
                  {person.name}
                </td>

                <td className="px-4 py-4">
                  {person.role}
                </td>

                <td className="px-4 py-4">
                  {formatCurrency(person.salary)}
                </td>

                <td className="px-4 py-4">
                  {person.active ? "Active" : "Inactive"}
                </td>

                <td className="px-4 py-4">
                
            <button
            onClick={() => handleEditClick(person)}
            className="font-medium text-blue-600 hover:underline"
            >
            Edit
            </button>


                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
