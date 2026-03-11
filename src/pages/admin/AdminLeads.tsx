import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, UserPlus, FileCheck } from "lucide-react";
import { format } from "date-fns";

interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  city: string;
  project_type: string;
  company_name: string | null;
  timeline: string | null;
  preferred_contact_method: string | null;
  notes: string | null;
  status: string;
  quote_id: string | null;
  created_at: string;
}

const statusColor: Record<string, string> = {
  new_lead: "bg-blue-100 text-blue-800",
  quoted: "bg-green-100 text-green-800",
  contacted: "bg-yellow-100 text-yellow-800",
  converted: "bg-accent/20 text-accent-foreground",
};

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const filtered = leads.filter(
    (l) =>
      l.full_name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.city.toLowerCase().includes(search.toLowerCase())
  );

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === "new_lead").length;
  const quotedLeads = leads.filter((l) => l.status === "quoted").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-semibold">Leads</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><Users className="h-5 w-5 text-accent" /><span className="text-2xl font-bold">{totalLeads}</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">New Leads</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-blue-500" /><span className="text-2xl font-bold">{newLeads}</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Quoted</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><FileCheck className="h-5 w-5 text-green-500" /><span className="text-2xl font-bold">{quotedLeads}</span></div></CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search leads..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No leads yet</TableCell></TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.full_name}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>{lead.city}</TableCell>
                    <TableCell>{lead.project_type}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColor[lead.status] || ""}>
                        {lead.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(lead.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
