import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, Loader2, RefreshCw, ClipboardList } from "lucide-react";
import { format } from "date-fns";

interface Props {
  appointmentId: string;
}

interface BriefingResult {
  clientSummary: string;
  projectOverview: string;
  estimatedScope?: string;
  likelyNeeds: string[];
  questionsToConfirm: string[];
  preparationNotes: string;
  importantFlags?: string[];
  raw?: string;
}

export function AppointmentAiBriefing({ appointmentId }: Props) {
  const queryClient = useQueryClient();

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["appointment-ai-briefing", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_ai_analyses")
        .select("*")
        .eq("appointment_id", appointmentId)
        .eq("analysis_type", "appointment_briefing")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const runBriefing = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-lead-analysis", {
        body: { analysis_type: "appointment_briefing", appointment_id: appointmentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Consultation briefing generated");
      queryClient.invalidateQueries({ queryKey: ["appointment-ai-briefing", appointmentId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "AI analysis is temporarily unavailable.");
    },
  });

  const result = analysis?.result_json as BriefingResult | undefined;

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-accent" />
            AI Consultation Brief
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={runBriefing.isPending}
            onClick={() => runBriefing.mutate()}
          >
            {runBriefing.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : analysis ? (
              <RefreshCw className="h-3 w-3 mr-1" />
            ) : (
              <Brain className="h-3 w-3 mr-1" />
            )}
            {analysis ? "Refresh" : "Generate Brief"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !result ? (
          <div className="text-center py-4">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">Generate a briefing for this consultation</p>
          </div>
        ) : result.raw ? (
          <p className="text-sm text-muted-foreground">{result.raw}</p>
        ) : (
          <>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium mb-1">Client Summary</p>
              <p className="text-xs text-muted-foreground">{result.clientSummary}</p>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium mb-1">Project Overview</p>
              <p className="text-xs text-muted-foreground">{result.projectOverview}</p>
            </div>

            {result.estimatedScope && (
              <div className="p-3 bg-accent/5 rounded-lg border border-accent/10">
                <p className="text-xs font-medium mb-1">Estimated Scope</p>
                <p className="text-xs">{result.estimatedScope}</p>
              </div>
            )}

            {result.likelyNeeds?.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Likely Needs</p>
                <div className="flex flex-wrap gap-1">
                  {result.likelyNeeds.map((need, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{need}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.questionsToConfirm?.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Questions to Confirm On-Site</p>
                <ul className="space-y-1">
                  {result.questionsToConfirm.map((q, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                      <span className="text-accent font-bold mt-0.5">{i + 1}.</span> {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.importantFlags?.length ? (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xs font-medium mb-1 text-red-800">⚠️ Important Flags</p>
                <ul className="space-y-0.5">
                  {result.importantFlags.map((flag, i) => (
                    <li key={i} className="text-xs text-red-700">{flag}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs font-medium mb-1">Preparation Notes</p>
              <p className="text-xs text-muted-foreground">{result.preparationNotes}</p>
            </div>

            {analysis?.created_at && (
              <p className="text-[10px] text-muted-foreground text-right">
                Generated {format(new Date(analysis.created_at), "MMM d, h:mm a")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
