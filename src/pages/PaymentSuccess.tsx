import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  const sessionId = searchParams.get("session_id");

  const { data: sessionInfo } = useQuery({
    queryKey: ["stripe-session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { action: "status", stripe_checkout_session_id: sessionId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  const { data: order } = useQuery({
    queryKey: ["order-success", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground">Thank you for your payment. Your transaction has been completed successfully.</p>

          {orderId && (
            <div className="text-left bg-muted rounded-lg p-4 space-y-2 text-sm">
              <p><span className="text-muted-foreground">Order:</span> <strong>#{orderId.slice(0, 8).toUpperCase()}</strong></p>
              {sessionInfo?.amount_total && (
                <p><span className="text-muted-foreground">Amount Paid:</span> <strong>${sessionInfo.amount_total.toFixed(2)}</strong></p>
              )}
              {order && (
                <>
                  <p><span className="text-muted-foreground">Order Total:</span> <strong>${Number(order.total_amount).toFixed(2)}</strong></p>
                  <p><span className="text-muted-foreground">Remaining Balance:</span> <strong>${Math.max(0, Number(order.total_amount) - Number(order.deposit_paid) - (sessionInfo?.amount_total || 0)).toFixed(2)}</strong></p>
                </>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
            {orderId && <Button variant="outline" onClick={() => navigate(`/track/${orderId}`)}>Track Order</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
