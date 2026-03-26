"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PackageCheck, Clock, Truck, TrendingUp } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

/* ─── Types ──────────────────────────────────────────────────── */

type DeliveredOrder = {
  id: string;
  created_at: string;
  updated_at: string;
  driver_id: string | null;
  drivers: { full_name: string } | null;
};

type ActiveOrder = {
  id: string;
  status: string;
};

/* ─── Period options ─────────────────────────────────────────── */

type Period = "this_week" | "this_month" | "last_month";

function getPeriodRange(period: Period): { from: Date; to: Date } {
  const now = new Date();
  if (period === "this_week") {
    const day = now.getDay(); // 0 = Sun
    const diff = day === 0 ? -6 : 1 - day; // start on Monday
    const from = new Date(now);
    from.setDate(now.getDate() + diff);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  if (period === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: now };
  }
  // last_month
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { from, to };
}

const PERIOD_LABELS: Record<Period, string> = {
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
};

/* ─── Helpers ────────────────────────────────────────────────── */

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/* ─── KPI Card ───────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("this_month");
  const { from, to } = useMemo(() => getPeriodRange(period), [period]);

  /* Delivered orders within the period */
  const { data: deliveredOrders, isLoading: loadingDelivered } = useQuery<
    DeliveredOrder[]
  >({
    queryKey: ["analytics-delivered", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, updated_at, driver_id, drivers(full_name)")
        .eq("status", "delivered")
        .gte("updated_at", from.toISOString())
        .lte("updated_at", to.toISOString())
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as DeliveredOrder[]) ?? [];
    },
  });

  /* Active orders (not delivered, not pending without assignment) */
  const { data: activeOrders, isLoading: loadingActive } = useQuery<
    ActiveOrder[]
  >({
    queryKey: ["analytics-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status")
        .in("status", ["assigned", "picked_up", "in_transit"]);
      if (error) throw error;
      return (data as ActiveOrder[]) ?? [];
    },
  });

  const loading = loadingDelivered || loadingActive;

  /* ── KPIs ── */

  const totalDeliveries = deliveredOrders?.length ?? 0;

  const avgDurationMs = useMemo(() => {
    if (!deliveredOrders || deliveredOrders.length === 0) return 0;
    const durations = deliveredOrders
      .map((o) => {
        const start = new Date(o.created_at).getTime();
        const end = new Date(o.updated_at).getTime();
        return end > start ? end - start : 0;
      })
      .filter((d) => d > 0);
    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }, [deliveredOrders]);

  const activeCount = activeOrders?.length ?? 0;

  /* ── Orders per day chart ── */

  const ordersPerDay = useMemo(() => {
    if (!deliveredOrders) return [];
    const map = new Map<string, number>();
    for (const o of deliveredOrders) {
      const dateKey = o.updated_at.slice(0, 10); // "YYYY-MM-DD"
      map.set(dateKey, (map.get(dateKey) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: formatDayLabel(date), count }));
  }, [deliveredOrders]);

  /* ── Orders per driver chart ── */

  const ordersPerDriver = useMemo(() => {
    if (!deliveredOrders) return [];
    const map = new Map<string, number>();
    for (const o of deliveredOrders) {
      const name = o.drivers?.full_name ?? "Unassigned";
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([driver, count]) => ({ driver, count }));
  }, [deliveredOrders]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Deliveries"
          value={totalDeliveries}
          icon={PackageCheck}
          loading={loadingDelivered}
        />
        <KpiCard
          label="Avg. Delivery Time"
          value={formatDuration(avgDurationMs)}
          icon={Clock}
          loading={loadingDelivered}
        />
        <KpiCard
          label="Active Orders Now"
          value={activeCount}
          icon={Truck}
          loading={loadingActive}
        />
      </div>

      {/* Orders per day chart */}
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Orders delivered per day</h2>
        </div>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : ordersPerDay.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">
            No deliveries in this period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={ordersPerDay}
              margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  borderRadius: "6px",
                  fontSize: "12px",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Bar
                dataKey="count"
                name="Orders"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Orders per driver chart */}
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Orders delivered per driver</h2>
        </div>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : ordersPerDriver.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">
            No deliveries in this period.
          </p>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(180, ordersPerDriver.length * 48)}
          >
            <BarChart
              data={ordersPerDriver}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="driver"
                width={90}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  borderRadius: "6px",
                  fontSize: "12px",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Bar
                dataKey="count"
                name="Orders"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}
