
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

type StaffDirectoryProps = {
  staff: Staff[];
  onEdit: (person: Staff) => void;
  canManage: boolean;
};

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function StaffDirectory({
  staff,
  onEdit,
  canManage,
}: StaffDirectoryProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="border-b bg-gray-50 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Staff Directory
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          View lodge staff contact information, employment history, and
          current status.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Name
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Position
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Contact
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Employment
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Status
              </th>

              {canManage && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Action
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 6 : 5}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
                  No staff members found.
                </td>
              </tr>
            ) : (
              staff.map((person) => (
                <tr
                  key={person.id}
                  className="border-b last:border-b-0"
                >
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-900">
                      {person.name}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-gray-700">
                    {person.role}
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700">
                        {person.phone || "No phone"}
                      </p>

                      <p className="text-gray-500">
                        {person.email || "No email"}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700">
                        <span className="font-medium">Since:</span>{" "}
                        {formatDate(person.employment_date)}
                      </p>

                      <p className="text-gray-500">
                        <span className="font-medium">
                          {person.employment_end_date
                            ? "Ended:"
                            : "End:"}
                        </span>{" "}
                        {formatDate(person.employment_end_date)}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={
                        person.active
                          ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                          : "rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                      }
                    >
                      {person.active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {canManage && (
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => onEdit(person)}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
