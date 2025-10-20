import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings as SettingsIcon, Building2, Palette, DollarSign, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [signupPageTitle, setSignupPageTitle] = useState<string>("");
  const [signupPageSubtitle, setSignupPageSubtitle] = useState<string>("");
  const [positionOptions, setPositionOptions] = useState<string>("Software Engineer,Technical Support,Field Technician,Customer Service");
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
          "home_page_description",
          "signup_page_title",
          "signup_page_subtitle",
          "position_options"
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
          } else if (setting.setting_key === "signup_page_title") {
            setSignupPageTitle(setting.setting_value);
          } else if (setting.setting_key === "signup_page_subtitle") {
            setSignupPageSubtitle(setting.setting_value);
          } else if (setting.setting_key === "position_options") {
            setPositionOptions(setting.setting_value);
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
        {
          setting_key: "signup_page_title",
          setting_value: signupPageTitle,
        },
        {
          setting_key: "signup_page_subtitle",
          setting_value: signupPageSubtitle,
        },
        {
          setting_key: "position_options",
          setting_value: positionOptions,
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
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <CardTitle>System Settings</CardTitle>
        </div>
        <CardDescription>
          Configure your system preferences and settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Signup Page
            </TabsTrigger>
            <TabsTrigger value="payroll" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payroll
            </TabsTrigger>
            <TabsTrigger value="cron" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Scheduled Jobs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
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
            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
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

            <div className="space-y-4 pt-4 border-t">
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

            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Signup Page Settings</h3>
              <p className="text-sm text-muted-foreground">Customize the signup page and form fields</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signupTitle">Signup Page Title</Label>
              <Input
                id="signupTitle"
                value={signupPageTitle}
                onChange={(e) => setSignupPageTitle(e.target.value)}
                placeholder="e.g., Join Our Team"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signupSubtitle">Signup Page Subtitle</Label>
              <Input
                id="signupSubtitle"
                value={signupPageSubtitle}
                onChange={(e) => setSignupPageSubtitle(e.target.value)}
                placeholder="e.g., Create your account to get started"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="positionOptions">Position Options (comma-separated)</Label>
              <Input
                id="positionOptions"
                value={positionOptions}
                onChange={(e) => setPositionOptions(e.target.value)}
                placeholder="e.g., Software Engineer, Technical Support"
              />
              <p className="text-sm text-muted-foreground">
                These options will appear in the position dropdown on signup
              </p>
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
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
                Percentage of base salary to deduct for each absence on weekdays (Monday-Friday). 
                Weekends are automatically excluded from deductions.
                {deductionPercentage === 100 && " Currently set to deduct full base salary per absence."}
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
          </TabsContent>

          <TabsContent value="cron">
            <CronJobsManagement />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SystemSettings;
