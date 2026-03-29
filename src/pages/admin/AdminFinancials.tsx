import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Clock, RotateCcw, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const AdminFinancials = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["stripe-financials"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { action: "financials" },
      });
      if (error) throw error;
      return data;
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800",
    refunded: "bg-purple-100 text-purple-800",
    partially_refunded: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Financial Summary</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <TrendingUp className="h-4 w-4" /> Collected This Month
            </div>
            <p className="text-3xl font-bold text-green-600">
              {isLoading ? "..." : `$${(data?.totalCollected || 0).toFixed(2)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Clock className="h-4 w-4" /> Total Pending
            </div>
            <p className="text-3xl font-bold text-yellow-600">
              {isLoading ? "..." : `$${(data?.totalPending || 0).toFixed(2)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <RotateCcw className="h-4 w-4" /> Total Refunded
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {isLoading ? "..." : `$${(data?.totalRefunded || 0).toFixed(2)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-accent" /> Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : !data?.recentPayments?.length ? (
            <p className="text-muted-foreground text-center py-8">No payments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentPayments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-mono text-xs">{p.order_id?.slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell className="text-sm capitalize">{p.payment_type?.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[p.status] || ""}>
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFinancials;
