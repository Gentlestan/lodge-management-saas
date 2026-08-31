import { useEffect, useState } from "react";
import { apiFetch, getAuth } from "@/lib/auth";
import { useRouter } from "next/router";

type ExpenseCategory = {
  id: number;
  name: string;
  description?: string;
  active: boolean;
};

type Expense = {
  id: number;
  category: number;
  category_name?: string;
  description: string;
  amount: number;
  date: string;
  notes?: string;
  created_at: string;
};

export default function Expenses() {
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const [showCategoryForm, setShowCategoryForm] = useState(false);

 const [categoryName, setCategoryName] = useState("");
 const [categoryDescription, setCategoryDescription] =
  useState("");

 const [savingCategory, setSavingCategory] = useState(false);

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

    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const [expensesResponse, categoriesResponse] =
        await Promise.all([
          apiFetch("/api/billing/expenses/"),
          apiFetch("/api/billing/expense-categories/?active=true"),
        ]);

      if (!expensesResponse.ok) {
        throw new Error("Failed to load expenses.");
      }

      if (!categoriesResponse.ok) {
        throw new Error("Failed to load expense categories.");
      }

      const expensesData: Expense[] =
        await expensesResponse.json();

      const categoriesData: ExpenseCategory[] =
        await categoriesResponse.json();

      setExpenses(expensesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);
      setError("Unable to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!description || !amount || !date || !category) {
      setError("Please complete all required fields.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await apiFetch("/api/billing/expenses/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: Number(category),
          description,
          amount: Number(amount),
          date,
          notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.detail || "Failed to add expense."
        );
      }

      setDescription("");
      setAmount("");
      setDate("");
      setCategory("");
      setNotes("");

      setShowForm(false);

      await fetchData();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to add expense."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async (
  event: React.FormEvent
) => {
  event.preventDefault();

  if (!categoryName.trim()) {
    setError("Category name is required.");
    return;
  }

  setSavingCategory(true);
  setError("");

  try {
    const response = await apiFetch(
      "/api/billing/expense-categories/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: categoryName,
          description: categoryDescription,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);

      throw new Error(
        data?.detail || "Unable to create category."
      );
    }

    setCategoryName("");
    setCategoryDescription("");
    setShowCategoryForm(false);

    await fetchData();
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Unable to create category."
    );
  } finally {
    setSavingCategory(false);
  }
};

const handleDeactivateCategory = async (
  id: number
) => {
  const confirmed = window.confirm(
    "Deactivate this category?"
  );

  if (!confirmed) return;

  try {
    const response = await apiFetch(
      `/api/billing/expense-categories/${id}/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed.");
    }

    await fetchData();
  } catch {
    setError("Unable to deactivate category.");
  }
};

  const handleDeleteExpense = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        `/api/billing/expenses/${id}/`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete expense.");
      }

      setExpenses((current) =>
        current.filter((expense) => expense.id !== id)
      );
    } catch (error) {
      console.error(error);
      setError("Unable to delete expense.");
    }
  };

  const filteredExpenses = categoryFilter
    ? expenses.filter(
        (expense) =>
          String(expense.category) === categoryFilter
      )
    : expenses;

  const totalExpenses = filteredExpenses.reduce(
    (total, expense) =>
      total + Number(expense.amount),
    0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">
          Loading expenses...
        </p>
      </div>
    );
  }

  
return (
  <div className="min-h-screen bg-gray-50 p-6">
    <div className="mx-auto max-w-7xl">

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Expenses
          </h1>

          <p className="mt-1 text-gray-600">
            Record and manage lodge expenses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError("");
            setShowForm((current) => !current);
          }}
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Add Expense"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* SUMMARY */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Recorded Expenses
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {filteredExpenses.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total Amount
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
      </div>

      {/* EXPENSE CATEGORIES */}
      <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Expense Categories
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Categories for general lodge expenses only.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowCategoryForm(!showCategoryForm)
            }
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            {showCategoryForm ? "Cancel" : "New Category"}
          </button>
        </div>

        {showCategoryForm && (
          <form
            onSubmit={handleAddCategory}
            className="mt-5 rounded-lg border p-4"
          >
            <div className="grid gap-4 md:grid-cols-2">

              {/* Category Name */}
              <div>
                <label className="text-sm font-medium">
                  Category Name
                </label>

                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) =>
                    setCategoryName(e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="Electricity"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium">
                  Description
                </label>

                <input
                  type="text"
                  value={categoryDescription}
                  onChange={(e) =>
                    setCategoryDescription(e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingCategory}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white"
              >
                {savingCategory
                  ? "Saving..."
                  : "Create Category"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {item.name}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {item.description || "No description"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleDeactivateCategory(item.id)
                }
                className="mt-3 text-sm font-medium text-red-600"
              >
                Deactivate
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ADD EXPENSE FORM */}
      {showForm && (
        <form
          onSubmit={handleAddExpense}
          className="mt-6 rounded-xl border bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-semibold text-gray-900">
            Add Expense
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>

              <input
                type="text"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="e.g. Generator fuel"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">
                  Select category
                </option>

                {categories.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Amount
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                placeholder="0"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(e.target.value)
                }
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                rows={3}
                placeholder="Optional notes"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving ? "Saving..." : "Save Expense"}
            </button>
          </div>
        </form>
      )}

      {/* FILTER */}
      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">
          Filter by Category
        </label>

        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value)
          }
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 sm:max-w-sm"
        >
          <option value="">
            All Categories
          </option>

          {categories.map((item) => (
            <option
              key={item.id}
              value={item.id}
            >
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {/* EXPENSE LIST */}
      <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <h2 className="text-xl font-semibold text-gray-900">
            Expense Records
          </h2>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">
              No expenses found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-sm text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-medium">
                    Date
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Description
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Category
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Amount
                  </th>

                  <th className="px-6 py-4 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {expense.date}
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {expense.description}
                      </p>

                      {expense.notes && (
                        <p className="mt-1 text-sm text-gray-500">
                          {expense.notes}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {expense.category_name ||
                        categories.find(
                          (item) =>
                            item.id === expense.category
                        )?.name ||
                        "—"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(
                        Number(expense.amount)
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteExpense(
                            expense.id
                          )
                        }
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  </div>
);

}