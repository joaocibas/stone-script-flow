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
import { Save, Pencil, Printer } from "lucide-react";
import { format } from "date-fns";

interface ReceiptTabProps {
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
  description: string;
  notes: string;
  company_info: string;
};

export function ReceiptTab({ orderId, customer }: ReceiptTabProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ReceiptForm>({
    receipt_number: "",
    date: format(new Date(), "yyyy-MM-dd"),
    received_from: "",
    amount: 0,
    payment_method: "",
    transaction_reference: "",
    description: "",
    notes: "",
    company_info: "",
  });

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["final-receipt", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("receipts")
        .select("*")
        .eq("order_id", orderId)
        .eq("receipt_type", "final")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
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
      const { data } = await supabase.from("payments").select("*").eq("order_id", orderId);
      return data || [];
    },
  });

  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

  useEffect(() => {
    if (receipt) {
      setForm({
        receipt_number: receipt.receipt_number || "",
        date: receipt.date || format(new Date(), "yyyy-MM-dd"),
        received_from: receipt.received_from || "",
        amount: Number(receipt.amount) || 0,
        payment_method: receipt.payment_method || "",
        transaction_reference: receipt.transaction_reference || "",
        description: receipt.description || "",
        notes: receipt.notes || "",
        company_info: receipt.company_info || "",
      });
      setEditing(false);
    } else {
      setForm({
        receipt_number: `RCP-${orderId.slice(0, 6).toUpperCase()}`,
        date: format(new Date(), "yyyy-MM-dd"),
        received_from: customer?.full_name || "",
        amount: totalPaid || Number(estimate?.total) || 0,
        payment_method: "",
        transaction_reference: "",
        description: `Payment for Order #${orderId.slice(0, 8).toUpperCase()}`,
        notes: "",
        company_info: "Altar Stones Countertops\nSarasota, FL",
      });
      setEditing(true);
    }
  }, [receipt, customer, estimate, totalPaid, orderId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        order_id: orderId,
        estimate_id: estimate?.id || null,
        receipt_type: "final" as string,
        receipt_number: form.receipt_number,
        date: form.date,
        received_from: form.received_from,
        amount: form.amount,
        payment_method: form.payment_method,
        transaction_reference: form.transaction_reference,
        remaining_balance: 0,
        description: form.description,
        notes: form.notes,
        company_info: form.company_info,
        status: "issued",
      };
      if (receipt) {
        const { error } = await supabase.from("receipts").update(payload).eq("id", receipt.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("receipts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["final-receipt", orderId] });
      toast({ title: receipt ? "Receipt updated" : "Receipt created" });
      setEditing(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handlePrint = () => window.print();

  if (isLoading) return <p className="text-muted-foreground py-4">Loading...</p>;

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          Final Receipt {receipt && <Badge variant="secondary" className="ml-2">{receipt.status}</Badge>}
        </CardTitle>
        <div className="flex gap-2">
          {receipt && (
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          )}
          {!editing && receipt && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
          {editing && (
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save Receipt"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Receipt Number</Label>
            <Input value={form.receipt_number} onChange={(e) => setForm((p) => ({ ...p, receipt_number: e.target.value }))} disabled={!editing} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} disabled={!editing} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Received From</Label>
            <Input value={form.received_from} onChange={(e) => setForm((p) => ({ ...p, received_from: e.target.value }))} disabled={!editing} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Amount Paid</Label>
            <Input type="number" value={String(form.amount)} onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value) }))} disabled={!editing} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Payment Method</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm((p) => ({ ...p, payment_method: v }))} disabled={!editing}>
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
            <Label className="text-sm">Reference Number</Label>
            <Input value={form.transaction_reference} onChange={(e) => setForm((p) => ({ ...p, transaction_reference: e.target.value }))} disabled={!editing} className="mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4">
          <div>
            <Label className="text-sm">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} disabled={!editing} rows={2} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} disabled={!editing} rows={2} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Company Information</Label>
            <Textarea value={form.company_info} onChange={(e) => setForm((p) => ({ ...p, company_info: e.target.value }))} disabled={!editing} rows={3} className="mt-1" />
          </div>
        </div>

        {estimate && (
          <div className="mt-4 p-3 border rounded-md bg-muted/30 text-sm space-y-1">
            <p><span className="text-muted-foreground">Related Estimate:</span> {estimate.estimate_number}</p>
            <p><span className="text-muted-foreground">Related Order:</span> #{orderId.slice(0, 8).toUpperCase()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
