import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Clock, RotateCcw, TrendingUp, TrendingDown, Plus, Trash2, FileDown, Send, Minus, Eye, CheckCircle, Copy, XCircle, Download } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { sendEmail } from "@/lib/send-email";

const EXPENSE_CATEGORIES = ["Materials", "Labor", "Rent", "Tools", "Fuel", "Marketing", "Other"];

const AdminFinancials = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "Other", amount: "", date: format(new Date(), "yyyy-MM-dd"), description: "", receiptFile: null as File | null });
  const [reportMonth, setReportMonth] = useState(format(new Date(), "yyyy-MM"));
  const [invoicePayment, setInvoicePayment] = useState<any>(null);
  const [markPaidPayment, setMarkPaidPayment] = useState<any>(null);

  // ── Queries ──
  const { data: financials, isLoading } = useQuery({
    queryKey: ["stripe-financials"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", { body: { action: "financials" } });
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses" as any).select("*").order("date", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ["all-payments-for-chart"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("amount, payment_date, status, order_id, payment_method, notes, id, created_at, confirmed_by, paid_at, transaction_reference").order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: stripePayments = [] } = useQuery({
    queryKey: ["stripe-payments-list"],
    queryFn: async () => {
      const { data } = await supabase.from("stripe_payments").select("*").order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  // ── Computed values ──
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const totalExpensesThisMonth = useMemo(() => {
    return expenses
      .filter((e: any) => {
        const d = parseISO(e.date);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  }, [expenses, monthStart, monthEnd]);

  const collectedThisMonth = financials?.totalCollected || 0;
  const netProfit = collectedThisMonth - totalExpensesThisMonth;

  // ── Chart data: last 12 months ──
  const chartData = useMemo(() => {
    const months: { month: string; revenue: number; expenses: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
      const label = format(d, "MMM yy");
      const rev = allPayments
        .filter((p: any) => {
          const pd = parseISO(p.payment_date || p.created_at);
          return pd >= ms && pd <= me && (p.status === "completed" || p.status === "paid");
        })
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const exp = expenses
        .filter((e: any) => {
          const ed = parseISO(e.date);
          return ed >= ms && ed <= me;
        })
        .reduce((s: number, e: any) => s + Number(e.amount), 0);
      months.push({ month: label, revenue: Math.round(rev * 100) / 100, expenses: Math.round(exp * 100) / 100 });
    }
    return months;
  }, [allPayments, expenses, now]);

  // ── Combined recent payments with overdue detection ──
  const recentPayments = useMemo(() => {
    const combined = stripePayments.map((p: any) => {
      const daysPending = differenceInDays(now, new Date(p.created_at));
      const isOverdue = p.status === "pending" && daysPending > 30;
      let badgeType = p.status;
      if (p.status === "paid" && p.confirmed_by === "stripe") badgeType = "auto_confirmed";
      else if (p.status === "paid" && p.confirmed_by) badgeType = "manually_confirmed";
      else if (isOverdue) badgeType = "overdue";
      else if (p.status === "pending") badgeType = "awaiting";
      return { ...p, isOverdue, badgeType, daysPending };
    });
    return combined.slice(0, 30);
  }, [stripePayments, now]);

  // ── Mutations ──
  const addExpenseMutation = useMutation({
    mutationFn: async () => {
      let receiptUrl: string | null = null;
      if (expenseForm.receiptFile) {
        const ext = expenseForm.receiptFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("receipt-uploads").upload(path, expenseForm.receiptFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("receipt-uploads").getPublicUrl(path);
        receiptUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from("expenses" as any).insert({
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        date: expenseForm.date || null,
        description: expenseForm.description || null,
        receipt_url: receiptUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setExpenseOpen(false);
      setExpenseForm({ category: "Other", amount: "", date: format(new Date(), "yyyy-MM-dd"), description: "", receiptFile: null });
      toast({ title: "Expense added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Expense deleted" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (payment: any) => {
      // Update stripe_payments
      await supabase.from("stripe_payments").update({ status: "paid", updated_at: new Date().toISOString() }).eq("id", payment.id);

      // Update order status based on payment type
      if (payment.order_id) {
        const newStatus = payment.payment_type === "full" ? "completed" : "confirmed";
        await supabase.from("orders").update({ status: newStatus, deposit_paid: Number(payment.amount), updated_at: new Date().toISOString() }).eq("id", payment.order_id);

        // Record in payments table
        await supabase.from("payments").insert({
          order_id: payment.order_id,
          amount: Number(payment.amount),
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "manual",
          confirmed_by: "admin",
          notes: `Manually confirmed from Financial Summary`,
        });
      }

      // Send confirmation email
      const { data: order } = await supabase.from("orders").select("*, customers(email, full_name)").eq("id", payment.order_id).single();
      const email = order?.customers?.email || payment.customer_email;
      const name = order?.customers?.full_name || "Customer";
      if (email) {
        await sendEmail({
          to: email,
          subject: "Payment Received – Altar Stone",
          html: `<p>Hi ${name},</p><p>We've received your payment of <strong>$${Number(payment.amount).toFixed(2)}</strong> for Order #${payment.order_id?.slice(0, 8).toUpperCase()}.</p><p>Thank you!</p><p>Best regards,<br/>Altar Stone Countertops</p>`,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stripe-payments-list"] });
      qc.invalidateQueries({ queryKey: ["stripe-financials"] });
      qc.invalidateQueries({ queryKey: ["all-payments-for-chart"] });
      setMarkPaidPayment(null);
      setInvoicePayment(null);
      toast({ title: "Payment marked as paid" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (payment: any) => {
      const { data: order } = await supabase.from("orders").select("*, customers(email, full_name)").eq("id", payment.order_id).single();
      const customerEmail = order?.customers?.email || payment.customer_email;
      const customerName = order?.customers?.full_name || "Customer";
      if (!customerEmail) throw new Error("No customer email found");
      const stripeLink = payment.stripe_url ? `<p><a href="${payment.stripe_url}" style="display:inline-block;background:#C4932A;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;">Pay Now</a></p>` : "";
      await sendEmail({
        to: customerEmail,
        subject: `Payment Reminder — Order ${payment.order_id?.slice(0, 8).toUpperCase()} — Altar Stone`,
        html: `<p>Hi ${customerName},</p><p>This is a friendly reminder that your payment of <strong>$${Number(payment.amount).toFixed(2)}</strong> for Order #${payment.order_id?.slice(0, 8).toUpperCase()} is still pending.</p>${stripeLink}<p>Please complete your payment at your earliest convenience.</p><p>Best regards,<br/>Altar Stone Countertops</p>`,
      });
    },
    onSuccess: () => toast({ title: "Reminder sent" }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (payment: any) => {
      await supabase.from("stripe_payments").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", payment.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stripe-payments-list"] });
      qc.invalidateQueries({ queryKey: ["stripe-financials"] });
      setInvoicePayment(null);
      toast({ title: "Payment cancelled" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Export Functions ──
  const exportCSV = () => {
    const [year, month] = reportMonth.split("-").map(Number);
    const ms = new Date(year, month - 1, 1);
    const me = endOfMonth(ms);
    const rows: string[] = ["Type,Date,Category,Description,Amount,Status"];
    allPayments.filter((p: any) => {
      const d = parseISO(p.payment_date || p.created_at);
      return d >= ms && d <= me;
    }).forEach((p: any) => {
      rows.push(`Payment,${p.payment_date || p.created_at},${p.payment_method || "stripe"},${(p.notes || "").replace(/,/g, ";")},${p.amount},${p.status}`);
    });
    expenses.filter((e: any) => {
      const d = parseISO(e.date);
      return d >= ms && d <= me;
    }).forEach((e: any) => {
      rows.push(`Expense,${e.date},${e.category},${(e.description || "").replace(/,/g, ";")},${e.amount},—`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${reportMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const [year, month] = reportMonth.split("-").map(Number);
    const ms = new Date(year, month - 1, 1);
    const me = endOfMonth(ms);
    const label = format(ms, "MMMM yyyy");
    const monthPayments = allPayments.filter((p: any) => {
      const d = parseISO(p.payment_date || p.created_at);
      return d >= ms && d <= me;
    });
    const monthExpenses = expenses.filter((e: any) => {
      const d = parseISO(e.date);
      return d >= ms && d <= me;
    });
    const rev = monthPayments.filter((p: any) => p.status === "completed" || p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount), 0);
    const exp = monthExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const net = rev - exp;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Financial Report — ${label}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#333;}h1{color:#1a1a2e;border-bottom:2px solid #C4932A;padding-bottom:10px;}
    .summary{display:flex;gap:24px;margin:20px 0;}.card{background:#f9f8f6;padding:16px;border-radius:8px;flex:1;text-align:center;}
    .card h3{margin:0;font-size:12px;color:#777;}.card p{margin:4px 0 0;font-size:24px;font-weight:bold;}
    table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{padding:8px 12px;border:1px solid #ddd;text-align:left;font-size:13px;}
    th{background:#f5f5f5;font-weight:600;}</style></head><body>
    <h1>Altar Stone — Financial Report</h1><p style="color:#777;">${label}</p>
    <div class="summary">
      <div class="card"><h3>Revenue</h3><p style="color:green;">$${rev.toFixed(2)}</p></div>
      <div class="card"><h3>Expenses</h3><p style="color:red;">$${exp.toFixed(2)}</p></div>
      <div class="card"><h3>Net Profit</h3><p style="color:${net >= 0 ? "green" : "red"};">$${net.toFixed(2)}</p></div>
    </div>
    <h2>Payments</h2>
    <table><tr><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr>
    ${monthPayments.map((p: any) => `<tr><td>${p.payment_date || p.created_at}</td><td>${p.payment_method || "—"}</td><td>$${Number(p.amount).toFixed(2)}</td><td>${p.status}</td></tr>`).join("")}
    </table>
    <h2>Expenses</h2>
    <table><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr>
    ${monthExpenses.map((e: any) => `<tr><td>${e.date}</td><td>${e.category}</td><td>${e.description || "—"}</td><td>$${Number(e.amount).toFixed(2)}</td></tr>`).join("")}
    </table>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const exportInvoicePDF = (p: any) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice INV-${p.order_id?.slice(0, 8).toUpperCase()}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#333;}h1{color:#1a1a2e;border-bottom:2px solid #C4932A;padding-bottom:10px;}
    table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{padding:10px 14px;border:1px solid #ddd;text-align:left;font-size:13px;}
    th{background:#f5f5f5;font-weight:600;}.total{font-size:20px;font-weight:bold;color:#C4932A;}</style></head><body>
    <h1>INVOICE</h1>
    <p><strong>Invoice #:</strong> INV-${p.order_id?.slice(0, 8).toUpperCase()}</p>
    <p><strong>Date:</strong> ${format(new Date(p.created_at), "MMM d, yyyy")}</p>
    <p><strong>Order ID:</strong> ${p.order_id?.slice(0, 8).toUpperCase()}</p>
    <p><strong>Payment Type:</strong> ${(p.payment_type || "custom").replace(/_/g, " ")}</p>
    <p><strong>Status:</strong> ${p.status}</p>
    <table><tr><th>Description</th><th>Amount</th></tr>
    <tr><td>${(p.payment_type || "Payment").replace(/_/g, " ")} — Order #${p.order_id?.slice(0, 8).toUpperCase()}</td><td class="total">$${Number(p.amount).toFixed(2)}</td></tr>
    </table>
    <p style="margin-top:30px;text-align:center;color:#777;font-size:12px;">Altar Stone Countertops · info@altarstonecountertops.com</p>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const badgeConfig: Record<string, { label: string; className: string }> = {
    auto_confirmed: { label: "✓ Auto-Confirmed", className: "bg-green-100 text-green-800" },
    manually_confirmed: { label: "Manually Confirmed", className: "bg-green-100 text-green-800" },
    paid: { label: "Paid", className: "bg-green-100 text-green-800" },
    awaiting: { label: "Awaiting Payment", className: "bg-yellow-100 text-yellow-800" },
    overdue: { label: "Overdue", className: "bg-red-100 text-red-800" },
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-800" },
    expired: { label: "Expired", className: "bg-gray-100 text-gray-800" },
    refunded: { label: "Refunded", className: "bg-purple-100 text-purple-800" },
    partially_refunded: { label: "Partially Refunded", className: "bg-orange-100 text-orange-800" },
  };

  const isPaidStatus = (s: string) => ["paid", "auto_confirmed", "manually_confirmed"].includes(s);

  return (
    <div className="space-y-6">
      {/* Header + Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Financial Summary</h1>
        <div className="flex items-center gap-2">
          <Input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-40" />
          <Button variant="outline" size="sm" onClick={exportPDF}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
          <Button variant="outline" size="sm" onClick={exportCSV}><FileDown className="h-4 w-4 mr-1" /> CSV</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="h-3.5 w-3.5" /> Collected This Month</div><p className="text-2xl font-bold text-green-600">{isLoading ? "..." : `$${collectedThisMonth.toFixed(2)}`}</p></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="h-3.5 w-3.5" /> Total Pending</div><p className="text-2xl font-bold text-yellow-600">{isLoading ? "..." : `$${(financials?.totalPending || 0).toFixed(2)}`}</p></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><RotateCcw className="h-3.5 w-3.5" /> Total Refunded</div><p className="text-2xl font-bold text-purple-600">{isLoading ? "..." : `$${(financials?.totalRefunded || 0).toFixed(2)}`}</p></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Minus className="h-3.5 w-3.5" /> Expenses This Month</div><p className="text-2xl font-bold text-red-600">${totalExpensesThisMonth.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="h-3.5 w-3.5" /> Net Profit</div><p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>${netProfit.toFixed(2)}</p></CardContent></Card>
      </div>

      {/* Revenue vs Expenses Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Revenue vs Expenses</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-accent" /> Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : !recentPayments.length ? (
            <p className="text-muted-foreground text-center py-8">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((p: any) => {
                    const badge = badgeConfig[p.badgeType] || badgeConfig[p.status] || { label: p.status, className: "" };
                    const canMarkPaid = !isPaidStatus(p.badgeType) && p.status !== "cancelled";
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-mono text-xs">{p.order_id?.slice(0, 8).toUpperCase()}</TableCell>
                        <TableCell className="text-sm capitalize">{p.payment_type?.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-sm font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="View Invoice" onClick={() => setInvoicePayment(p)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {canMarkPaid && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" title="Mark as Paid" onClick={() => setMarkPaidPayment(p)}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canMarkPaid && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Send Reminder" onClick={() => sendReminderMutation.mutate(p)} disabled={sendReminderMutation.isPending}>
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark as Paid Confirmation Dialog */}
      <AlertDialog open={!!markPaidPayment} onOpenChange={(open) => !open && setMarkPaidPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Mark <strong>${Number(markPaidPayment?.amount || 0).toFixed(2)}</strong> as paid for Order <strong>#{markPaidPayment?.order_id?.slice(0, 8).toUpperCase()}</strong>?
              This will update the order status and send a confirmation email to the customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => markPaidMutation.mutate(markPaidPayment)} disabled={markPaidMutation.isPending}>
              {markPaidMutation.isPending ? "Processing..." : "Mark as Paid"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Detail Modal */}
      <Dialog open={!!invoicePayment} onOpenChange={(open) => !open && setInvoicePayment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice INV-{invoicePayment?.order_id?.slice(0, 8).toUpperCase()}</DialogTitle>
            <DialogDescription>Payment details and actions</DialogDescription>
          </DialogHeader>
          {invoicePayment && (() => {
            const badge = badgeConfig[invoicePayment.badgeType] || badgeConfig[invoicePayment.status] || { label: invoicePayment.status, className: "" };
            const canMarkPaid = !isPaidStatus(invoicePayment.badgeType) && invoicePayment.status !== "cancelled";
            return (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                  <span className="text-2xl font-bold text-accent">${Number(invoicePayment.amount).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Invoice #</span><p className="font-medium">INV-{invoicePayment.order_id?.slice(0, 8).toUpperCase()}</p></div>
                  <div><span className="text-muted-foreground">Date</span><p className="font-medium">{format(new Date(invoicePayment.created_at), "MMM d, yyyy")}</p></div>
                  <div><span className="text-muted-foreground">Order ID</span><p className="font-mono text-xs font-medium">{invoicePayment.order_id?.slice(0, 8).toUpperCase()}</p></div>
                  <div><span className="text-muted-foreground">Payment Type</span><p className="font-medium capitalize">{invoicePayment.payment_type?.replace(/_/g, " ") || "Custom"}</p></div>
                </div>
                {invoicePayment.stripe_url && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <span className="text-muted-foreground">Stripe Payment Link</span>
                      <p className="font-medium text-xs break-all">
                        <a href={invoicePayment.stripe_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{invoicePayment.stripe_url}</a>
                      </p>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {canMarkPaid && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setMarkPaidPayment(invoicePayment); }} disabled={markPaidMutation.isPending}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark as Paid
                    </Button>
                  )}
                  {canMarkPaid && (
                    <Button size="sm" variant="outline" onClick={() => sendReminderMutation.mutate(invoicePayment)} disabled={sendReminderMutation.isPending}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Resend Invoice
                    </Button>
                  )}
                  {invoicePayment.stripe_url && (
                    <Button size="sm" variant="outline" onClick={() => copyLink(invoicePayment.stripe_url)}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => exportInvoicePDF(invoicePayment)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
                  </Button>
                  {canMarkPaid && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel this invoice?</AlertDialogTitle>
                          <AlertDialogDescription>This will mark the payment as cancelled. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep</AlertDialogCancel>
                          <AlertDialogAction onClick={() => cancelPaymentMutation.mutate(invoicePayment)}>Cancel Invoice</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Expenses Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" /> Expenses
            </CardTitle>
            <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm((p) => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount ($)</Label>
                    <Input type="number" step="0.01" min="0" value={expenseForm.amount} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={expenseForm.description} onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional description..." />
                  </div>
                  <div>
                    <Label>Receipt (optional)</Label>
                    <Input type="file" accept="image/*,.pdf" onChange={(e) => setExpenseForm((p) => ({ ...p, receiptFile: e.target.files?.[0] || null }))} />
                  </div>
                  <Button className="w-full" onClick={() => addExpenseMutation.mutate()} disabled={!expenseForm.amount || addExpenseMutation.isPending}>
                    {addExpenseMutation.isPending ? "Saving..." : "Save Expense"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!expenses.length ? (
            <p className="text-muted-foreground text-center py-6">No expenses recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{format(parseISO(e.date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-sm"><Badge variant="outline">{e.category}</Badge></TableCell>
                      <TableCell className="text-sm">{e.description || "—"}</TableCell>
                      <TableCell className="text-sm font-medium text-red-600">${Number(e.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteExpenseMutation.mutate(e.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFinancials;
