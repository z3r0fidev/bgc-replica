"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  Rss,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  User,
  LayoutDashboard,
  Search,
  Video,
  BookOpen
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsLoggedIn(!!token);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setIsLoggedIn(false);
    router.push("/login");
  };

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Feed", href: "/feed", icon: Rss },
    { name: "Forums", href: "/forums", icon: MessageSquare },
    { name: "Media", href: "/media/original", icon: Video },
    { name: "Stories", href: "/stories", icon: BookOpen },
    { name: "Chat", href: "/chat", icon: MessageSquare },
    { name: "Users", href: "/users", icon: Users },
    { name: "Groups", href: "/groups", icon: LayoutDashboard },
  ];
  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold sm:inline-block">BGCLive</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {isLoggedIn && navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === item.href ? "text-foreground" : "text-foreground/60"
                )}
              >
                <span className="hidden md:inline-block">{item.name}</span>
                <item.icon className="h-4 w-4 md:hidden" />
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Add search or other utilities here */}
          </div>
          <nav className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/profile/edit">
                    <User className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline-block">Profile</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/settings/security">
                    <Settings className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline-block">Settings</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline-block">Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
