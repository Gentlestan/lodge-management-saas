
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch, getAuth } from "../../lib/auth";

type FinancialSummary = {
  total_income: number;

  today_income: number;
  today_expenses: number;
  today_staff_expenses: number;
  today_total_expenses: number;
  today_profit: number;

  week_income: number;
  week_expenses: number;
  week_staff_expenses: number;
  week_total_expenses: number;
  week_profit: number;

  month_income: number;
  month_expenses: number;
  month_staff_expenses: number;
  month_total_expenses: number;
  month_profit: number;

  staff_expenses: number;
  total_expenses: number;

  period_income: number | null;
  period_general_expenses: number | null;
  period_staff_expenses: number | null;
  period_total_expenses: number | null;
  period_profit: number | null;

  profit: number;
};

export default function Financial() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);

  const [financial, setFinancial] =
    useState<FinancialSummary | null>(null);

  const [periodFinancial, setPeriodFinancial] =
    useState<FinancialSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [periodError, setPeriodError] = useState("");

  /*
   * Check authentication and Owner permission.
   */
  useEffect(() => {
    const auth = getAuth();

    if (!auth) {
      router.replace("/login");
      return;
    }

    if (auth.role !== "Owner") {
      router.replace("/dashboard");
      return;
    }

    setAuthorized(true);
  }, [router]);

  /*
   * Load overall financial summary.
   */
  useEffect(() => {
    if (!authorized) return;

    const fetchFinancialSummary = async () => {
      try {
        const response = await apiFetch(
          "/api/billing/financial-summary/"
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch financial summary"
          );
        }

        const data: FinancialSummary = await response.json();

        setFinancial(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialSummary();
  }, [authorized]);

  /*
   * Load financial summary for selected custom period.
   */
  const fetchPeriodFinancialSummary = async () => {
    setPeriodError("");

    if (!startDate || !endDate) {
      setPeriodError(
        "Please select both a start date and an end date."
      );
      return;
    }

    if (endDate < startDate) {
      setPeriodError(
        "End date cannot be earlier than the start date."
      );
      return;
    }

    setPeriodLoading(true);

    try {
      const response = await apiFetch(
        `/api/billing/financial-summary/?start_date=${startDate}&end_date=${endDate}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch period financial summary"
        );
      }

      const data: FinancialSummary = await response.json();

      setPeriodFinancial(data);
    } catch (error) {
      console.error(error);

      setPeriodError(
        "Unable to load the selected financial period."
      );
    } finally {
      setPeriodLoading(false);
    }
  };

  /*
   * Format Nigerian Naira.
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  /*
   * Profit/loss styling.
   */
  const profitClass = (amount: number) => {
    return amount < 0
      ? "text-red-600"
      : "text-green-600";
  };

  /*
   * Authorization loading.
   */
  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">
          Checking permissions...
        </p>
      </div>
    );
  }

  /*
   * Initial financial loading.
   */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">
          Loading financial summary...
        </p>
      </div>
    );
  }

  /*
   * Failed initial financial load.
   */
  if (!financial) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            Unable to load financial summary
          </h1>

          <p className="mt-2 text-gray-600">
            Please refresh the page and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">

        {/* PAGE HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Financial Overview
          </h1>

          <p className="mt-2 text-gray-600">
            Monitor lodge income, expenses, and profitability.
          </p>
        </div>

        {/* OVERALL FINANCIAL OVERVIEW */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

          {/* Total Income */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Total Income
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {formatCurrency(financial.total_income)}
            </p>
          </div>

          {/* Total Expenses */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Total Expenses
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {formatCurrency(financial.total_expenses)}
            </p>
          </div>

          {/* Overall Profit */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Overall Profit / Loss
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${profitClass(
                financial.profit
              )}`}
            >
              {formatCurrency(financial.profit)}
            </p>
          </div>
        </div>

        {/* TODAY */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Today
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Financial activity recorded today.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Income */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Income
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.today_income)}
              </p>
            </div>

            {/* General Expenses */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                General Expenses
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.today_expenses)}
              </p>
            </div>

            {/* Staff Expenses */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Staff Expenses
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(
                  financial.today_staff_expenses
                )}
              </p>
            </div>

            {/* Total Expenses */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Total Expenses
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(
                  financial.today_total_expenses
                )}
              </p>
            </div>
          </div>

          {/* Today's Profit */}
          <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Today's Profit / Loss
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${profitClass(
                financial.today_profit
              )}`}
            >
              {formatCurrency(financial.today_profit)}
            </p>
          </div>
        </section>

        {/* THIS WEEK */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-gray-900">
            This Week
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Financial activity from the beginning of this week
            through today.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Income */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Income
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.week_income)}
              </p>
            </div>

            {/* General Expenses */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                General Expenses
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.week_expenses)}
              </p>
            </div>

            {/* Staff Expenses */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Staff Expenses
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(
                  financial.week_staff_expenses
                )}
              </p>
            </div>

            {/* Total Expenses */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Total Expenses
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(
                  financial.week_total_expenses
                )}
              </p>
            </div>
          </div>

          {/* Weekly Profit */}
          <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              This Week's Profit / Loss
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${profitClass(
                financial.week_profit
              )}`}
            >
              {formatCurrency(financial.week_profit)}
            </p>
          </div>
        </section>

        {/* THIS MONTH */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-gray-900">
            This Month
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Financial activity from the beginning of this month
            through today.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Income */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Income
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.month_income)}
              </p>
            </div>

            {/* General Expenses */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                General Expenses
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.month_expenses)}
              </p>
            </div>

            {/* Staff Expenses */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Staff Expenses
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(
                  financial.month_staff_expenses
                )}
              </p>
            </div>

            {/* Total Expenses */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Total Expenses
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(
                  financial.month_total_expenses
                )}
              </p>
            </div>
          </div>

          {/* Monthly Profit */}
          <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              This Month's Profit / Loss
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${profitClass(
                financial.month_profit
              )}`}
            >
              {formatCurrency(financial.month_profit)}
            </p>
          </div>
        </section>

        {/* CUSTOM PERIOD */}
        <section className="mt-10 pb-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Custom Period
          </h2>

          <p className="mt-1 text-gray-600">
            View financial performance between two selected
            dates.
          </p>

          {/* Date Selection */}
          <div className="mt-4 rounded-xl border bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* Start Date */}
              <div>
                <label
                  htmlFor="start-date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Start Date
                </label>

                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPeriodError("");
                  }}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {/* End Date */}
              <div>
                <label
                  htmlFor="end-date"
                  className="block text-sm font-medium text-gray-700"
                >
                  End Date
                </label>

                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPeriodError("");
                  }}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {/* Error */}
            {periodError && (
              <p className="mt-4 text-sm font-medium text-red-600">
                {periodError}
              </p>
            )}

            {/* Button */}
            <button
              type="button"
              onClick={fetchPeriodFinancialSummary}
              disabled={
                !startDate ||
                !endDate ||
                periodLoading
              }
              className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {periodLoading
                ? "Loading..."
                : "View Period"}
            </button>
          </div>

          {/* PERIOD RESULTS */}
          {periodFinancial && (
            <div className="mt-6">

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Period Results
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {startDate} to {endDate}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                {/* Income */}
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-gray-500">
                    Income
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      periodFinancial.period_income ?? 0
                    )}
                  </p>
                </div>

                {/* General Expenses */}
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-gray-500">
                    General Expenses
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      periodFinancial.period_general_expenses ?? 0
                    )}
                  </p>
                </div>

                {/* Staff Expenses */}
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-gray-500">
                    Staff Expenses
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      periodFinancial.period_staff_expenses ?? 0
                    )}
                  </p>
                </div>

                {/* Total Expenses */}
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-gray-500">
                    Total Expenses
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      periodFinancial.period_total_expenses ?? 0
                    )}
                  </p>
                </div>
              </div>

              {/* Period Profit */}
              <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-gray-500">
                  Period Profit / Loss
                </p>

                <p
                  className={`mt-2 text-3xl font-bold ${profitClass(
                    periodFinancial.period_profit ?? 0
                  )}`}
                >
                  {formatCurrency(
                    periodFinancial.period_profit ?? 0
                  )}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

