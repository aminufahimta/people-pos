import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings as SettingsIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import CronJobsManagement from "./CronJobsManagement";

const SystemSettings = () => {
  const [deductionPercentage, setDeductionPercentage] = useState<number>(100);
  const [workingDays, setWorkingDays] = useState<number>(22);
  const [companyName, setCompanyName] = useState<string>("");
  const [loginPageTitle, setLoginPageTitle] = useState<string>("");
  const [loginPageSubtitle, setLoginPageSubtitle] = useState<string>("");
  const [homePageTitle, setHomePageTitle] = useState<string>("");
  const [homePageSubtitle, setHomePageSubtitle] = useState<string>("");
  const [homePageDescription, setHomePageDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "absence_deduction_percentage", 
          "working_days_per_month", 
          "company_name", 
          "login_page_title", 
          "login_page_subtitle",
          "home_page_title",
          "home_page_subtitle",
          "home_page_description"
        ]);

      if (error) throw error;

      if (data) {
        data.forEach((setting) => {
          if (setting.setting_key === "absence_deduction_percentage") {
            setDeductionPercentage(Number(setting.setting_value));
          } else if (setting.setting_key === "working_days_per_month") {
            setWorkingDays(Number(setting.setting_value));
          } else if (setting.setting_key === "company_name") {
            setCompanyName(setting.setting_value);
          } else if (setting.setting_key === "login_page_title") {
            setLoginPageTitle(setting.setting_value);
          } else if (setting.setting_key === "login_page_subtitle") {
            setLoginPageSubtitle(setting.setting_value);
          } else if (setting.setting_key === "home_page_title") {
            setHomePageTitle(setting.setting_value);
          } else if (setting.setting_key === "home_page_subtitle") {
            setHomePageSubtitle(setting.setting_value);
          } else if (setting.setting_key === "home_page_description") {
            setHomePageDescription(setting.setting_value);
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
        {
          setting_key: "company_name",
          setting_value: companyName,
        },
        {
          setting_key: "login_page_title",
          setting_value: loginPageTitle,
        },
        {
          setting_key: "login_page_subtitle",
          setting_value: loginPageSubtitle,
        },
        {
          setting_key: "home_page_title",
          setting_value: homePageTitle,
        },
        {
          setting_key: "home_page_subtitle",
          setting_value: homePageSubtitle,
        },
        {
          setting_key: "home_page_description",
          setting_value: homePageDescription,
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert({
            setting_key: update.setting_key,
            setting_value: update.setting_value,
          }, {
            onConflict: 'setting_key'
          });

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
    <div className="space-y-8">
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
        <CardContent className="space-y-8">
          {/* General Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">General Settings</h3>
              <p className="text-sm text-muted-foreground">Basic company information</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
              />
              <p className="text-sm text-muted-foreground">
                This will be displayed throughout the system
              </p>
            </div>
          </div>

          <Separator />

          {/* Login Page Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Login Page Settings</h3>
              <p className="text-sm text-muted-foreground">Customize the login page appearance</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loginTitle">Login Page Title</Label>
              <Input
                id="loginTitle"
                value={loginPageTitle}
                onChange={(e) => setLoginPageTitle(e.target.value)}
                placeholder="e.g., Welcome to HR System"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loginSubtitle">Login Page Subtitle</Label>
              <Input
                id="loginSubtitle"
                value={loginPageSubtitle}
                onChange={(e) => setLoginPageSubtitle(e.target.value)}
                placeholder="e.g., Sign in to access your dashboard"
              />
            </div>
          </div>

          <Separator />

          {/* Home Page Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Home Page Settings</h3>
              <p className="text-sm text-muted-foreground">Customize the home page content</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="homeTitle">Home Page Title</Label>
              <Input
                id="homeTitle"
                value={homePageTitle}
                onChange={(e) => setHomePageTitle(e.target.value)}
                placeholder="e.g., HR Management System"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="homeSubtitle">Home Page Subtitle</Label>
              <Input
                id="homeSubtitle"
                value={homePageSubtitle}
                onChange={(e) => setHomePageSubtitle(e.target.value)}
                placeholder="e.g., Streamline your workforce management"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="homeDescription">Home Page Description</Label>
              <Input
                id="homeDescription"
                value={homePageDescription}
                onChange={(e) => setHomePageDescription(e.target.value)}
                placeholder="e.g., Comprehensive HR solution for modern businesses"
              />
            </div>
          </div>

          <Separator />

          {/* Payroll Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Payroll Settings</h3>
              <p className="text-sm text-muted-foreground">Configure salary deduction and attendance settings</p>
            </div>
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
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      <CronJobsManagement />
    </div>
  );
};

export default SystemSettings;
