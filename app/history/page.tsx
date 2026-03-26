"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CameraIcon, SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";

/* ─── Types ──────────────────────────────────────────────────── */

type DeliveredOrder = {
  id: string;
  created_at: string;
  pickup_address: string;
  delivery_address: string;
  goods_desc: string | null;
  weight_tons: number | null;
  proof_photo_url: string | null;
  driver_id: string | null;
  drivers: { full_name: string } | null;
};

type Driver = {
  id: string;
  full_name: string;
};

/* ─── Constants ──────────────────────────────────────────────── */

const PAGE_SIZE = 25;

/* ─── Helpers ────────────────────────────────────────────────── */

function orderNum(id: string): string {
  return `#${id.slice(-4).toUpperCase()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ─── Photo Lightbox ─────────────────────────────────────────── */

function PhotoDialog({
  url,
  open,
  onClose,
}: {
  url: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delivery Proof</DialogTitle>
        </DialogHeader>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Delivery proof"
          className="w-full rounded-md object-contain max-h-[70vh]"
        />
      </DialogContent>
    </Dialog>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function HistoryPage() {
  /* filters */
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [driverFilter, setDriverFilter] = useState("all");
  const [search, setSearch] = useState("");

  /* pagination */
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* lightbox */
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  /* ── data: delivered orders ──────────────────────────────── */
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
  } = useQuery({
    queryKey: ["history-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, created_at, pickup_address, delivery_address, goods_desc, weight_tons, proof_photo_url, driver_id, drivers(full_name)",
        )
        .eq("status", "delivered")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as DeliveredOrder[];
    },
  });

  /* ── data: drivers (for filter dropdown) ─────────────────── */
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data as Driver[];
    },
  });

  /* ── client-side filtering ───────────────────────────────── */
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      /* date range */
      if (fromDate) {
        const orderDay = o.created_at.slice(0, 10);
        if (orderDay < fromDate) return false;
      }
      if (toDate) {
        const orderDay = o.created_at.slice(0, 10);
        if (orderDay > toDate) return false;
      }

      /* driver */
      if (driverFilter !== "all" && o.driver_id !== driverFilter) return false;

      /* text search over addresses */
      if (search.trim()) {
        const q = search.toLowerCase();
        const hit =
          o.pickup_address.toLowerCase().includes(q) ||
          o.delivery_address.toLowerCase().includes(q);
        if (!hit) return false;
      }

      return true;
    });
  }, [orders, fromDate, toDate, driverFilter, search]);

  /* reset pagination whenever filters change */
  const visibleOrders = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  function handleFilterChange(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setVisibleCount(PAGE_SIZE);
    };
  }

  /* ── render ──────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold">Order History</h1>
        <p className="text-sm text-muted-foreground">
          Completed deliveries — all time
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Date from */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            From
          </label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => handleFilterChange(setFromDate)(e.target.value)}
            className="w-36"
          />
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            To
          </label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => handleFilterChange(setToDate)(e.target.value)}
            className="w-36"
          />
        </div>

        {/* Driver filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Driver
          </label>
          <Select
            value={driverFilter}
            onValueChange={(v) =>
              handleFilterChange(setDriverFilter)(v ?? "all")
            }
          >
            <SelectTrigger className="w-40">
              <span className="truncate">
                {driverFilter === "all"
                  ? "All Drivers"
                  : (drivers.find((d) => d.id === driverFilter)?.full_name ??
                    "Unknown")}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Text search */}
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Pickup or delivery address…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="pl-8"
            />
          </div>
        </div>

        {/* Clear filters */}
        {(fromDate || toDate || driverFilter !== "all" || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setDriverFilter("all");
              setSearch("");
              setVisibleCount(PAGE_SIZE);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Order</TableHead>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Goods</TableHead>
              <TableHead className="w-16 text-center">Proof</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Loading state */}
            {ordersLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {/* Error state */}
            {ordersError && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-destructive py-8"
                >
                  Failed to load history. Please refresh.
                </TableCell>
              </TableRow>
            )}

            {/* Empty state */}
            {!ordersLoading && !ordersError && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-12"
                >
                  {orders.length === 0
                    ? "No completed deliveries yet."
                    : "No results match your filters."}
                </TableCell>
              </TableRow>
            )}

            {/* Rows */}
            {visibleOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs font-medium">
                  {orderNum(order.id)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(order.created_at)}
                </TableCell>
                <TableCell className="text-sm">
                  {order.drivers?.full_name ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm max-w-72">
                  <span className="line-clamp-1">
                    {order.pickup_address} → {order.delivery_address}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {order.goods_desc ? (
                    <span>
                      {order.goods_desc}
                      {order.weight_tons != null && (
                        <span className="text-muted-foreground">
                          , {order.weight_tons}T
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {order.proof_photo_url ? (
                    <button
                      onClick={() => setPhotoUrl(order.proof_photo_url!)}
                      className="inline-flex items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="View proof photo"
                    >
                      <CameraIcon className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer: result count + load more */}
      {!ordersLoading && !ordersError && filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {visibleOrders.length} of {filtered.length} result
            {filtered.length !== 1 ? "s" : ""}
          </span>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Load more
            </Button>
          )}
        </div>
      )}

      {/* Proof photo lightbox */}
      {photoUrl && (
        <PhotoDialog
          url={photoUrl}
          open={!!photoUrl}
          onClose={() => setPhotoUrl(null)}
        />
      )}
    </div>
  );
}
