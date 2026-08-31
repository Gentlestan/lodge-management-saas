import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";

type Role = "Owner" | "Manager" | "Receptionist";

type NavigationItem = {
  name: string;
  href: string;
  icon: string;
  roles: Role[];
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const navigation: NavigationSection[] = [
  {
    title: "Overview",
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: "▦",
        roles: ["Owner", "Manager", "Receptionist"],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        name: "Reservations",
        href: "/reservations",
        icon: "▣",
        roles: ["Owner", "Manager", "Receptionist"],
      },
      {
        name: "Rooms",
        href: "/rooms",
        icon: "⌂",
        roles: ["Owner", "Manager", "Receptionist"],
      },
      {
        name: "Guests",
        href: "/guests",
        icon: "♙",
        roles: ["Owner", "Manager", "Receptionist"],
      },
    ],
  },
  {
  title: "Finance",
  items: [
    {
      name: "Financial Overview",
      href: "/admin/financial",
      icon: "₦",
      roles: ["Owner"],
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: "▤",
      roles: ["Owner", "Manager"],
    },
  ],
},
  {
    title: "Management",
    items: [
      {
        name: "Staff",
        href: "/staff",
        icon: "♟",
        roles: ["Owner", "Manager", "Receptionist"],
      },
      {
        name: "Salary Payments",
        href: "/staff/salaries",
        icon: "₦",
        roles: ["Owner", "Manager"],
      },
    ],
  },
];

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({
  mobileOpen,
  onClose,
}: SidebarProps) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [lodgeName, setLodgeName] = useState("Your Lodge");

  useEffect(() => {
    const auth = getAuth();

    if (!auth) {
      return;
    }

    if (
      auth.role === "Owner" ||
      auth.role === "Manager" ||
      auth.role === "Receptionist"
    ) {
      setRole(auth.role);
    }

    if (auth.lodge?.name) {
      setLodgeName(auth.lodge.name);
    }
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return router.pathname === "/dashboard";
    }

    if (href === "/reservations") {
      return (
        router.pathname === "/reservations" ||
        router.pathname.startsWith("/reservations/")
      );
    }

    if (href === "/rooms") {
      return (
        router.pathname === "/rooms" ||
        router.pathname.startsWith("/rooms/")
      );
    }

    if (href === "/guests") {
      return (
        router.pathname === "/guests" ||
        router.pathname.startsWith("/guests/")
      );
    }

    if (href === "/staff") {
      return router.pathname === "/staff";
    }

    return router.pathname === href;
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold shadow-lg shadow-blue-600/20">
            L
          </div>

          <div className="ml-3 min-w-0">
            <p className="truncate text-base font-bold tracking-tight">
              LodgeManager
            </p>

            <p className="text-xs text-slate-400">
              Management System
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          {navigation.map((section) => {
            const visibleItems = section.items.filter((item) =>
              role ? item.roles.includes(role) : false
            );

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <div
                key={section.title}
                className="mb-7 last:mb-0"
              >
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {section.title}
                </p>

                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          active
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base transition ${
                            active
                              ? "bg-white/10"
                              : "bg-white/5 group-hover:bg-white/10"
                          }`}
                        >
                          {item.icon}
                        </span>

                        <span className="ml-3 truncate">
                          {item.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Lodge / Role */}
        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-sm font-bold text-blue-400">
                {lodgeName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {lodgeName}
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  {role ?? "Account"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}