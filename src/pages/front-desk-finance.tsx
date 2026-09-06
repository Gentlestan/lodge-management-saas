import { useEffect, useState } from "react";
import { apiFetch, getAuth } from "@/lib/auth";
import { useRouter } from "next/router";

type Payment = {
  id: number;
  reservation: number;
  guest_name: string;
  room_name: string;
  amount: string;
  payment_method: string;
  reference: string;
  notes: string;
  recorded_by: string;
  created_at: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total_count: number;
  has_next: boolean;
  has_previous: boolean;
};

type FrontDeskFinanceData = {
  date: string;

  period: {
    filter: string;
    start_date: string;
    end_date: string;
  };

  selected_total: string;
  cash_total: string;
  transfer_total: string;
  pos_total: string;
  other_total: string;
  selected_payment_count: number;

  payments: Payment[];

  pagination: Pagination;
};

type DateFilter =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "custom";

export default function FrontDeskFinancePage() {
  const router = useRouter();

  const [data, setData] =
    useState<FrontDeskFinanceData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState("All");

  const [dateFilter, setDateFilter] =
    useState<DateFilter>("today");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);

  const pageSize = 20;

  useEffect(() => {
    const auth = getAuth();

    if (!auth) {
      router.replace("/login");
      return;
    }

    const allowedRoles = [
      "Owner",
      "Manager",
      "Receptionist",
    ];

    if (!allowedRoles.includes(auth.role)) {
      router.replace("/dashboard");
      return;
    }

    loadFinance();
  }, [
    router,
    search,
    paymentMethod,
    dateFilter,
    startDate,
    endDate,
    page,
  ]);

  const loadFinance = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("date", dateFilter);
      params.set("page", String(page));
      params.set("page_size", String(pageSize));

      if (search.trim()) {
        params.set(
          "search",
          search.trim()
        );
      }

      if (paymentMethod !== "All") {
        params.set(
          "payment_method",
          paymentMethod
        );
      }

      if (dateFilter === "custom") {
        if (startDate) {
          params.set(
            "start_date",
            startDate
          );
        }

        if (endDate) {
          params.set(
            "end_date",
            endDate
          );
        }
      }

      const response = await apiFetch(
        `/api/billing/front-desk-finance/?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load front desk finance."
        );
      }

      const result =
        (await response.json()) as FrontDeskFinanceData;

      setData(result);
    } catch (err) {
      console.error(
        "Failed to load front desk finance:",
        err
      );

      setError(
        "Unable to load front desk finance information."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (
    value: string | number
  ) => {
    return `₦${Number(value).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDateTime = (value: string) => { 
    return new Date(value).toLocaleString("en-NG", { 
        day: "numeric", 
        month: "short", 
        hour: "numeric", 
        minute: "2-digit", 
        hour12: true, 
    }); 
};

  const getPeriodLabel = () => {
    switch (dateFilter) {
      case "today":
        return "Today";

      case "yesterday":
        return "Yesterday";

      case "this_week":
        return "This Week";

      case "this_month":
        return "This Month";

      case "custom":
        return "Custom Period";

      default:
        return "Selected Period";
    }
  };

  const clearFilters = () => {
    setSearch("");
    setPaymentMethod("All");
    setDateFilter("today");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleDateFilterChange = (
    value: DateFilter
  ) => {
    setDateFilter(value);
    setPage(1);

    if (value !== "custom") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleSearchChange = (
    value: string
  ) => {
    setSearch(value);
    setPage(1);
  };

  const handlePaymentMethodChange = (
    value: string
  ) => {
    setPaymentMethod(value);
    setPage(1);
  };

  const handleStartDateChange = (
    value: string
  ) => {
    setStartDate(value);
    setPage(1);
  };

  const handleEndDateChange = (
    value: string
  ) => {
    setEndDate(value);
    setPage(1);
  };

  if (loading && !data) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-gray-600">
            Loading front desk finance...
          </p>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="text-red-700">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const totalCount =
    data.pagination?.total_count ?? 0;

  const currentPage =
    data.pagination?.page ?? page;

  const currentPageSize =
    data.pagination?.page_size ?? pageSize;

  const startResult =
    totalCount === 0
      ? 0
      : (currentPage - 1) *
          currentPageSize +
        1;

  const endResult = Math.min(
    currentPage * currentPageSize,
    totalCount
  );

  const periodLabel =
    getPeriodLabel();

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Front Desk Finance
          </h1>

          <p className="mt-1 text-gray-500">
            Track payments and front desk
            collections by selected period.
          </p>

          <p className="mt-2 text-sm text-gray-400">
            {periodLabel}

            {data.period?.start_date && (
              <>
                {" — "}
                {new Date(
                  `${data.period.start_date}T00:00:00`
                ).toLocaleDateString(
                  "en-NG"
                )}
              </>
            )}

            {data.period?.end_date &&
              data.period.end_date !==
                data.period.start_date && (
                <>
                  {" to "}
                  {new Date(
                    `${data.period.end_date}T00:00:00`
                  ).toLocaleDateString(
                    "en-NG"
                  )}
                </>
              )}
          </p>
        </div>

        {/* Selected Period Total */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total Collected — {periodLabel}
          </p>

          <p className="mt-2 text-4xl font-bold text-gray-800">
            {formatCurrency(
              data.selected_total
            )}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            {data.selected_payment_count} payment
            {data.selected_payment_count === 1
              ? ""
              : "s"} received
            {dateFilter === "today"
              ? " today"
              : ""}
          </p>
        </div>

        {/* Payment Method Cards */}
        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Cash
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-800">
              {formatCurrency(
                data.cash_total
              )}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Transfer
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-800">
              {formatCurrency(
                data.transfer_total
              )}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              POS
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-800">
              {formatCurrency(
                data.pos_total
              )}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Other
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-800">
              {formatCurrency(
                data.other_total
              )}
            </p>
          </div>

        </div>

        {/* Transactions */}
        <div className="rounded-xl bg-white shadow-sm">

          <div className="border-b border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Payment Transactions
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Search and filter payment
              transactions for the selected
              period.
            </p>
          </div>

          {/* Filters */}
          <div className="border-b border-gray-200 bg-gray-50 p-6">

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

              {/* Search */}
              <div className="lg:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Search
                </label>

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    handleSearchChange(
                      e.target.value
                    )
                  }
                  placeholder="Guest name, room, or reference..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Date
                </label>

                <select
                  value={dateFilter}
                  onChange={(e) =>
                    handleDateFilterChange(
                      e.target.value as DateFilter
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                >
                  <option value="today">
                    Today
                  </option>

                  <option value="yesterday">
                    Yesterday
                  </option>

                  <option value="this_week">
                    This Week
                  </option>

                  <option value="this_month">
                    This Month
                  </option>

                  <option value="custom">
                    Custom
                  </option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Payment Method
                </label>

                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    handlePaymentMethodChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                >
                  <option value="All">
                    All Methods
                  </option>

                  <option value="Cash">
                    Cash
                  </option>

                  <option value="Transfer">
                    Transfer
                  </option>

                  <option value="POS">
                    POS
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

            </div>

            {/* Custom Dates */}
            {dateFilter === "custom" && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                      handleStartDateChange(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    End Date
                  </label>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) =>
                      handleEndDateChange(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                  />
                </div>

              </div>
            )}

            {/* Clear */}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Clear Filters
              </button>
            </div>

          </div>

          {/* Loading */}
          {loading && (
            <div className="border-b border-gray-200 px-6 py-3">
              <p className="text-sm text-gray-500">
                Updating transactions...
              </p>
            </div>
          )}

          {/* Error */}
          {error && data && (
            <div className="border-b border-red-200 bg-red-50 px-6 py-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Table */}
          {data.payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No payment transactions match
              the selected filters.
            </div>
          ) : (
            <>
              
            <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Guest
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Room
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Amount
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Method
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Recorded By
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date
                    </th>
                </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                {data.payments.map((payment) => (
                    <tr
                    key={payment.id}
                    className="hover:bg-gray-50"
                    >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800">
                        {payment.guest_name || "Unknown Guest"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {payment.room_name || "No Room"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-800">
                        {formatCurrency(payment.amount)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {payment.payment_method}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {payment.recorded_by || "Unknown"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDateTime(payment.created_at)}
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>



              {/* Pagination */}
              <div className="flex flex-col gap-4 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-700">
                    {startResult}
                  </span>{" "}
                  –{" "}
                  <span className="font-medium text-gray-700">
                    {endResult}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-700">
                    {totalCount}
                  </span>{" "}
                  payments
                </p>

                <div className="flex items-center gap-2">

                  <button
                    type="button"
                    disabled={
                      !data.pagination.has_previous ||
                      loading
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            current - 1,
                            1
                          )
                      )
                    }
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="px-3 text-sm text-gray-600">
                    Page {currentPage}
                  </span>

                  <button
                    type="button"
                    disabled={
                      !data.pagination.has_next ||
                      loading
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          current + 1
                      )
                    }
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>

                </div>

              </div>
            </>
          )}

        </div>
      </div>
    </main>
  );
}