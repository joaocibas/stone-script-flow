import { useState } from "react";
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
import { Plus, Save, FileDown } from "lucide-react";
import { format } from "date-fns";
import { generatePdfDocument } from "@/lib/pdf-generator";
import { DocumentHeader, InfoBlock, DocumentSection, SummaryBox } from "./DocumentLayout";

interface PartialReceiptTabProps {
  orderId: string;
  customer: any;
}

type ReceiptForm = {
  receipt_number: string;
  date: string;
  received_from: string;
  amount: number;
  payment_method: string;
  transaction_reference: string;
  remaining_balance: number;
  notes: string;
};

export function PartialReceiptTab({ orderId, customer }: PartialReceiptTabProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ReceiptForm>({
    receipt_number: "",
    date: format(new Date(), "yyyy-MM-dd"),
    received_from: "",
    amount: 0,
    payment_method: "",
    transaction_reference: "",
    remaining_balance: 0,
    notes: "",
  });

  const { data: partialReceipts, isLoading } = useQuery({
    queryKey: ["partial-receipts", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("receipts")
        .select("*")
        .eq("order_id", orderId)
        .eq("receipt_type", "partial")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: estimate } = useQuery({
    queryKey: ["estimate", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("estimates").select("*").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["payments", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").eq("order_id", orderId).order("payment_date", { ascending: false });
      return data || [];
    },
  });

  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const estTotal = Number(estimate?.total) || 0;

  const startNew = () => {
    const count = (partialReceipts || []).length + 1;
    setForm({
      receipt_number: `PR-${orderId.slice(0, 6).toUpperCase()}-${count}`,
      date: format(new Date(), "yyyy-MM-dd"),
      received_from: customer?.full_name || "",
      amount: 0,
      payment_method: "",
      transaction_reference: "",
      remaining_balance: estTotal - totalPaid,
      notes: "",
    });
    setCreating(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("receipts").insert({
        order_id: orderId,
        estimate_id: estimate?.id || null,
        receipt_type: "partial",
        receipt_number: form.receipt_number,
        date: form.date,
        received_from: form.received_from,
        amount: form.amount,
        payment_method: form.payment_method,
        transaction_reference: form.transaction_reference,
        remaining_balance: form.remaining_balance,
        notes: form.notes,
        status: "issued",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partial-receipts", orderId] });
      toast({ title: "Partial receipt created" });
      setCreating(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <p className="text-muted-foreground py-4">Loading...</p>;

  return (
    <div className="space-y-4 mt-4">
      <Card className="overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b-2 border-accent/40">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">Partial Receipts</p>
              <p className="text-sm text-muted-foreground mt-1">Order #{orderId.slice(0, 8).toUpperCase()}</p>
            </div>
            <Button variant="outline" size="sm" onClick={startNew}>
              <Plus className="mr-2 h-4 w-4" /> New Partial Receipt
            </Button>
          </div>

          {/* New receipt form */}
          {creating && (
            <div className="border rounded-md p-5 space-y-5 bg-muted/20">
              <DocumentHeader
                documentTitle="New Partial Receipt"
                documentNumber={form.receipt_number}
                date={form.date ? format(new Date(form.date + "T12:00:00"), "MMMM d, yyyy") : ""}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DocumentSection title="Payment Details">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label className="text-sm">Receipt Number</Label>
                      <Input value={form.receipt_number} onChange={(e) => setForm((p) => ({ ...p, receipt_number: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm">Date</Label>
                      <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm">Received From</Label>
                      <Input value={form.received_from} onChange={(e) => setForm((p) => ({ ...p, received_from: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm">Amount Received</Label>
                      <Input type="number" value={String(form.amount)} onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value), remaining_balance: estTotal - totalPaid - Number(e.target.value) }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm">Payment Method</Label>
                      <Select value={form.payment_method} onValueChange={(v) => setForm((p) => ({ ...p, payment_method: v }))}>
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
                      <Label className="text-sm">Transaction Reference</Label>
                      <Input value={form.transaction_reference} onChange={(e) => setForm((p) => ({ ...p, transaction_reference: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                </DocumentSection>

                <div className="space-y-4">
                  <SummaryBox rows={[
                    { label: "Estimate Total", value: `$${estTotal.toFixed(2)}` },
                    { label: "Total Paid", value: `$${totalPaid.toFixed(2)}` },
                    { label: "This Payment", value: `$${form.amount.toFixed(2)}`, bold: true },
                    { label: "Remaining Balance", value: `$${form.remaining_balance.toFixed(2)}`, accent: true },
                  ]} />

                  <DocumentSection title="Notes">
                    <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className="mt-1" />
                  </DocumentSection>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!form.amount || saveMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save Partial Receipt"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Existing receipts list */}
          {(!partialReceipts || partialReceipts.length === 0) && !creating ? (
            <p className="text-muted-foreground text-sm text-center py-6">No partial receipts yet.</p>
          ) : (
            <div className="space-y-3">
              {(partialReceipts || []).map((r) => (
                <div key={r.id} className="border rounded-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-sm">{r.receipt_number}</p>
                    <p className="text-xs text-muted-foreground">{r.received_from} · {(r.payment_method || "N/A").replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.date), "MMMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-base">${Number(r.amount).toFixed(2)}</p>
                      {r.remaining_balance != null && (
                        <p className="text-xs text-muted-foreground">Balance: ${Number(r.remaining_balance).toFixed(2)}</p>
                      )}
                      <Badge variant="secondary" className="text-xs mt-0.5">{r.status}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => generatePdfDocument({
                      title: "Partial Receipt",
                      documentNumber: r.receipt_number,
                      date: format(new Date(r.date), "MMMM d, yyyy"),
                      companyInfo: "Altar Stones Countertops\nSarasota, FL",
                      sections: [
                        { heading: "Payment Details", rows: [
                          { label: "Received From", value: r.received_from },
                          { label: "Amount Received", value: Number(r.amount) },
                          { label: "Payment Method", value: (r.payment_method || "").replace(/_/g, " ") },
                          { label: "Transaction Reference", value: r.transaction_reference || "" },
                          { label: "Remaining Balance", value: Number(r.remaining_balance || 0) },
                        ]},
                        ...(estimate ? [{ heading: "References", rows: [
                          { label: "Related Estimate", value: estimate.estimate_number },
                          { label: "Related Order", value: `#${orderId.slice(0, 8).toUpperCase()}` },
                        ]}] : []),
                      ],
                      notes: r.notes || undefined,
                    })}>
                      <FileDown className="h-4 w-4" />
                    </Button>
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
