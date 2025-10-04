import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Building2, Users, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    title: "HR Management System",
    subtitle: "Streamline employee management, track attendance, and automate payroll",
    description: "with our comprehensive HR solution",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["home_page_title", "home_page_subtitle", "home_page_description"]);

    if (data) {
      const newSettings: any = {};
      data.forEach((setting) => {
        if (setting.setting_key === "home_page_title" && setting.setting_value) {
          newSettings.title = setting.setting_value;
        } else if (setting.setting_key === "home_page_subtitle" && setting.setting_value) {
          newSettings.subtitle = setting.setting_value;
        } else if (setting.setting_key === "home_page_description" && setting.setting_value) {
          newSettings.description = setting.setting_value;
        }
      });
      setSettings((prev) => ({ ...prev, ...newSettings }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="flex justify-center">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[var(--shadow-elegant)]">
              <Building2 className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              {settings.title}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {settings.subtitle} {settings.description}
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-all"
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="p-6 rounded-2xl bg-card shadow-[var(--shadow-elegant)] hover:shadow-lg transition-all">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Employee Management</h3>
              <p className="text-sm text-muted-foreground">
                Manage employee profiles, roles, and salary information efficiently
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card shadow-[var(--shadow-elegant)] hover:shadow-lg transition-all">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center mb-4 mx-auto">
                <Clock className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Attendance Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Real-time clock in/out system with comprehensive attendance reports
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card shadow-[var(--shadow-elegant)] hover:shadow-lg transition-all">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 mx-auto">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Automated Payroll</h3>
              <p className="text-sm text-muted-foreground">
                Automatic salary deductions for absences with detailed tracking
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
