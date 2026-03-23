"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="text-base font-semibold">FleetManager</span>
        <div className="flex gap-1">
          <Link
            href="/orders"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              pathname === "/orders" || pathname === "/"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Orders
          </Link>
          <Link
            href="/drivers"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              pathname === "/drivers"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Drivers
          </Link>
        </div>
      </div>
    </nav>
  );
}
