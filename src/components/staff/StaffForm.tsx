
type StaffFormProps = {
  name: string;
  role: string;
  phone: string;
  email: string;
  salary: string;
  employmentDate: string;
  employmentEndDate: string;
  active: boolean;
  saving: boolean;
  setName: (value: string) => void;
  setRole: (value: string) => void;
  setPhone: (value: string) => void;
  setEmail: (value: string) => void;
  setSalary: (value: string) => void;
  setEmploymentDate: (value: string) => void;
  setEmploymentEndDate: (value: string) => void;
  setActive: (value: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export default function StaffForm({
  name,
  role,
  phone,
  email,
  salary,
  employmentDate,
  employmentEndDate,
  active,
  saving,
  setName,
  setRole,
  setPhone,
  setEmail,
  setSalary,
  setEmploymentDate,
  setEmploymentEndDate,
  setActive,
  onSubmit,
  onCancel,
}: StaffFormProps) {
  return (
    <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Add Staff
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Add a new staff member to your lodge.
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
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="e.g. John Adebayo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Role / Position
          </label>

          <input
            type="text"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="e.g. Receptionist"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Phone
          </label>

          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="e.g. 08012345678"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="e.g. john@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Salary
          </label>

          <input
            type="number"
            value={salary}
            onChange={(event) => setSalary(event.target.value)}
            required
            min="0"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="e.g. 90000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Employment Date
          </label>

          <input
            type="date"
            value={employmentDate}
            onChange={(event) => setEmploymentDate(event.target.value)}
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
            value={employmentEndDate}
            onChange={(event) => setEmploymentEndDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />

          <p className="mt-1 text-xs text-gray-500">
            Leave blank if the staff member is still employed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />

          <label className="text-sm font-medium text-gray-700">
            Active
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {saving ? "Saving..." : "Save Staff"}
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

