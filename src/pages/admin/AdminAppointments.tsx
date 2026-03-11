import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Search, Calendar, Users, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { AppointmentAiBriefing } from "@/components/admin/AppointmentAiBriefing";

type Appointment = Tables<"appointments">;

const statusColors: Record<string, string> = {
  requested: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false });
    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("appointments").update({ status: status as any }).eq("id", id);
    fetchAppointments();
  };

  const filtered = appointments.filter((a) => {
    const matchesSearch = !search ||
      a.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      a.customer_email.toLowerCase().includes(search.toLowerCase()) ||
      (a.customer_phone || "").includes(search);
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    total: appointments.length,
    requested: appointments.filter((a) => a.status === "requested").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    completed: appointments.filter((a) => a.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Calendar className="h-4 w-4" /> Total</div>
            <p className="text-2xl font-bold mt-1">{counts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Clock className="h-4 w-4" /> Requested</div>
            <p className="text-2xl font-bold mt-1">{counts.requested}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="h-4 w-4" /> Confirmed</div>
            <p className="text-2xl font-bold mt-1">{counts.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><CheckCircle2 className="h-4 w-4" /> Completed</div>
            <p className="text-2xl font-bold mt-1">{counts.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, or phone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading appointments...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No appointments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Date / Time</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((appt) => (
                    <>
                      <TableRow
                        key={appt.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(expandedId === appt.id ? null : appt.id)}
                      >
                        <TableCell className="px-2">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {expandedId === appt.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{appt.customer_name}</TableCell>
                        <TableCell>
                          <p className="text-sm">{appt.customer_email}</p>
                          {appt.customer_phone && <p className="text-xs text-muted-foreground">{appt.customer_phone}</p>}
                        </TableCell>
                        <TableCell>
                          {appt.preferred_date ? (
                            <div>
                              <p className="text-sm">{format(new Date(appt.preferred_date), "MMM d, yyyy")}</p>
                              {appt.preferred_time && <p className="text-xs text-muted-foreground">{appt.preferred_time}</p>}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{appt.address}</p>
                          {appt.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{appt.notes}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", statusColors[appt.status] || "")}>
                            {appt.status}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select value={appt.status} onValueChange={(v) => updateStatus(appt.id, v)}>
                            <SelectTrigger className="h-8 w-[130px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="requested">Requested</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                      {expandedId === appt.id && (
                        <TableRow key={`${appt.id}-detail`}>
                          <TableCell colSpan={7} className="p-4 bg-muted/20">
                            <div className="max-w-lg">
                              <AppointmentAiBriefing appointmentId={appt.id} />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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

export default AdminAppointments;
