"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";

type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  truck_plate: string | null;
  expo_push_token: string | null;
};

type DriverFormData = {
  full_name: string;
  phone: string;
  truck_plate: string;
};

// ─── Add / Edit Modal ────────────────────────────────────────────────────────

function AddEditDriverModal({
  open,
  onClose,
  driver,
}: {
  open: boolean;
  onClose: () => void;
  driver?: Driver;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DriverFormData>({
    full_name: "",
    phone: "",
    truck_plate: "",
  });

  // Reset form to driver values (or blank) every time the modal opens
  useEffect(() => {
    if (open) {
      setForm({
        full_name: driver?.full_name ?? "",
        phone: driver?.phone ?? "",
        truck_plate: driver?.truck_plate ?? "",
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: async (data: DriverFormData) => {
      if (driver) {
        const { error } = await supabase
          .from("drivers")
          .update(data)
          .eq("id", driver.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("drivers").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success(driver ? "Driver updated" : "Driver added");
      onClose();
    },
    onError: (err) => {
      toast.error(`Failed to save driver: ${(err as Error).message}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    mutation.mutate(form);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{driver ? "Edit Driver" : "Add Driver"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="full_name">
                Full Name
              </label>
              <Input
                id="full_name"
                placeholder="John Doe"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="phone">
                Phone
              </label>
              <Input
                id="phone"
                placeholder="+33 6 01 02 03 04"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="truck_plate">
                Truck Plate
              </label>
              <Input
                id="truck_plate"
                placeholder="BR-44-XX"
                value={form.truck_plate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, truck_plate: e.target.value }))
                }
              />
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
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Drivers Page ────────────────────────────────────────────────────────────

export default function DriversPage() {
  const queryClient = useQueryClient();

  const [modalState, setModalState] = useState<{
    open: boolean;
    driver?: Driver;
  }>({ open: false });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data: drivers = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data as Driver[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Driver deleted");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(`Delete failed: ${(err as Error).message}`);
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Drivers</h1>
        <Button onClick={() => setModalState({ open: true })}>
          <PlusIcon />
          Add Driver
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-12 justify-center text-sm text-muted-foreground">
          <Loader2Icon className="h-5 w-5 animate-spin" />
          Loading drivers…
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <p className="text-sm font-medium text-destructive">
            Failed to load drivers
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(error as Error)?.message}
          </p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No drivers yet — add your first one.
          </p>
          <Button
            className="mt-4"
            onClick={() => setModalState({ open: true })}
          >
            <PlusIcon />
            Add Driver
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Truck Plate</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">
                    {driver.full_name}
                  </TableCell>
                  <TableCell>{driver.phone ?? "—"}</TableCell>
                  <TableCell>{driver.truck_plate ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setModalState({ open: true, driver })}
                        aria-label={`Edit ${driver.full_name}`}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(driver.id)}
                        aria-label={`Delete ${driver.full_name}`}
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

      {/* Add / Edit Modal */}
      <AddEditDriverModal
        open={modalState.open}
        onClose={() => setModalState({ open: false })}
        driver={modalState.driver}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(isOpen) => !isOpen && setDeleteId(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Driver</DialogTitle>
            <DialogDescription>
              This will permanently remove the driver. This action cannot be
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
