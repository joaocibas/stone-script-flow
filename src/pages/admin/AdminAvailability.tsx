import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface AvailRow {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  specific_date: string | null;
}

const AdminAvailability = () => {
  const [rows, setRows] = useState<AvailRow[]>([]);
  const [overrides, setOverrides] = useState<AvailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockDate, setBlockDate] = useState<Date | undefined>();

  const fetchData = async () => {
    const { data } = await supabase.from("admin_availability").select("*").order("day_of_week");
    if (data) {
      setRows(data.filter((r) => !r.specific_date));
      setOverrides(data.filter((r) => r.specific_date));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleDay = (id: string, current: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_available: !current } : r)));
  };

  const updateTime = (id: string, field: "start_time" | "end_time", value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    let errors = 0;
    for (const row of rows) {
      const { error } = await supabase
        .from("admin_availability")
        .update({ start_time: row.start_time, end_time: row.end_time, is_available: row.is_available })
        .eq("id", row.id);
      if (error) errors++;
    }
    setSaving(false);
    if (errors) toast.error("Some updates failed");
    else toast.success("Availability saved");
  };

  const addBlockout = async () => {
    if (!blockDate) return;
    const dateStr = format(blockDate, "yyyy-MM-dd");
    const { error } = await supabase.from("admin_availability").insert({
      day_of_week: blockDate.getDay(),
      start_time: "00:00",
      end_time: "23:59",
      is_available: false,
      specific_date: dateStr,
    });
    if (error) toast.error("Failed to add blockout");
    else {
      toast.success(`Blocked ${dateStr}`);
      setBlockDate(undefined);
      fetchData();
    }
  };

  const removeBlockout = async (id: string) => {
    await supabase.from("admin_availability").delete().eq("id", id);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Scheduling Availability</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure weekly hours and date-specific blockouts.
        </p>
      </div>

      {/* Weekly schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly Hours</CardTitle>
          <CardDescription>Set your standard availability for each day of the week.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row, i) => (
            <div key={row.id}>
              {i > 0 && <Separator className="mb-3" />}
              <div className="flex items-center gap-4">
                <div className="w-28 flex items-center gap-2">
                  <Switch checked={row.is_available} onCheckedChange={() => toggleDay(row.id, row.is_available)} />
                  <span className="text-sm font-medium">{DAYS[row.day_of_week]}</span>
                </div>
                {row.is_available && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={row.start_time}
                      onChange={(e) => updateTime(row.id, "start_time", e.target.value)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={row.end_time}
                      onChange={(e) => updateTime(row.id, "end_time", e.target.value)}
                      className="w-32"
                    />
                  </div>
                )}
                {!row.is_available && (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            </div>
          ))}
          <Button onClick={handleSave} disabled={saving} className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Weekly Hours
          </Button>
        </CardContent>
      </Card>

      {/* Date blockouts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Date Blockouts</CardTitle>
          <CardDescription>Block specific dates (holidays, closures, etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <Calendar
              mode="single"
              selected={blockDate}
              onSelect={setBlockDate}
              disabled={(d) => d < new Date()}
              className="rounded-md border pointer-events-auto"
            />
            <div className="space-y-2">
              <Button
                onClick={addBlockout}
                disabled={!blockDate}
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Block Date
              </Button>
            </div>
          </div>

          {overrides.length > 0 && (
            <div className="space-y-2 pt-2">
              <Label className="text-sm font-medium">Blocked Dates</Label>
              {overrides.map((o) => (
                <div key={o.id} className="flex items-center justify-between bg-secondary/50 rounded px-3 py-2">
                  <span className="text-sm">{o.specific_date}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeBlockout(o.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAvailability;
