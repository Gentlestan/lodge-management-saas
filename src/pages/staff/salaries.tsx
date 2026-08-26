import { useEffect, useState } from "react";

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
        let url =
            "http://127.0.0.1:8000/api/billing/salary-payments/";

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

        const response = await fetch(url);

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
        const response = await fetch(
        "http://127.0.0.1:8000/api/billing/staff/?active=true"
        );

        if (!response.ok) {
        throw new Error("Failed to fetch staff");
        }

        const data = await response.json();

        setStaff(data);
    } catch (error) {
        console.error(error);
    }
};

const handleSavePayment = async (
  event: React.FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  setSaving(true);

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/billing/salary-payments/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

    setSelectedStaff("");
    setAmount("");
    setPaymentDate("");
    setSalaryMonth("");
    setNotes("");

    setShowForm(false);

    await fetchPayments();
  } catch (error) {
    console.error(error);
  } finally {
    setSaving(false);
  }
};

    useEffect(() => {
    fetchPayments();
    fetchStaff();
    }, [staffFilter, monthFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <div>Loading salary payments...</div>;
  }

  const formatSalaryMonth = (date: string) => {
  return new Date(date).toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
  });
};


const totalSalaryPaid = payments.reduce(
  (total, payment) => total + Number(payment.amount),
  0
);
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

        <div className="mb-6">
        <label
            htmlFor="staffFilter"
            className="mb-2 block text-sm font-medium text-gray-700"
        >
            Staff
        </label>

            <select
                id="staffFilter"
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
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

            <div className="mb-6">
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
                onChange={(e) => setMonthFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2"
            />
            </div>

            <button
                type="button"
                onClick={() => {
                    setStaffFilter("all");
                    setMonthFilter("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2"
                >
                Clear Filters
                </button>

    <div className="mb-6 flex justify-end">
    <button
        onClick={() => setShowForm(!showForm)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white"
    >
        {showForm ? "Cancel" : "Record Salary"}
    </button>
    </div>

    {showForm && (
    <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
        Record Salary Payment
        </h2>

        <form
        onSubmit={handleSavePayment}
        className="mt-5 space-y-4"
        >
        <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            required
            className="w-full rounded-lg border p-2"
        >
            <option value="">Select Staff</option>

            {staff.map((person) => (
            <option key={person.id} value={person.id}>
                {person.name}
            </option>
            ))}
        </select>

        <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full rounded-lg border p-2"
        />

        <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            className="w-full rounded-lg border p-2"
        />

        <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
                Salary Month
            </label>

            <input
                type="month"
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
                required
                className="w-full rounded-lg border p-2"
            />
            </div>
        <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border p-2"
        />

        <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-green-600 px-5 py-2 text-white"
        >
            {saving ? "Saving..." : "Save Payment"}
        </button>
        </form>
    </div>
    )}

            <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
            Total Salary Paid
        </p>

        <p className="mt-1 text-2xl font-bold">
            ₦{totalSalaryPaid.toLocaleString("en-NG")}
        </p>
        </div>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Staff</th>
              <th className="px-4 py-3 text-left">Position</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Salary Month</th>
              <th className="px-4 py-3 text-left">Payment Date</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b">
                <td className="px-4 py-4">
                  {payment.staff_name}
                </td>

                <td className="px-4 py-4">
                {payment.staff_role}
                </td>

                <td className="px-4 py-4">
                  {formatCurrency(payment.amount)}
                </td>

                <td className="px-4 py-4">
                  {formatSalaryMonth(payment.salary_month)}
                </td>

                <td className="px-4 py-4">
                  {payment.payment_date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}