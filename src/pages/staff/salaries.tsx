
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch, getAuth } from "@/lib/auth";

type SalaryPayment = {
  id: number;
  staff: number;
  staff_name: string;
  staff_role: string;
  amount: number;
  payment_date: string;
  salary_month: string;
  notes: string;
  created_at: string;
};

type Staff = {
  id: number;
  name: string;
  active: boolean;
};

export default function SalaryPaymentsPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);

  const [showForm, setShowForm] = useState(false);

  const [selectedStaff, setSelectedStaff] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [salaryMonth, setSalaryMonth] = useState("");
  const [notes, setNotes] = useState("");

  const [staffFilter, setStaffFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");

  const [saving, setSaving] = useState(false);

  const fetchPayments = async () => {
    try {
      let url = "/api/billing/salary-payments/";

      const params = new URLSearchParams();

      if (staffFilter !== "all") {
        params.append("staff", staffFilter);
      }

      if (monthFilter) {
        params.append("salary_month", `${monthFilter}-01`);
      }

      const queryString = params.toString();

      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await apiFetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch salary payments");
      }

      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await apiFetch("/api/billing/staff/?active=true");

      if (!response.ok) {
        throw new Error("Failed to fetch staff");
      }

      const data = await response.json();
      setStaff(data);
    } catch (error) {
      console.error(error);
    }
  };

  const resetPaymentForm = () => {
    setSelectedStaff("");
    setAmount("");
    setPaymentDate("");
    setSalaryMonth("");
    setNotes("");
  };

  const handleSavePayment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSaving(true);

    try {
      const response = await apiFetch(
        "/api/billing/salary-payments/",
        {
          method: "POST",
          body: JSON.stringify({
            staff: Number(selectedStaff),
            amount,
            payment_date: paymentDate,
            salary_month: `${salaryMonth}-01`,
            notes,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save salary payment");
      }

      resetPaymentForm();
      setShowForm(false);

      await fetchPayments();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

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

    setAuthorized(true);
  }, [router]);

  useEffect(() => {
    if (!authorized) {
      return;
    }

    fetchPayments();
    fetchStaff();
  }, [authorized, staffFilter, monthFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  const formatSalaryMonth = (date: string) => {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", {
      month: "long",
      year: "numeric",
    });
  };

  const formatPaymentDate = (date: string) => {
    if (!date) {
      return "—";
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const totalSalaryPaid = payments.reduce(
    (total, payment) => total + Number(payment.amount),
    0
  );

  if (!authorized) {
    return <div>Checking permissions...</div>;
  }

  if (loading) {
    return <div>Loading salary payments...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Salary Payments
        </h1>

        <p className="mt-2 text-gray-600">
          Record and view staff salary payments.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div>
          <label
            htmlFor="staffFilter"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Staff
          </label>

          <select
            id="staffFilter"
            value={staffFilter}
            onChange={(event) => setStaffFilter(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2"
          >
            <option value="all">All Staff</option>

            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="monthFilter"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Salary Month
          </label>

          <input
            id="monthFilter"
            type="month"
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setStaffFilter("all");
            setMonthFilter("");
          }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
        >
          Clear Filters
        </button>
      </div>

      {/* Record Salary Button */}
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetPaymentForm();
            }

            setShowForm(!showForm);
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Record Salary"}
        </button>
      </div>

      {/* Record Salary Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-900">
              Record Salary Payment
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Record a salary payment made to an active staff member.
            </p>
          </div>

          <form
            onSubmit={handleSavePayment}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="selectedStaff"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Staff
              </label>

              <select
                id="selectedStaff"
                value={selectedStaff}
                onChange={(event) =>
                  setSelectedStaff(event.target.value)
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
              >
                <option value="">Select Staff</option>

                {staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="amount"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Amount
              </label>

              <input
                id="amount"
                type="number"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="e.g. 150000"
              />
            </div>

            <div>
              <label
                htmlFor="paymentDate"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Payment Date
              </label>

              <input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(event) =>
                  setPaymentDate(event.target.value)
                }
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label
                htmlFor="salaryMonth"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Salary Month
              </label>

              <input
                id="salaryMonth"
                type="month"
                value={salaryMonth}
                onChange={(event) =>
                  setSalaryMonth(event.target.value)
                }
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label
                htmlFor="notes"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Notes
              </label>

              <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Optional notes"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {saving ? "Saving..." : "Save Payment"}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetPaymentForm();
                  setShowForm(false);
                }}
                className="rounded-lg border border-gray-300 px-5 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Total */}
      <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          Total Salary Paid
        </p>

        <p className="mt-1 text-2xl font-bold text-gray-900">
          {formatCurrency(totalSalaryPaid)}
        </p>
      </div>

      {/* Salary Payments Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Staff
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Position
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Amount
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Salary Month
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Payment Date
                </th>
              </tr>
            </thead>

            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No salary payments found.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-4 py-4 font-medium text-gray-900">
                      {payment.staff_name}
                    </td>

                    <td className="px-4 py-4 text-gray-700">
                      {payment.staff_role}
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>

                    <td className="px-4 py-4 text-gray-700">
                      {formatSalaryMonth(payment.salary_month)}
                    </td>

                    <td className="px-4 py-4 text-gray-700">
                      {formatPaymentDate(payment.payment_date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
