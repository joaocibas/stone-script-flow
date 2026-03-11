import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, Loader2, RefreshCw, Flame, Thermometer, Snowflake, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface LeadAiAnalysisProps {
  leadId: string;
}

interface AnalysisResult {
  leadTemperature: string;
  temperatureReasoning: string;
  projectSummary: string;
  missingInformation: string[];
  recommendedNextAction: string;
  salesNotes: string;
  followUpPriority: string;
  followUpActions: string[];
  raw?: string;
}

const tempIcon: Record<string, typeof Flame> = {
  "Hot Lead": Flame,
  "Warm Lead": Thermometer,
  "Cold Lead": Snowflake,
};

const tempColor: Record<string, string> = {
  "Hot Lead": "bg-red-100 text-red-800 border-red-200",
  "Warm Lead": "bg-amber-100 text-amber-800 border-amber-200",
  "Cold Lead": "bg-blue-100 text-blue-800 border-blue-200",
};

const priorityColor: Record<string, string> = {
  immediate: "bg-red-100 text-red-800",
  within_24h: "bg-amber-100 text-amber-800",
  within_week: "bg-blue-100 text-blue-800",
  low: "bg-muted text-muted-foreground",
};

export function LeadAiAnalysis({ leadId }: LeadAiAnalysisProps) {
  const queryClient = useQueryClient();

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["lead-ai-analysis", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_ai_analyses")
        .select("*")
        .eq("lead_id", leadId)
        .eq("analysis_type", "lead_qualification")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const runAnalysis = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-lead-analysis", {
        body: { analysis_type: "lead_qualification", lead_id: leadId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("AI analysis completed");
      queryClient.invalidateQueries({ queryKey: ["lead-ai-analysis", leadId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "AI analysis is temporarily unavailable.");
    },
  });

  const result = analysis?.result_json as AnalysisResult | undefined;
  const TempIcon = result?.leadTemperature ? (tempIcon[result.leadTemperature] || Brain) : Brain;

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" />
            AI Analysis
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={runAnalysis.isPending}
              onClick={() => runAnalysis.mutate()}
            >
              {runAnalysis.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : analysis ? (
                <RefreshCw className="h-3 w-3 mr-1" />
              ) : (
                <Brain className="h-3 w-3 mr-1" />
              )}
              {analysis ? "Refresh" : "Run Analysis"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !result ? (
          <div className="text-center py-4">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">Click "Run Analysis" to get AI insights</p>
          </div>
        ) : result.raw ? (
          <p className="text-sm text-muted-foreground">{result.raw}</p>
        ) : (
          <>
            {/* Temperature Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-sm px-3 py-1 ${tempColor[result.leadTemperature] || ""}`}>
                <TempIcon className="h-3.5 w-3.5 mr-1" />
                {result.leadTemperature}
              </Badge>
              <Badge variant="outline" className={`text-xs ${priorityColor[result.followUpPriority] || ""}`}>
                {result.followUpPriority?.replace("_", " ")}
              </Badge>
            </div>

            {/* Temperature reasoning */}
            {result.temperatureReasoning && (
              <p className="text-xs text-muted-foreground italic">{result.temperatureReasoning}</p>
            )}

            {/* Project Summary */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium mb-1">Project Summary</p>
              <p className="text-xs text-muted-foreground">{result.projectSummary}</p>
            </div>

            {/* Missing Information */}
            {result.missingInformation?.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  Missing Information
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {result.missingInformation.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Action */}
            <div className="p-3 bg-accent/5 rounded-lg border border-accent/10">
              <p className="text-xs font-medium mb-1">Recommended Next Action</p>
              <p className="text-xs">{result.recommendedNextAction}</p>
            </div>

            {/* Follow-up Actions */}
            {result.followUpActions?.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Follow-up Actions</p>
                <ul className="space-y-1">
                  {result.followUpActions.map((action, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                      <span className="text-accent mt-0.5">•</span> {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sales Notes */}
            {result.salesNotes && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs font-medium mb-1">Sales Notes</p>
                <p className="text-xs text-muted-foreground">{result.salesNotes}</p>
              </div>
            )}

            {/* Timestamp */}
            {analysis?.created_at && (
              <p className="text-[10px] text-muted-foreground text-right">
                Analyzed {format(new Date(analysis.created_at), "MMM d, h:mm a")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
