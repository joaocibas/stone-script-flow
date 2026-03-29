import { useState, useEffect } from "react";
import { sendEmail } from "@/lib/send-email";
import { paymentReceivedEmail } from "@/lib/email-templates";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Pencil, CreditCard, FileDown, Link2, Copy, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { generatePdfDocument } from "@/lib/pdf-generator";
import { DocumentHeader, InfoBlock, DocumentSection, SummaryBox } from "./DocumentLayout";

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
  const [generatingLink, setGeneratingLink] = useState(false);
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
      const deposit = Math.round(estTotal * 0.5 * 100) / 100;
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

  const generateStripeLink = async () => {
    setGeneratingLink(true);
    try {
      const amount = form.deposit_amount > 0 ? form.deposit_amount : form.estimate_total;
      if (amount <= 0) throw new Error("Amount must be greater than 0");
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          action: "create",
          order_id: orderId,
          customer_id: customer?.id || null,
          customer_email: form.customer_email || customer?.email || "",
          customer_name: form.customer_name || customer?.full_name || "",
          amount,
          payment_type: "deposit",
        },
      });
      if (error) throw error;
      updateField("payment_link", data.url);
      updateField("payment_method", "stripe_payment_link");
      toast({ title: "Stripe link generated!", description: "Link was auto-filled in the Payment Link field." });
    } catch (e: any) {
      toast({ title: "Error generating link", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!" });
  };

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

      // Send payment received email to customer
      if (customer?.email) {
        try {
          const totalPaidNow = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0) + manualPayment.amount;
          const estimateTotal = Number(estimate?.total) || 0;
          const remaining = Math.max(0, estimateTotal - totalPaidNow);
          const emailPayload = paymentReceivedEmail({
            customerName: customer?.full_name || "Customer",
            amount: manualPayment.amount,
            paymentType: manualPayment.method || "Payment",
            remainingBalance: remaining,
            orderId: orderId,
            transactionRef: manualPayment.reference || undefined,
          });
          sendEmail({ ...emailPayload, to: customer.email });
        } catch {}
      }

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
  const dueDateDisplay = form.due_date ? format(new Date(form.due_date + "T12:00:00"), "MMMM d, yyyy") : "N/A";

  const actionButtons = (
    <>
      {paymentOrder && (
        <Button variant="outline" size="sm" onClick={() => generatePdfDocument({
          title: "Payment Order",
          documentNumber: form.payment_order_number,
          date: dueDateDisplay,
          sections: [
            { heading: "Customer", rows: [
              { label: "Customer Name", value: form.customer_name },
              { label: "Email", value: form.customer_email },
            ]},
            { heading: "Amounts", rows: [
              { label: "Estimate Total", value: form.estimate_total },
              { label: "Deposit Amount (50%)", value: form.deposit_amount },
              { label: "Remaining Balance", value: form.remaining_balance },
            ]},
            { heading: "Payment Details", rows: [
              { label: "Payment Method", value: form.payment_method?.replace(/_/g, " ") || "" },
              { label: "Payment Link", value: form.payment_link },
              { label: "Due Date", value: dueDateDisplay },
            ]},
          ],
          notes: form.payment_notes,
          companyInfo: "Altar Stones Countertops\nSarasota, FL",
        })}>
          <FileDown className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      )}
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
    </>
  );

  return (
    <div className="space-y-4 mt-4">
      <Card className="overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <DocumentHeader
            documentTitle="Payment Order"
            documentNumber={form.payment_order_number}
            date={dueDateDisplay}
            status={paymentOrder?.status}
            actions={actionButtons}
          />

          {/* Customer info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {editing ? (
              <DocumentSection title="Customer">
                <div className="grid grid-cols-1 gap-3">
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
              </DocumentSection>
            ) : (
              <InfoBlock title="Bill To" items={[
                { label: "Name", value: form.customer_name },
                { label: "Email", value: form.customer_email },
                { label: "Due Date", value: dueDateDisplay },
              ]} />
            )}

            {/* Amounts summary */}
            <SummaryBox rows={[
              { label: "Estimate Total", value: `$${form.estimate_total.toFixed(2)}` },
              { label: "Deposit Amount (50%)", value: `$${form.deposit_amount.toFixed(2)}` },
              { label: "Remaining Balance", value: `$${form.remaining_balance.toFixed(2)}`, bold: true, accent: true },
            ]} />
          </div>

          {/* Payment Options */}
          <DocumentSection title="Payment Options">
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            ) : (
              <div className="flex flex-wrap gap-6 text-sm">
                <p><span className="text-muted-foreground">Method:</span> <span className="font-medium">{form.payment_method?.replace(/_/g, " ") || "—"}</span></p>
                {form.payment_link && <p><span className="text-muted-foreground">Link:</span> <a href={form.payment_link} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline">{form.payment_link}</a></p>}
              </div>
            )}
          </DocumentSection>

          {/* Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DocumentSection title="Payment Notes">
              {editing ? (
                <Textarea value={form.payment_notes} onChange={(e) => updateField("payment_notes", e.target.value)} disabled={!editing} rows={2} className="mt-1" />
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap">{form.payment_notes || "—"}</p>
              )}
            </DocumentSection>
            <DocumentSection title="Internal Notes">
              {editing ? (
                <Textarea value={form.internal_notes} onChange={(e) => updateField("internal_notes", e.target.value)} disabled={!editing} rows={2} className="mt-1" />
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap">{form.internal_notes || "—"}</p>
              )}
            </DocumentSection>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-accent">Payment History</h3>
            <Button variant="outline" size="sm" onClick={() => setShowManual(!showManual)}>
              <CreditCard className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </div>

          {showManual && (
            <div className="border rounded-md p-4 space-y-3 bg-muted/30">
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
