
import { useEffect, useState } from "react";

import { apiFetch, getAuth } from "@/lib/auth";

import { useRouter } from "next/router";

type AuditLog = {
  id: number;
  actor: number | null;
  actor_name: string;
  actor_role: string;
  action: string;
  action_display: string;
  content_type: number | null;
  object_id: string | null;
  object_repr: string;
  changes: Record<string, unknown>;
  details: Record<string, unknown>;
  created_at: string;
};

export default function Audit() {
  const router = useRouter();

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

    fetchAuditLogs();
  }, [router]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/api/audit/");

      if (!response.ok) {
        throw new Error("Failed to load audit logs.");
      }

      const data: AuditLog[] = await response.json();

      setAuditLogs(data);
    } catch (error) {
      console.error(error);
      setError("Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (value: string) => {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };

  const formatChanges = (changes: Record<string, unknown>) => {
    const entries = Object.entries(changes);

    if (entries.length === 0) {
      return "—";
    }

    return entries
      .map(([field, value]) => {
        if (
          typeof value === "object" &&
          value !== null &&
          "from" in value &&
          "to" in value
        ) {
          const change = value as {
            from: unknown;
            to: unknown;
          };

          return `${field}: ${String(change.from ?? "—")} → ${String(
            change.to ?? "—"
          )}`;
        }

        return `${field}: ${String(value)}`;
      })
      .join(", ");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Audit Log
          </h1>

          <p className="mt-1 text-gray-600">
            Review important activity recorded across your lodge.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-xl font-semibold text-gray-900">
              Activity Records
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {auditLogs.length} record
              {auditLogs.length === 1 ? "" : "s"}
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">
                No audit records found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-sm text-gray-600">
                  <tr>
                    <th className="px-6 py-4 font-medium">
                      Date & Time
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Actor
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Role
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Action
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Target
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Changes
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {auditLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {formatDateTime(log.created_at)}
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {log.actor_name}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        {log.actor_role || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {log.action_display}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {log.object_repr || "System event"}
                        </p>

                        {log.object_id && (
                          <p className="mt-1 text-xs text-gray-500">
                            ID: {log.object_id}
                          </p>
                        )}
                      </td>

                      <td className="min-w-[280px] px-6 py-4 text-sm text-gray-700">
                        {formatChanges(log.changes)}
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

