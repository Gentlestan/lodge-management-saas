
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

type StaffEditFormProps = {
  staff: Staff;
  editName: string;
  editRole: string;
  editPhone: string;
  editEmail: string;
  editSalary: string;
  editEmploymentDate: string;
  editEmploymentEndDate: string;
  editActive: boolean;
  updating: boolean;
  setEditName: (value: string) => void;
  setEditRole: (value: string) => void;
  setEditPhone: (value: string) => void;
  setEditEmail: (value: string) => void;
  setEditSalary: (value: string) => void;
  setEditEmploymentDate: (value: string) => void;
  setEditEmploymentEndDate: (value: string) => void;
  setEditActive: (value: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export default function StaffEditForm({
  staff,
  editName,
  editRole,
  editPhone,
  editEmail,
  editSalary,
  editEmploymentDate,
  editEmploymentEndDate,
  editActive,
  updating,
  setEditName,
  setEditRole,
  setEditPhone,
  setEditEmail,
  setEditSalary,
  setEditEmploymentDate,
  setEditEmploymentEndDate,
  setEditActive,
  onSubmit,
  onCancel,
}: StaffEditFormProps) {
  return (
    <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Staff
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Update {staff.name}&apos;s staff record.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name
          </label>

          <input
            type="text"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Role / Position
          </label>

          <input
            type="text"
            value={editRole}
            onChange={(event) => setEditRole(event.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Phone
          </label>

          <input
            type="tel"
            value={editPhone}
            onChange={(event) => setEditPhone(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>

          <input
            type="email"
            value={editEmail}
            onChange={(event) => setEditEmail(event.target.value)}
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
            onChange={(event) => setEditSalary(event.target.value)}
            required
            min="0"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Employment Date
          </label>

          <input
            type="date"
            value={editEmploymentDate}
            onChange={(event) =>
              setEditEmploymentDate(event.target.value)
            }
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Employment End Date
          </label>

          <input
            type="date"
            value={editEmploymentEndDate}
            onChange={(event) =>
              setEditEmploymentEndDate(event.target.value)
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />

          <p className="mt-1 text-xs text-gray-500">
            Leave blank if the staff member is still employed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={editActive}
            onChange={(event) => setEditActive(event.target.checked)}
          />

          <label className="text-sm font-medium text-gray-700">
            Active
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={updating}
            className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {updating ? "Updating..." : "Update Staff"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-5 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

