import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings as SettingsIcon } from "lucide-react";

const SystemSettings = () => {
  const [deductionPercentage, setDeductionPercentage] = useState<number>(100);
  const [workingDays, setWorkingDays] = useState<number>(22);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["absence_deduction_percentage", "working_days_per_month"]);

      if (error) throw error;

      if (data) {
        data.forEach((setting) => {
          if (setting.setting_key === "absence_deduction_percentage") {
            setDeductionPercentage(Number(setting.setting_value));
          } else if (setting.setting_key === "working_days_per_month") {
            setWorkingDays(Number(setting.setting_value));
          }
        });
      }
    } catch (error: any) {
      toast.error("Failed to load settings");
    }
  };

  const handleSave = async () => {
    if (deductionPercentage < 0 || deductionPercentage > 100) {
      toast.error("Deduction percentage must be between 0 and 100");
      return;
    }

    if (workingDays < 1 || workingDays > 31) {
      toast.error("Working days must be between 1 and 31");
      return;
    }

    setLoading(true);
    try {
      const updates = [
        {
          setting_key: "absence_deduction_percentage",
          setting_value: String(deductionPercentage),
        },
        {
          setting_key: "working_days_per_month",
          setting_value: String(workingDays),
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .update({ setting_value: update.setting_value })
          .eq("setting_key", update.setting_key);

        if (error) throw error;
      }

      toast.success("Settings updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <CardTitle>System Settings</CardTitle>
        </div>
        <CardDescription>
          Configure salary deduction and attendance settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="deduction">
            Absence Deduction Percentage (%)
          </Label>
          <Input
            id="deduction"
            type="number"
            min="0"
            max="100"
            value={deductionPercentage}
            onChange={(e) => setDeductionPercentage(Number(e.target.value))}
          />
          <p className="text-sm text-muted-foreground">
            Percentage of daily rate to deduct when an employee is absent (0-100%).
            {deductionPercentage === 100 && " Currently set to deduct full daily rate."}
            {deductionPercentage === 50 && " Currently set to deduct half daily rate."}
            {deductionPercentage === 0 && " Currently set to no deduction."}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="workingDays">
            Working Days Per Month
          </Label>
          <Input
            id="workingDays"
            type="number"
            min="1"
            max="31"
            value={workingDays}
            onChange={(e) => setWorkingDays(Number(e.target.value))}
          />
          <p className="text-sm text-muted-foreground">
            Number of working days per month for salary calculations
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SystemSettings;
