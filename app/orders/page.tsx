"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CameraIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserCheckIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { AddressAutocomplete } from "@/components/address-autocomplete";

type Order = {
  id: string;
  created_at: string;
  pickup_address: string;
  delivery_address: string;
  goods_desc: string | null;
  weight_tons: number | null;
  notes: string | null;
  status: string;
  driver_id: string | null;
  drivers: { full_name: string; is_available: boolean } | null;
  proof_photo_url: string | null;
};

type Driver = {
  id: string;
  full_name: string;
  expo_push_token: string | null;
  is_available: boolean;
};

type OrderFormData = {
  pickup_address: string;
  delivery_address: string;
  goods_desc: string;
  weight_tons: string;
  notes: string;
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "picked_up", label: "Picked Up" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-secondary text-secondary-foreground";
    case "assigned":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "picked_up":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "in_transit":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "delivered":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

function statusLabel(status: string): string {
  return STATUS_FILTER_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

function orderNum(id: string): string {
  return `#${id.slice(-4).toUpperCase()}`;
}

// ─── Assign Order Modal ─────────────────────────────────────────────────────

function AssignOrderModal({
  open,
  onClose,
  order,
}: {
  open: boolean;
  onClose: () => void;
  order?: Order;
}) {
  const queryClient = useQueryClient();
  const [selectedDriverId, setSelectedDriverId] = useState("");

  useEffect(() => {
    if (open) setSelectedDriverId(order?.driver_id ?? "");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, full_name, expo_push_token, is_available")
        .order("full_name");
      if (error) throw error;
      return data as Driver[];
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ driver_id: driverId, status: "assigned" })
        .eq("id", order!.id);
      if (error) throw error;

      const driver = drivers.find((d) => d.id === driverId);
      if (!driver?.expo_push_token) {
        toast.warning("Order assigned — driver has no push token yet");
        return;
      }

      const orderLabel = orderNum(order!.id);
      const route = `${order!.pickup_address} → ${order!.delivery_address}`;

      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: driver.expo_push_token,
          title: "New Order Assigned",
          body: `Order ${orderLabel} — ${route}. Tap to view.`,
          data: { orderId: order!.id },
        }),
      });

      if (!res.ok) {
        toast.warning("Order assigned — push notification failed to send");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order assigned");
      onClose();
    },
    onError: (err) => {
      toast.error(`Failed to assign order: ${(err as Error).message}`);
    },
  });

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Order {orderNum(order.id)}</DialogTitle>
          <DialogDescription>
            {order.pickup_address} → {order.delivery_address}
            {order.goods_desc &&
              ` · ${order.goods_desc}${order.weight_tons ? `, ${order.weight_tons}T` : ""}`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <label className="mb-1.5 block text-sm font-medium">
            Assign to driver
          </label>
          <Select
            value={selectedDriverId}
            onValueChange={(v) => setSelectedDriverId(v ?? "")}
          >
            <SelectTrigger>
              <span
                className={
                  selectedDriverId ? undefined : "text-muted-foreground"
                }
              >
                {selectedDriverId
                  ? (drivers.find((d) => d.id === selectedDriverId)
                      ?.full_name ?? "Select driver…")
                  : "Select driver…"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {drivers
                .filter((d) => d.is_available)
                .map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.full_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            disabled={!selectedDriverId || mutation.isPending}
            onClick={() => mutation.mutate(selectedDriverId)}
          >
            {mutation.isPending ? "Assigning…" : "Assign & Notify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create / Edit Order Modal ────────────────────────────────────────────────

function CreateEditOrderModal({
  open,
  onClose,
  order,
}: {
  open: boolean;
  onClose: () => void;
  order?: Order;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OrderFormData>({
    pickup_address: "",
    delivery_address: "",
    goods_desc: "",
    weight_tons: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        pickup_address: order?.pickup_address ?? "",
        delivery_address: order?.delivery_address ?? "",
        goods_desc: order?.goods_desc ?? "",
        weight_tons:
          order?.weight_tons != null ? String(order.weight_tons) : "",
        notes: order?.notes ?? "",
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const payload = {
        pickup_address: data.pickup_address.trim(),
        delivery_address: data.delivery_address.trim(),
        goods_desc: data.goods_desc.trim() || null,
        weight_tons: data.weight_tons ? parseFloat(data.weight_tons) : null,
        notes: data.notes.trim() || null,
      };
      if (order) {
        const { error } = await supabase
          .from("orders")
          .update(payload)
          .eq("id", order.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("orders").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(order ? "Order updated" : "Order created");
      onClose();
    },
    onError: (err) => {
      toast.error(`Failed to save order: ${(err as Error).message}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.pickup_address.trim()) {
      toast.error("Pickup address is required");
      return;
    }
    if (!form.delivery_address.trim()) {
      toast.error("Delivery address is required");
      return;
    }
    mutation.mutate(form);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{order ? "Edit Order" : "New Order"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="pickup_address">
                Pickup Address
              </label>
              <AddressAutocomplete
                id="pickup_address"
                placeholder="Viale Europa Unita 32, Pozzuolo del Friuli"
                value={form.pickup_address}
                onChange={(v) => setForm((f) => ({ ...f, pickup_address: v }))}
                disabled={mutation.isPending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="delivery_address">
                Delivery Address
              </label>
              <AddressAutocomplete
                id="delivery_address"
                placeholder="Via Ivan Trinko 10, Udine"
                value={form.delivery_address}
                onChange={(v) =>
                  setForm((f) => ({ ...f, delivery_address: v }))
                }
                disabled={mutation.isPending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="goods_desc">
                Goods Description
              </label>
              <Input
                id="goods_desc"
                placeholder="Steel coils"
                value={form.goods_desc}
                onChange={(e) =>
                  setForm((f) => ({ ...f, goods_desc: e.target.value }))
                }
              />
            </div>

            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="weight_tons">
                  Weight (T)
                </label>
                <Input
                  id="weight_tons"
                  type="number"
                  placeholder="38"
                  min="0"
                  step="any"
                  value={form.weight_tons}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, weight_tons: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="notes">
                  Notes
                </label>
                <Input
                  id="notes"
                  placeholder="Gate C only"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Orders Page ──────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [modalState, setModalState] = useState<{
    open: boolean;
    order?: Order;
  }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignState, setAssignState] = useState<{
    open: boolean;
    order?: Order;
  }>({ open: false });
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string | null>(null);

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, drivers(full_name, is_available)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("orders")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order deleted");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(`Delete failed: ${(err as Error).message}`);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Status updated");
    },
    onError: (err) => {
      toast.error(`Failed to update status: ${(err as Error).message}`);
    },
  });

  const filtered =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Button onClick={() => setModalState({ open: true })}>
          <PlusIcon />
          New Order
        </Button>
      </div>

      {/* Status filter */}
      <div className="mb-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger>
            <span>
              {STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)
                ?.label ?? "All Statuses"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">#</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-72" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-7 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <p className="text-sm font-medium text-destructive">
            Failed to load orders
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(error as Error)?.message}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {statusFilter !== "all"
              ? "No orders match that filter."
              : "No orders yet — create your first one."}
          </p>
          {statusFilter === "all" && (
            <Button
              className="mt-4"
              onClick={() => setModalState({ open: true })}
            >
              <PlusIcon />
              New Order
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">#</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {orderNum(order.id)}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {order.drivers?.full_name ?? "—"}
                      {order.drivers && !order.drivers.is_available && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs py-0">
                          Unavailable
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{order.pickup_address}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span>{order.delivery_address}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={order.status}
                        onValueChange={(v) =>
                          v &&
                          statusMutation.mutate({ id: order.id, status: v })
                        }
                        disabled={statusMutation.isPending}
                      >
                        <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden">
                          <Badge className={statusBadgeClass(order.status)}>
                            {statusLabel(order.status)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_FILTER_OPTIONS.filter(
                            (o) => o.value !== "all",
                          ).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {order.status === "delivered" &&
                        order.proof_photo_url && (
                          <button
                            type="button"
                            onClick={() =>
                              setProofPhotoUrl(order.proof_photo_url!)
                            }
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="View proof photo"
                          >
                            <CameraIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {order.status !== "delivered" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setAssignState({ open: true, order })}
                          disabled={deleteMutation.isPending}
                          aria-label={`Assign order ${orderNum(order.id)}`}
                        >
                          <UserCheckIcon />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setModalState({ open: true, order })}
                        disabled={deleteMutation.isPending}
                        aria-label={`Edit order ${orderNum(order.id)}`}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(order.id)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Delete order ${orderNum(order.id)}`}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Assign Order Modal */}
      <AssignOrderModal
        open={assignState.open}
        onClose={() => setAssignState({ open: false })}
        order={assignState.order}
      />

      {/* Create / Edit Modal */}
      <CreateEditOrderModal
        open={modalState.open}
        onClose={() => setModalState({ open: false })}
        order={modalState.order}
      />

      {/* Proof Photo Lightbox */}
      <Dialog
        open={proofPhotoUrl !== null}
        onOpenChange={(isOpen) => !isOpen && setProofPhotoUrl(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delivery Proof Photo</DialogTitle>
          </DialogHeader>
          {proofPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proofPhotoUrl}
              alt="Delivery proof"
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(isOpen) => !isOpen && setDeleteId(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              This will permanently remove the order. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
