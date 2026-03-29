import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { EstimateTab } from "@/components/admin/orders/EstimateTab";
import { PaymentOrderTab } from "@/components/admin/orders/PaymentOrderTab";
import { PartialReceiptTab } from "@/components/admin/orders/PartialReceiptTab";
import { ReceiptTab } from "@/components/admin/orders/ReceiptTab";
import { StripePaymentSection } from "@/components/admin/orders/StripePaymentSection";
import { useOrder } from "@/hooks/useOrder";

const AdminOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = useOrder({ id, includeCustomer: true });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/orders")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
        </Button>
        <p className="text-muted-foreground text-center py-8">Order not found.</p>
      </div>
    );
  }

  const customer = order.customers as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/orders")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-muted-foreground">
            {customer?.full_name || "Unknown Customer"} · Status: {order.status}
          </p>
        </div>
      </div>

      {/* Stripe Payment Section */}
      <StripePaymentSection orderId={order.id} order={order} customer={customer} />

      <Tabs defaultValue="estimate" className="w-full">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="estimate">Estimate</TabsTrigger>
          <TabsTrigger value="payment-order">Payment Order</TabsTrigger>
          <TabsTrigger value="partial-receipt">Partial Receipt</TabsTrigger>
          <TabsTrigger value="receipt">Receipt</TabsTrigger>
        </TabsList>

        <TabsContent value="estimate">
          <EstimateTab orderId={order.id} order={order} customer={customer} />
        </TabsContent>
        <TabsContent value="payment-order">
          <PaymentOrderTab orderId={order.id} customer={customer} />
        </TabsContent>
        <TabsContent value="partial-receipt">
          <PartialReceiptTab orderId={order.id} customer={customer} />
        </TabsContent>
        <TabsContent value="receipt">
          <ReceiptTab orderId={order.id} customer={customer} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminOrderDetail;
