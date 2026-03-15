import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Pencil, Link2, CreditCard } from "lucide-react";
import { format } from "date-fns";

interface PaymentOrderTabProps {
  orderId: string;
  customer: any;
}

type PaymentOrderForm = {
  payment_order_number: string;
  estimate_total: number;
  deposit_amount: number;
  remaining_balance: number;
  customer_name: string;
  customer_email: string;
  payment_method: string;
  payment_link: string;
  due_date: string;
  payment_notes: string;
  internal_notes: string;
};

export function PaymentOrderTab({ orderId, customer }: PaymentOrderTabProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PaymentOrderForm>({
    payment_order_number: "",
    estimate_total: 0,
    deposit_amount: 0,
    remaining_balance: 0,
    customer_name: "",
    customer_email: "",
    payment_method: "",
    payment_link: "",
    due_date: "",
    payment_notes: "",
    internal_notes: "",
  });

  const { data: estimate } = useQuery({
    queryKey: ["estimate", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("estimates")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: paymentOrder, isLoading } = useQuery({
    queryKey: ["payment-order", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_orders")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["payments", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .order("payment_date", { ascending: false });
      return data || [];
    },
  });

  useEffect(() => {
    if (paymentOrder) {
      setForm({
        payment_order_number: paymentOrder.payment_order_number || "",
        estimate_total: Number(paymentOrder.estimate_total) || 0,
        deposit_amount: Number(paymentOrder.deposit_amount) || 0,
        remaining_balance: Number(paymentOrder.remaining_balance) || 0,
        customer_name: paymentOrder.customer_name || "",
        customer_email: paymentOrder.customer_email || "",
        payment_method: paymentOrder.payment_method || "",
        payment_link: paymentOrder.payment_link || "",
        due_date: paymentOrder.due_date || "",
        payment_notes: paymentOrder.payment_notes || "",
        internal_notes: paymentOrder.internal_notes || "",
      });
      setEditing(false);
    } else {
      const estTotal = Number(estimate?.total) || 0;
      const deposit = Number(estimate?.deposit_required) || 0;
      setForm({
        payment_order_number: `PO-${orderId.slice(0, 6).toUpperCase()}`,
        estimate_total: estTotal,
        deposit_amount: deposit,
        remaining_balance: estTotal - deposit,
        customer_name: customer?.full_name || "",
        customer_email: customer?.email || "",
        payment_method: "",
        payment_link: "",
        due_date: "",
        payment_notes: "",
        internal_notes: "",
      });
      setEditing(true);
    }
  }, [paymentOrder, estimate, customer, orderId]);

  const updateField = (key: keyof PaymentOrderForm, value: any) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      if (key === "estimate_total") {
        updated.deposit_amount = Math.round(Number(updated.estimate_total) * 0.5 * 100) / 100;
        updated.remaining_balance = Number(updated.estimate_total) - updated.deposit_amount;
      }
      return updated;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        order_id: orderId,
        estimate_id: estimate?.id || null,
        ...form,
        status: "active",
      };
      if (paymentOrder) {
        const { error } = await supabase.from("payment_orders").update(payload).eq("id", paymentOrder.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payment_orders").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-order", orderId] });
      toast({ title: paymentOrder ? "Payment order updated" : "Payment order created" });
      setEditing(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Manual payment recording
  const [manualPayment, setManualPayment] = useState({ amount: 0, method: "", reference: "", notes: "" });
  const [showManual, setShowManual] = useState(false);

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payments").insert({
        order_id: orderId,
        payment_order_id: paymentOrder?.id || null,
        amount: manualPayment.amount,
        payment_method: manualPayment.method,
        transaction_reference: manualPayment.reference,
        notes: manualPayment.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", orderId] });
      toast({ title: "Payment recorded" });
      setManualPayment({ amount: 0, method: "", reference: "", notes: "" });
      setShowManual(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <p className="text-muted-foreground py-4">Loading...</p>;

  if (!estimate && !paymentOrder) {
    return (
      <Card className="mt-4">
        <CardContent className="py-8 text-center text-muted-foreground">
          Create an Estimate first to generate a Payment Order.
        </CardContent>
      </Card>
    );
  }

  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Payment Order {paymentOrder && <Badge variant="secondary" className="ml-2">{paymentOrder.status}</Badge>}
          </CardTitle>
          <div className="flex gap-2">
            {!editing && paymentOrder && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
            {editing && (
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="mr-2 h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Payment Order #</Label>
              <Input value={form.payment_order_number} onChange={(e) => updateField("payment_order_number", e.target.value)} disabled={!editing} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Customer Name</Label>
              <Input value={form.customer_name} onChange={(e) => updateField("customer_name", e.target.value)} disabled={!editing} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Customer Email</Label>
              <Input value={form.customer_email} onChange={(e) => updateField("customer_email", e.target.value)} disabled={!editing} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => updateField("due_date", e.target.value)} disabled={!editing} className="mt-1" />
            </div>
          </div>

          <h3 className="text-sm font-semibold mt-6 mb-3 text-muted-foreground uppercase tracking-wide">Amounts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm">Estimate Total</Label>
              <Input type="number" value={String(form.estimate_total)} onChange={(e) => updateField("estimate_total", Number(e.target.value))} disabled={!editing} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Deposit Amount</Label>
              <Input type="number" value={String(form.deposit_amount)} onChange={(e) => updateField("deposit_amount", Number(e.target.value))} disabled={!editing} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Remaining Balance</Label>
              <Input type="number" value={String(form.remaining_balance)} disabled className="mt-1" />
            </div>
          </div>

          <h3 className="text-sm font-semibold mt-6 mb-3 text-muted-foreground uppercase tracking-wide">Payment Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => updateField("payment_method", v)} disabled={!editing}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="payment_link">Payment Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Payment Link</Label>
              <Input value={form.payment_link} onChange={(e) => updateField("payment_link", e.target.value)} disabled={!editing} placeholder="https://..." className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <Label className="text-sm">Payment Notes</Label>
              <Textarea value={form.payment_notes} onChange={(e) => updateField("payment_notes", e.target.value)} disabled={!editing} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Internal Notes</Label>
              <Textarea value={form.internal_notes} onChange={(e) => updateField("internal_notes", e.target.value)} disabled={!editing} rows={2} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History & Manual Entry */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Payment History</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowManual(!showManual)}>
            <CreditCard className="mr-2 h-4 w-4" /> Record Payment
          </Button>
        </CardHeader>
        <CardContent>
          {showManual && (
            <div className="border rounded-md p-4 mb-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Amount</Label>
                  <Input type="number" value={String(manualPayment.amount)} onChange={(e) => setManualPayment((p) => ({ ...p, amount: Number(e.target.value) }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Method</Label>
                  <Select value={manualPayment.method} onValueChange={(v) => setManualPayment((p) => ({ ...p, method: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Reference</Label>
                  <Input value={manualPayment.reference} onChange={(e) => setManualPayment((p) => ({ ...p, reference: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Notes</Label>
                  <Input value={manualPayment.notes} onChange={(e) => setManualPayment((p) => ({ ...p, notes: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <Button size="sm" onClick={() => recordPaymentMutation.mutate()} disabled={!manualPayment.amount || recordPaymentMutation.isPending}>
                {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          )}

          {(!payments || payments.length === 0) ? (
            <p className="text-muted-foreground text-sm text-center py-4">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium text-muted-foreground border-b pb-2 mb-2">
                <span>Total Paid: ${totalPaid.toFixed(2)}</span>
                <span>Remaining: ${(Number(form.estimate_total) - totalPaid).toFixed(2)}</span>
              </div>
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
                  <div>
                    <p className="font-medium">${Number(p.amount).toFixed(2)}</p>
                    <p className="text-muted-foreground text-xs">{p.payment_method || "N/A"} {p.transaction_reference && `· ${p.transaction_reference}`}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{format(new Date(p.payment_date), "MMM d, yyyy")}</p>
                    <Badge variant="secondary" className="text-xs">{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
