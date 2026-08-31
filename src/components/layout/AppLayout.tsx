
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { logout, getAuth } from "@/lib/auth";
import Sidebar from "./Sidebar";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({
  children,
}: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");

  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();

    if (auth) {
      setUserName(auth.user.username);
      setUserRole(auth.role);
    }
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 lg:hidden"
                aria-label="Open navigation"
              >
                <span className="text-xl">☰</span>
              </button>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Lodge Management
                </p>

                <p className="hidden text-xs text-slate-500 sm:block">
                  Manage your lodge operations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
                aria-label="Notifications"
              >
                <span className="text-lg">🔔</span>

                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600" />
              </button>

              <div className="hidden h-9 w-px bg-slate-200 sm:block" />

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold uppercase text-blue-700">
                  {userName ? userName.charAt(0) : "U"}
                </div>

                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900">
                    {userName || "User"}
                  </p>

                  <p className="text-xs text-slate-500">
                    {userRole || "Staff"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                Logout
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

