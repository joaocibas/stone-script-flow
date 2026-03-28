import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Users, UserPlus, RefreshCw, Pencil, Trash2, RotateCcw, Plus } from "lucide-react";
import { PhoneInput } from "@/components/PhoneInput";
import { AddressInput, addressToString, parseAddress, type AddressValue, emptyAddress } from "@/components/AddressInput";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAdminRole } from "@/components/layouts/AdminLayout";

type Customer = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerForm = {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

const emptyForm: CustomerForm = { full_name: "", email: "", phone: "", address: "", notes: "" };

const AdminCustomers = () => {
  const { isAdmin } = useAdminRole();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const { data: customers, isLoading, refetch } = useQuery({
    queryKey: ["admin-customers", search, showDeleted],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (!showDeleted) {
        query = query.eq("is_deleted", false);
      }

      if (search.trim()) {
        query = query.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-customer-stats"],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recent } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false)
        .gte("created_at", sevenDaysAgo.toISOString());

      return { total: total ?? 0, recentSignups: recent ?? 0 };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      const { error } = await supabase.from("customers").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-customer-stats"] });
      toast({ title: "Customer updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: async (data: CustomerForm) => {
      // Create auth user first, then the trigger creates the customer record
      // For admin/sales adding customers manually, we insert directly
      const { error } = await supabase.from("customers").insert({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
        user_id: crypto.randomUUID(), // placeholder — no auth account
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-customer-stats"] });
      setAddOpen(false);
      setForm(emptyForm);
      toast({ title: "Customer added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({
      full_name: c.full_name,
      email: c.email,
      phone: c.phone || "",
      address: c.address || "",
      notes: c.notes || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editCustomer) return;
    updateMutation.mutate({
      id: editCustomer.id,
      data: {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        notes: form.notes || null,
      },
    });
    setEditCustomer(null);
  };

  const handleSoftDelete = () => {
    if (!deleteTarget) return;
    updateMutation.mutate({
      id: deleteTarget.id,
      data: { is_deleted: true, deleted_at: new Date().toISOString() },
    });
    setDeleteTarget(null);
  };

  const handleRestore = (c: Customer) => {
    updateMutation.mutate({
      id: c.id,
      data: { is_deleted: false, deleted_at: null },
    });
  };

  const filtered = customers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { setForm(emptyForm); setAddOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Week</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentSignups ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Showing</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filtered.length}</div>
            <p className="text-xs text-muted-foreground">matching results</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Switch checked={showDeleted} onCheckedChange={setShowDeleted} id="show-deleted" />
            <Label htmlFor="show-deleted" className="text-sm text-muted-foreground">Show deleted</Label>
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading customers...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? "No customers match your search." : "No customers registered yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className={c.is_deleted ? "opacity-50" : ""}>
                    <TableCell className="font-medium">
                      {c.full_name || <span className="text-muted-foreground italic">No name</span>}
                    </TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell>
                      {c.is_deleted ? (
                        <Badge variant="destructive">Deleted</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(c.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && !c.is_deleted && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        {isAdmin && c.is_deleted && (
                          <Button variant="ghost" size="icon" onClick={() => handleRestore(c)} title="Restore">
                            <RotateCcw className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>Create a new customer record manually.</DialogDescription>
          </DialogHeader>
          <CustomerFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate(form)} disabled={!form.full_name || !form.email || addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={!!editCustomer} onOpenChange={(open) => !open && setEditCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update customer details.</DialogDescription>
          </DialogHeader>
          <CustomerFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomer(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={!form.full_name || !form.email}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete "{deleteTarget?.full_name}". They won't appear in the active list but can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSoftDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function CustomerFormFields({ form, setForm }: { form: CustomerForm; setForm: (f: CustomerForm) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="cust-name">Full Name *</Label>
        <Input id="cust-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="cust-email">Email *</Label>
        <Input id="cust-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="cust-phone">Phone</Label>
        <PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
      </div>
      <div>
        <Label htmlFor="cust-address">Address</Label>
        <Input id="cust-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="cust-notes">Notes (internal)</Label>
        <Textarea id="cust-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
      </div>
    </div>
  );
}

export default AdminCustomers;
