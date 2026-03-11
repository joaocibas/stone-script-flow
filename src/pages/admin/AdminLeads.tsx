import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, UserPlus, FileCheck, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { LeadAiAnalysis } from "@/components/admin/LeadAiAnalysis";

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
  appointment_scheduled: "bg-purple-100 text-purple-800",
};

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
                <TableHead className="w-8"></TableHead>
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
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No leads yet</TableCell></TableRow>
              ) : (
                filtered.map((lead) => (
                  <>
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                    >
                      <TableCell className="px-2">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          {expandedId === lead.id ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{lead.full_name}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.phone}</TableCell>
                      <TableCell>{lead.city}</TableCell>
                      <TableCell>{lead.project_type}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColor[lead.status] || ""}>
                          {lead.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(lead.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                    {expandedId === lead.id && (
                      <TableRow key={`${lead.id}-detail`}>
                        <TableCell colSpan={8} className="p-4 bg-muted/20">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Lead Details */}
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Lead Details</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2 text-sm">
                                {lead.company_name && (
                                  <div><span className="text-muted-foreground">Company:</span> {lead.company_name}</div>
                                )}
                                {lead.timeline && (
                                  <div><span className="text-muted-foreground">Timeline:</span> {lead.timeline}</div>
                                )}
                                {lead.preferred_contact_method && (
                                  <div><span className="text-muted-foreground">Preferred Contact:</span> {lead.preferred_contact_method}</div>
                                )}
                                {lead.notes && (
                                  <div><span className="text-muted-foreground">Notes:</span> {lead.notes}</div>
                                )}
                                {lead.quote_id && (
                                  <div><span className="text-muted-foreground">Quote:</span> <Badge variant="outline" className="text-xs">Linked</Badge></div>
                                )}
                              </CardContent>
                            </Card>

                            {/* AI Analysis */}
                            <LeadAiAnalysis leadId={lead.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
