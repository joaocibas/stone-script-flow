import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/send-email";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Copy, Mail, Link2, XCircle, RotateCcw, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StripePaymentSectionProps {
  orderId: string;
  order: any;
  customer: any;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
  refunded: "bg-purple-100 text-purple-800",
  partially_refunded: "bg-orange-100 text-orange-800",
};

export function StripePaymentSection({ orderId, order, customer }: StripePaymentSectionProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showShare, setShowShare] = useState<any>(null);
  const [cancelId, setCancelId] = useState<any>(null);
  const [refundTarget, setRefundTarget] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundType, setRefundType] = useState<"full" | "partial">("full");

  const [paymentType, setPaymentType] = useState("deposit");
  const [customAmount, setCustomAmount] = useState(0);

  const orderTotal = Number(order?.total_amount) || 0;
  const depositPaid = Number(order?.deposit_paid) || 0;

  const computeAmount = () => {
    switch (paymentType) {
      case "deposit": return Math.round(orderTotal * 0.5 * 100) / 100;
      case "final": return Math.max(0, Math.round((orderTotal - depositPaid) * 100) / 100);
      case "full": return orderTotal;
      case "custom": return customAmount;
      default: return 0;
    }
  };

  const { data: stripePayments, isLoading } = useQuery({
    queryKey: ["stripe-payments", orderId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("stripe_payments" as any).select("*") as any)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const amount = computeAmount();
      if (amount <= 0) throw new Error("Amount must be greater than 0");

      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          action: "create",
          order_id: orderId,
          customer_id: customer?.id || null,
          customer_email: customer?.email || "",
          customer_name: customer?.full_name || "",
          amount,
          payment_type: paymentType,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stripe-payments", orderId] });
      setShowCreate(false);
      setShowShare({ url: data.url, stripe_payment_id: data.stripe_payment_id });
      toast({ title: "Payment link created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (payment: any) => {
      const { error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          action: "cancel",
          stripe_payment_id: payment.id,
          stripe_checkout_session_id: payment.stripe_checkout_session_id,
        },
      });
      if (error) throw error;

      // Send cancellation email
      if (customer?.email) {
        try {
          await sendEmail({
            to: customer.email,
            subject: "Payment Link Cancelled – Altar Stone",
            html: `<div style="font-family: 'Playfair Display', Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; border-bottom: 2px solid #C4932A; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #C4932A;">Altar Stone</h1>
              </div>
              <h2>Payment Link Cancelled</h2>
              <p>Your payment link for Order #${orderId.slice(0, 8).toUpperCase()} has been cancelled.</p>
              <p>If you have questions, please contact us.</p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; text-align: center;">
                <p>Altar Stone Countertops · Sarasota, FL</p>
              </div>
            </div>`,
          });
        } catch {}
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stripe-payments", orderId] });
      setCancelId(null);
      toast({ title: "Payment link cancelled" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const refundMutation = useMutation({
    mutationFn: async () => {
      if (!refundTarget?.stripe_payment_intent_id) throw new Error("No payment intent found for refund");
      const amt = refundType === "full" ? undefined : refundAmount;
      const { error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          action: "refund",
          stripe_payment_id: refundTarget.id,
          stripe_payment_intent_id: refundTarget.stripe_payment_intent_id,
          refund_amount: amt,
        },
      });
      if (error) throw error;

      // Send refund email
      if (customer?.email) {
        try {
          const refundedAmt = amt || Number(refundTarget.amount);
          await sendEmail({
            to: customer.email,
            subject: "Refund Processed – Altar Stone",
            html: `<div style="font-family: 'Playfair Display', Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; border-bottom: 2px solid #C4932A; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #C4932A;">Altar Stone</h1>
              </div>
              <h2>Refund Processed</h2>
              <p>Your refund of <strong>$${refundedAmt.toFixed(2)}</strong> has been processed for Order #${orderId.slice(0, 8).toUpperCase()}.</p>
              <p>Please allow 5-10 business days for the refund to appear in your account.</p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; text-align: center;">
                <p>Altar Stone Countertops · Sarasota, FL</p>
              </div>
            </div>`,
          });
        } catch {}
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stripe-payments", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      setRefundTarget(null);
      toast({ title: "Refund processed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard!" });
  };

  const sendLinkEmail = async (url: string) => {
    if (!customer?.email) {
      toast({ title: "No customer email", variant: "destructive" });
      return;
    }
    try {
      await sendEmail({
        to: customer.email,
        subject: "Your Payment Link – Altar Stone",
        html: `<div style="font-family: 'Playfair Display', Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; border-bottom: 2px solid #C4932A; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #C4932A;">Altar Stone</h1>
          </div>
          <h2>Payment Request</h2>
          <p>Dear ${customer.full_name || "Customer"},</p>
          <p>Please click the link below to complete your payment for Order #${orderId.slice(0, 8).toUpperCase()}:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}" style="background: #C4932A; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Pay Now</a>
          </div>
          <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link: ${url}</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; text-align: center;">
            <p>Altar Stone Countertops · Sarasota, FL</p>
          </div>
        </div>`,
      });
      toast({ title: "Payment link sent to customer!" });
    } catch {
      toast({ title: "Failed to send email", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-accent flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Stripe Payments
            </h3>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Link2 className="mr-2 h-4 w-4" /> Generate Payment Link
            </Button>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground text-sm text-center py-4">Loading...</p>
          ) : !stripePayments || stripePayments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No payment links generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stripePayments.map((sp: any) => (
                  <TableRow key={sp.id}>
                    <TableCell className="text-sm">{format(new Date(sp.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-sm capitalize">{sp.payment_type?.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm font-medium">${Number(sp.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[sp.status] || ""}>
                        {sp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {sp.stripe_url && sp.status === "pending" && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => copyLink(sp.stripe_url)} title="Copy Link">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => sendLinkEmail(sp.stripe_url)} title="Send Email">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => window.open(sp.stripe_url, "_blank")} title="Open Link">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setCancelId(sp)} title="Cancel">
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {sp.status === "paid" && sp.stripe_payment_intent_id && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          setRefundTarget(sp);
                          setRefundAmount(Number(sp.amount));
                          setRefundType("full");
                        }}>
                          <RotateCcw className="mr-1 h-4 w-4" /> Refund
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Payment Link Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Payment Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Payment Type</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit (50%) — ${(orderTotal * 0.5).toFixed(2)}</SelectItem>
                  <SelectItem value="final">Final Payment — ${Math.max(0, orderTotal - depositPaid).toFixed(2)}</SelectItem>
                  <SelectItem value="full">Full Payment — ${orderTotal.toFixed(2)}</SelectItem>
                  <SelectItem value="custom">Custom Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentType === "custom" && (
              <div>
                <Label>Custom Amount ($)</Label>
                <Input type="number" min={0} step={0.01} value={customAmount} onChange={(e) => setCustomAmount(Number(e.target.value))} className="mt-1" />
              </div>
            )}
            <div className="p-3 rounded-md bg-muted text-sm">
              <p>Customer: <strong>{customer?.full_name || "—"}</strong></p>
              <p>Email: <strong>{customer?.email || "—"}</strong></p>
              <p>Amount: <strong>${computeAmount().toFixed(2)}</strong></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || computeAmount() <= 0}>
              {createMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Generate Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Payment Link Dialog */}
      <Dialog open={!!showShare} onOpenChange={() => setShowShare(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Link Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md break-all text-sm font-mono">{showShare?.url}</div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => copyLink(showShare?.url || "")}>
                <Copy className="mr-2 h-4 w-4" /> Copy Link
              </Button>
              <Button onClick={() => { sendLinkEmail(showShare?.url || ""); setShowShare(null); }}>
                <Mail className="mr-2 h-4 w-4" /> Send by Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Payment Link?</AlertDialogTitle>
            <AlertDialogDescription>This will deactivate the payment link. The customer will no longer be able to use it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelId && cancelMutation.mutate(cancelId)} className="bg-destructive text-destructive-foreground">
              Cancel Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Dialog */}
      <Dialog open={!!refundTarget} onOpenChange={() => setRefundTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Original payment: <strong>${Number(refundTarget?.amount || 0).toFixed(2)}</strong></p>
            <div>
              <Label>Refund Type</Label>
              <Select value={refundType} onValueChange={(v) => {
                setRefundType(v as "full" | "partial");
                if (v === "full") setRefundAmount(Number(refundTarget?.amount || 0));
              }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Refund — ${Number(refundTarget?.amount || 0).toFixed(2)}</SelectItem>
                  <SelectItem value="partial">Partial Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {refundType === "partial" && (
              <div>
                <Label>Refund Amount ($)</Label>
                <Input type="number" min={0.01} max={Number(refundTarget?.amount || 0)} step={0.01} value={refundAmount} onChange={(e) => setRefundAmount(Number(e.target.value))} className="mt-1" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => refundMutation.mutate()} disabled={refundMutation.isPending}>
              {refundMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : `Refund $${(refundType === "full" ? Number(refundTarget?.amount || 0) : refundAmount).toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
