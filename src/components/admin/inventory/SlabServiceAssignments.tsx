import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  pricing_unit: string;
  cost_value: number;
}

export interface SlabServiceAssignment {
  service_id: string;
  override_cost: string;
  override_multiplier: string;
  is_active: boolean;
}

interface Props {
  assignments: SlabServiceAssignment[];
  onChange: (assignments: SlabServiceAssignment[]) => void;
}

const UNIT_LABELS: Record<string, string> = {
  fixed: "Fixed",
  per_sqft: "/ sqft",
  per_linear_ft: "/ lin ft",
  per_cutout: "/ cutout",
  per_project: "/ project",
};

export const SlabServiceAssignments = ({ assignments, onChange }: Props) => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("service_items")
      .select("id, name, category, pricing_unit, cost_value")
      .eq("is_active", true)
      .order("category")
      .order("name")
      .then(({ data }) => {
        setServices(data ?? []);
        setLoading(false);
      });
  }, []);

  const isAssigned = (serviceId: string) =>
    assignments.some((a) => a.service_id === serviceId && a.is_active);

  const getAssignment = (serviceId: string) =>
    assignments.find((a) => a.service_id === serviceId);

  const toggleService = (serviceId: string) => {
    const existing = getAssignment(serviceId);
    if (existing) {
      onChange(
        assignments.map((a) =>
          a.service_id === serviceId ? { ...a, is_active: !a.is_active } : a
        )
      );
    } else {
      onChange([
        ...assignments,
        { service_id: serviceId, override_cost: "", override_multiplier: "", is_active: true },
      ]);
    }
  };

  const updateField = (serviceId: string, field: "override_cost" | "override_multiplier", value: string) => {
    onChange(
      assignments.map((a) =>
        a.service_id === serviceId ? { ...a, [field]: value } : a
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (services.length === 0) {
    return <p className="text-sm text-muted-foreground">No active services found.</p>;
  }

  // Group by category
  const grouped = services.reduce<Record<string, ServiceItem[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="space-y-2">
          <h5 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide capitalize">
            {category.replace(/_/g, " ")}
          </h5>
          {items.map((svc) => {
            const checked = isAssigned(svc.id);
            const assignment = getAssignment(svc.id);
            return (
              <div key={svc.id} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`svc-${svc.id}`}
                    checked={checked}
                    onCheckedChange={() => toggleService(svc.id)}
                  />
                  <label htmlFor={`svc-${svc.id}`} className="text-sm font-medium cursor-pointer flex-1">
                    {svc.name}
                  </label>
                  <Badge variant="outline" className="text-xs">
                    ${svc.cost_value} {UNIT_LABELS[svc.pricing_unit] ?? svc.pricing_unit}
                  </Badge>
                </div>
                {checked && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    <div className="space-y-1">
                      <Label className="text-xs">Override Cost</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={`Default: $${svc.cost_value}`}
                        value={assignment?.override_cost ?? ""}
                        onChange={(e) => updateField(svc.id, "override_cost", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty Multiplier</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Default: 1"
                        value={assignment?.override_multiplier ?? ""}
                        onChange={(e) => updateField(svc.id, "override_multiplier", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
