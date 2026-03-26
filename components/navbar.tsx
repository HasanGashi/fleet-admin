"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Users,
  Menu,
  X,
  Truck,
  Map,
  History,
} from "lucide-react";

const navItems = [
  {
    href: "/orders",
    label: "Orders",
    icon: ClipboardList,
    match: ["/orders", "/"],
  },
  { href: "/drivers", label: "Drivers", icon: Users, match: ["/drivers"] },
  { href: "/map", label: "Map", icon: Map, match: ["/map"] },
  { href: "/history", label: "History", icon: History, match: ["/history"] },
];

export function Navbar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-background transition-all duration-300 h-full min-h-screen",
        collapsed ? "w-16" : "w-56",
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-3 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm font-semibold">FleetManager</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            collapsed && "mx-auto",
          )}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {navItems.map(({ href, label, icon: Icon, match }) => {
          const active = match.includes(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
