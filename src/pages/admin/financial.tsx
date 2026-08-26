
import { useEffect, useState } from "react";

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
  period_staff_expenses: number | null;
  period_expenses: number | null;
  period_profit: number | null;

  profit: number;
};

export default function Financial() {
 const [financial, setFinancial] =
  useState<FinancialSummary | null>(null);

const [periodFinancial, setPeriodFinancial] =
  useState<FinancialSummary | null>(null);

const [loading, setLoading] = useState(true);

const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchFinancialSummary = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/billing/financial-summary/"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch financial summary");
        }

        const data = await response.json();

        setFinancial(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialSummary();
  }, []);

  const fetchPeriodFinancialSummary = async () => {
    if (!startDate || !endDate) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/billing/financial-summary/?start_date=${startDate}&end_date=${endDate}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch period financial summary"
        );
      }

      const data = await response.json();

      setPeriodFinancial(data);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <div>Loading financial summary...</div>;
  }

  if (!financial) {
    return <div>Unable to load financial summary.</div>;
  }



const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
};



  return (
    <div  className="min-h-screen bg-gray-50 p-6">
     
        <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
            Financial Overview
        </h1>

        <p className="mt-2 text-gray-600">
            Monitor lodge income, expenses, and profitability.
        </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
            Total Income
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(financial.total_income)}
            </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
            Total Expenses
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(financial.total_expenses)}
            </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
            Overall Profit
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(financial.profit)}
            </p>
        </div>
        </div>



      
        <div className="mt-10">
        <h2 className="text-2xl font-bold text-gray-900">
            Today
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
                Income
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.today_income)}
            </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
                General Expenses
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.today_expenses)}
            </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
                Staff Expenses
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.today_staff_expenses)}
            </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
                Total Expenses
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.today_total_expenses)}
            </p>
            </div>
        </div>

        <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
            Today's Profit / Loss
            </p>

            <p
            className={`mt-2 text-3xl font-bold ${
                financial.today_profit < 0
                ? "text-red-600"
                : "text-green-600"
            }`}
            >
            {formatCurrency(financial.today_profit)}
            </p>
        </div>
        </div>
      
        <div className="mt-10">
        <h2 className="text-2xl font-bold text-gray-900">
            This Week
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
                Income
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.week_income)}
            </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
                General Expenses
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.week_expenses)}
            </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
                Staff Expenses
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.week_staff_expenses)}
            </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
                Total Expenses
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.week_total_expenses)}
            </p>
            </div>
        </div>

        <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
            This Week's Profit / Loss
            </p>

            <p
            className={`mt-2 text-3xl font-bold ${
                financial.week_profit < 0
                ? "text-red-600"
                : "text-green-600"
            }`}
            >
            {formatCurrency(financial.week_profit)}
            </p>
        </div>
        </div>

        <div className="mt-10">
        <h2 className="text-2xl font-bold text-gray-900">
            This Month
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
                Income
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.month_income)}
            </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
                General Expenses
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.month_expenses)}
            </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
                Staff Expenses
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.month_staff_expenses)}
            </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
                Total Expenses
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(financial.month_total_expenses)}
            </p>
            </div>
        </div>

        <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
            This Month's Profit / Loss
            </p>

            <p
            className={`mt-2 text-3xl font-bold ${
                financial.month_profit < 0
                ? "text-red-600"
                : "text-green-600"
            }`}
            >
            {formatCurrency(financial.month_profit)}
            </p>
        </div>
        </div>



      
        <div className="mt-10">
        <h2 className="text-2xl font-bold text-gray-900">
            Custom Period
        </h2>

        <p className="mt-2 text-gray-600">
            View financial performance between two selected dates.
        </p>

        <div className="mt-4 rounded-xl border bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
            </div>

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
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
            </div>
            </div>

            <button
            onClick={fetchPeriodFinancialSummary}
            disabled={!startDate || !endDate}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
            View Period
            </button>
        </div>

        {periodFinancial && (
            <div className="mt-4">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Period Results
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-gray-500">
                    Income
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatCurrency(periodFinancial.period_income ?? 0)}
                </p>
                </div>

                <div className="rounded-xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-gray-500">
                    General Expenses
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatCurrency(
                    (periodFinancial.period_expenses ?? 0) -
                    (periodFinancial.period_staff_expenses ?? 0)
                    )}
                </p>
                </div>

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

                <div className="rounded-xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-gray-500">
                    Total Expenses
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatCurrency(
                    periodFinancial.period_expenses ?? 0
                    )}
                </p>
                </div>
            </div>

            <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-gray-500">
                Period Profit / Loss
                </p>

                <p
                className={`mt-2 text-3xl font-bold ${
                    (periodFinancial.period_profit ?? 0) < 0
                    ? "text-red-600"
                    : "text-green-600"
                }`}
                >
                {formatCurrency(periodFinancial.period_profit ?? 0)}
                </p>
            </div>
            </div>
        )}
        </div>
    </div>
  );
}
