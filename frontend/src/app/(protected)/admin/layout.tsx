"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Shield,
  BarChart3,
  Activity,
  History,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminService } from "@/services/adminService";
import { toast } from "sonner";

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Moderation",
    href: "/admin/moderation",
    icon: Shield,
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "System Health",
    href: "/admin/health",
    icon: Activity,
  },
  {
    title: "Action Logs",
    href: "/admin/logs",
    icon: History,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Try to fetch admin stats - will fail if not admin
        await adminService.getStats();
        setIsAuthorized(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Access denied";
        if (message.includes("Admin access required") || message.includes("403")) {
          toast.error("You don't have permission to access the admin area");
          router.push("/");
        } else if (message.includes("401")) {
          router.push("/login");
        } else {
          // Let the page handle other errors
          setIsAuthorized(true);
        }
      }
    };

    checkAdminAccess();
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border shrink-0">
        <div className="p-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Panel
          </h2>
        </div>
        <nav className="px-3 pb-6">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
