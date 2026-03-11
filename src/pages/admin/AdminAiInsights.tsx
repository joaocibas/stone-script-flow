import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Brain, Play, Loader2, Clock, TrendingUp, Target,
  DollarSign, AlertTriangle, Mail, BarChart3, ShieldCheck,
  Search, RefreshCw, Globe, HelpCircle, FileText,
} from "lucide-react";
import { format } from "date-fns";

const REPORT_TYPES = [
  { value: "icp_analysis", label: "ICP Analysis", icon: Target, description: "Ideal customer profile segmentation" },
  { value: "funnel_analysis", label: "Conversion Funnel", icon: TrendingUp, description: "Quote → order conversion analysis" },
  { value: "pricing_validation", label: "Pricing Validation", icon: DollarSign, description: "Price range and competitiveness check" },
  { value: "sla_monitoring", label: "SLA Monitoring", icon: ShieldCheck, description: "Service level breach analysis" },
  { value: "reservation_conflicts", label: "Reservation Conflicts", icon: AlertTriangle, description: "Hold duration and expiration patterns" },
  { value: "followup_emails", label: "Follow-up Emails", icon: Mail, description: "AI-generated email templates" },
  { value: "revenue_by_material", label: "Revenue by Material", icon: BarChart3, description: "Material performance breakdown" },
] as const;

interface AiReport {
  id: string;
  report_type: string;
  period: string;
  result_json: Record<string, unknown>;
  model_used: string | null;
  created_at: string;
}

const AdminAiInsights = () => {
  const [selectedType, setSelectedType] = useState<string>("funnel_analysis");
  const queryClient = useQueryClient();

  // Fetch report history
  const { data: reports, isLoading: loadingReports } = useQuery({
    queryKey: ["ai-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_ai_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AiReport[];
    },
  });

  // Fetch schedule setting
  const { data: frequency } = useQuery({
    queryKey: ["ai-report-frequency"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("value")
        .eq("key", "ai_report_frequency")
        .maybeSingle();
      return data?.value ?? "weekly";
    },
  });

  // Run report mutation
  const runReport = useMutation({
    mutationFn: async (reportType: string) => {
      const { data, error } = await supabase.functions.invoke("ai-analytics", {
        body: { report_type: reportType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${getReportLabel(data.report_type)} completed`);
      queryClient.invalidateQueries({ queryKey: ["ai-reports"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to run analysis");
    },
  });

  // Update frequency
  const updateFrequency = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase
        .from("business_settings")
        .update({ value })
        .eq("key", "ai_report_frequency");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Schedule updated");
      queryClient.invalidateQueries({ queryKey: ["ai-report-frequency"] });
    },
  });

  const getReportLabel = (type: string) =>
    REPORT_TYPES.find((r) => r.value === type)?.label ?? type;

  const getReportIcon = (type: string) =>
    REPORT_TYPES.find((r) => r.value === type)?.icon ?? Brain;

  // Most recent report for each type
  const latestByType = REPORT_TYPES.map((rt) => ({
    ...rt,
    latest: reports?.find((r) => r.report_type === rt.value),
  }));

  // Currently selected report detail (most recent of selected type)
  const selectedReport = reports?.find((r) => r.report_type === selectedType);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
            <Brain className="h-6 w-6 text-accent" />
            AI Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Anonymized, aggregated business intelligence — no personal data is processed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Schedule:
          </div>
          <Select value={frequency} onValueChange={(v) => updateFrequency.mutate(v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="manual">Manual only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Business Reports</TabsTrigger>
          <TabsTrigger value="seo">SEO Helper</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6 mt-4">
          {/* Report type cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {latestByType.map((rt) => {
              const Icon = rt.icon;
              const isSelected = selectedType === rt.value;
              const isRunning = runReport.isPending && runReport.variables === rt.value;
              return (
                <Card
                  key={rt.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "ring-2 ring-accent border-accent" : ""
                  }`}
                  onClick={() => setSelectedType(rt.value)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-accent" />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        disabled={runReport.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          runReport.mutate(rt.value);
                        }}
                      >
                        {isRunning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <CardTitle className="text-sm">{rt.label}</CardTitle>
                    <CardDescription className="text-xs">{rt.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {rt.latest ? (
                      <p className="text-xs text-muted-foreground">
                        Last run: {format(new Date(rt.latest.created_at), "MMM d, h:mm a")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Never run</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator />

          {/* Selected report detail */}
          {selectedReport ? (
            <ReportDetail report={selectedReport} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No report data for <strong>{getReportLabel(selectedType)}</strong> yet.</p>
                <p className="text-sm mt-1">Click the play button to generate your first analysis.</p>
              </CardContent>
            </Card>
          )}

          {/* Report history */}
          {reports && reports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report History</CardTitle>
                <CardDescription>Last 50 reports across all types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between text-sm p-2 rounded cursor-pointer hover:bg-muted/50 ${
                        selectedReport?.id === r.id ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedType(r.report_type)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getReportLabel(r.report_type)}
                        </Badge>
                        {r.model_used && (
                          <span className="text-xs text-muted-foreground">{r.model_used}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="seo" className="mt-4">
          <SeoHelperSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface SeoResult {
  titleSuggestions?: Array<{ page: string; title: string; reasoning?: string }>;
  metaDescriptions?: Array<{ page: string; description: string }>;
  faqIdeas?: Array<{ question: string; answer: string }>;
  localSeoIdeas?: string[];
  servicePageSummaries?: Array<{ service: string; summary: string }>;
  contentStrategy?: string;
  raw?: string;
}

function SeoHelperSection() {
  const queryClient = useQueryClient();

  const { data: seoAnalysis, isLoading } = useQuery({
    queryKey: ["seo-ai-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_ai_analyses")
        .select("*")
        .eq("analysis_type", "seo_suggestions")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const runSeo = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-lead-analysis", {
        body: { analysis_type: "seo_suggestions" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("SEO suggestions generated");
      queryClient.invalidateQueries({ queryKey: ["seo-ai-analysis"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "AI analysis is temporarily unavailable.");
    },
  });

  const result = seoAnalysis?.result_json as unknown as SeoResult | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent" />
            SEO Helper
          </h2>
          <p className="text-sm text-muted-foreground">AI-generated SEO content based on your materials, services, and service areas.</p>
        </div>
        <Button
          onClick={() => runSeo.mutate()}
          disabled={runSeo.isPending}
        >
          {runSeo.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : seoAnalysis ? (
            <RefreshCw className="h-4 w-4 mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          {seoAnalysis ? "Refresh Suggestions" : "Generate SEO Suggestions"}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !result ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Click "Generate SEO Suggestions" to get AI-powered content ideas.</p>
          </CardContent>
        </Card>
      ) : result.raw ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.raw}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {result.titleSuggestions && result.titleSuggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  SEO Title Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.titleSuggestions.map((t, i) => (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t.page}</p>
                    <p className="text-sm font-medium mt-0.5">{t.title}</p>
                    {t.reasoning && <p className="text-xs text-muted-foreground mt-1 italic">{t.reasoning}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.metaDescriptions && result.metaDescriptions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4 text-accent" />
                  Meta Descriptions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.metaDescriptions.map((m, i) => (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">{m.page}</p>
                    <p className="text-sm mt-0.5">{m.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.faqIdeas && result.faqIdeas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-accent" />
                  FAQ Ideas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.faqIdeas.map((faq, i) => (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">{faq.question}</p>
                    <p className="text-xs text-muted-foreground mt-1">{faq.answer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.localSeoIdeas && result.localSeoIdeas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4 text-accent" />
                  Local SEO Content Ideas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {result.localSeoIdeas.map((idea, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-accent font-bold mt-0.5">→</span> {idea}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.servicePageSummaries && result.servicePageSummaries.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  Service Page Summaries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.servicePageSummaries.map((sp, i) => (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">{sp.service}</p>
                    <p className="text-xs text-muted-foreground mt-1">{sp.summary}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.contentStrategy && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Content Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{result.contentStrategy}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {seoAnalysis?.created_at && (
        <p className="text-xs text-muted-foreground text-right">
          Generated {format(new Date(seoAnalysis.created_at), "MMM d, yyyy h:mm a")}
        </p>
      )}
    </div>
  );
}

function ReportDetail({ report }: { report: AiReport }) {
  const result = report.result_json as Record<string, unknown>;

  // Render summary
  const summary = result.summary as string | undefined;
  const recommendations = result.recommendations as string[] | undefined;
  const emails = result.emails as Array<Record<string, unknown>> | undefined;
  const segments = result.segments as Array<Record<string, unknown>> | undefined;
  const stages = result.stages as Array<Record<string, unknown>> | undefined;
  const materials = result.materials as Array<Record<string, unknown>> | undefined;
  const breachAnalysis = result.breach_analysis as Array<Record<string, unknown>> | undefined;
  const metrics = result.metrics as Record<string, unknown> | undefined;
  const issues = result.issues as string[] | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {REPORT_TYPES.find((r) => r.value === report.report_type)?.label ?? report.report_type}
          <Badge variant="secondary" className="text-xs ml-2">
            {format(new Date(report.created_at), "MMM d, h:mm a")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {summary && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-1">Summary</p>
            <p className="text-sm text-muted-foreground">{summary}</p>
          </div>
        )}

        {/* Segments (ICP) */}
        {segments && segments.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Customer Segments</p>
            <div className="grid gap-3">
              {segments.map((seg, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <p className="font-medium text-sm">{seg.name as string}</p>
                  <p className="text-xs text-muted-foreground mt-1">{seg.description as string}</p>
                  {(seg.key_characteristics as string[])?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(seg.key_characteristics as string[]).map((c, j) => (
                        <Badge key={j} variant="outline" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stages (Funnel) */}
        {stages && stages.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Funnel Stages</p>
            <div className="space-y-2">
              {stages.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm font-medium">{s.stage as string}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{String(s.count)}</span>
                    {s.conversion_rate != null && (
                      <Badge variant="secondary" className="text-xs">
                        {Number(s.conversion_rate).toFixed(1)}%
                      </Badge>
                    )}
                    {s.bottleneck_severity && (
                      <Badge
                        variant={s.bottleneck_severity === "high" ? "destructive" : "outline"}
                        className="text-xs"
                      >
                        {s.bottleneck_severity as string}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Materials (Revenue / Pricing) */}
        {materials && materials.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Materials</p>
            <div className="space-y-2">
              {materials.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="text-sm font-medium">{m.name as string || m.material as string}</span>
                    {m.category && <span className="text-xs text-muted-foreground ml-2">{m.category as string}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.total_revenue != null && (
                      <span className="text-sm">${Number(m.total_revenue).toLocaleString()}</span>
                    )}
                    {m.performance && (
                      <Badge variant={m.performance === "top" ? "default" : "outline"} className="text-xs">
                        {m.performance as string}
                      </Badge>
                    )}
                    {m.suggested_action && (
                      <Badge
                        variant={m.suggested_action === "increase" ? "default" : m.suggested_action === "decrease" ? "destructive" : "outline"}
                        className="text-xs"
                      >
                        {m.suggested_action as string}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Breach analysis (SLA) */}
        {breachAnalysis && breachAnalysis.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Breach Analysis</p>
            <div className="space-y-2">
              {breachAnalysis.map((b, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{b.breach_type as string}</span>
                    <Badge
                      variant={b.severity === "critical" || b.severity === "high" ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {b.severity as string}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{b.root_cause as string}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics (Reservations) */}
        {metrics && (
          <div>
            <p className="text-sm font-medium mb-2">Metrics</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(metrics).map(([key, val]) => (
                <div key={key} className="p-3 bg-muted/50 rounded text-center">
                  <p className="text-xs text-muted-foreground">{key.replace(/_/g, " ")}</p>
                  <p className="text-lg font-semibold mt-1">
                    {typeof val === "number" ? (val < 1 ? `${(val * 100).toFixed(1)}%` : val.toFixed(1)) : String(val)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues */}
        {issues && issues.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Issues Identified</p>
            <ul className="list-disc list-inside space-y-1">
              {issues.map((issue, i) => (
                <li key={i} className="text-sm text-muted-foreground">{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Emails (Follow-up) */}
        {emails && emails.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Email Templates</p>
            <div className="space-y-3">
              {emails.map((email, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs">{email.scenario as string}</Badge>
                    <span className="text-xs text-muted-foreground">{email.send_timing as string}</span>
                  </div>
                  <p className="text-sm font-medium">📧 {email.subject as string}</p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{email.body as string}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="p-4 bg-accent/10 rounded-lg">
            <p className="text-sm font-medium mb-2">Recommendations</p>
            <ul className="space-y-1">
              {recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-accent font-bold">→</span> {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Raw fallback */}
        {result.raw && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-1">Raw Response</p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-64">
              {typeof result.raw === "string" ? result.raw : JSON.stringify(result.raw, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminAiInsights;
