import { useEffect } from "react";
import { useRouter } from "next/router";

import { getAuth } from "@/lib/auth";

export default function Settings() {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();

    if (!auth) {
      router.replace("/login");
      return;
    }

    if (auth.role !== "Owner" && auth.role !== "Manager") {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Settings
          </h1>

          <p className="mt-2 text-gray-600">
            Manage lodge configuration and operational
            settings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/settings/short-rest-packages"
              )
            }
            className="rounded-xl border bg-white p-6 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-xl">
              ◷
            </div>

            <h2 className="text-lg font-semibold text-gray-900">
              Short Rest Packages
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Configure fixed-duration short-rest
              packages, prices, and availability for
              your lodge.
            </p>

            <p className="mt-4 text-sm font-medium text-blue-600">
              Manage packages →
            </p>
          </button>
        </div>
      </div>
    </main>
  );
}