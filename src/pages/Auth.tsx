import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [settings, setSettings] = useState({
    companyName: "HR Management System",
    loginTitle: "HR Management System",
    loginSubtitle: "Sign in to access your dashboard",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["company_name", "login_page_title", "login_page_subtitle"]);

    if (data) {
      const newSettings: any = {};
      data.forEach((setting) => {
        if (setting.setting_key === "company_name" && setting.setting_value) {
          newSettings.companyName = setting.setting_value;
        } else if (setting.setting_key === "login_page_title" && setting.setting_value) {
          newSettings.loginTitle = setting.setting_value;
        } else if (setting.setting_key === "login_page_subtitle" && setting.setting_value) {
          newSettings.loginSubtitle = setting.setting_value;
        }
      });
      setSettings((prev) => ({ ...prev, ...newSettings }));
    }
  };

  const handleFixEmail = async () => {
    setIsLoading(true);
    try {
      // First login with the old email to get access
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: "aminufahimta@gmail.com",
        password: "Mskid1m$",
      });

      if (loginError) {
        toast.error("Please login with aminufahimta@gmail.com first");
        return;
      }

      // Call the edge function to update auth email
      const { data, error } = await supabase.functions.invoke('update-auth-email', {
        body: {
          userId: '307168b0-3267-47ba-9f02-a1846a8c3760',
          newEmail: 'aminu@skypro.ng',
        },
      });

      if (error) throw error;

      toast.success("Email updated! Please login with aminu@skypro.ng");
      await supabase.auth.signOut();
      setFormData({ email: "aminu@skypro.ng", password: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-[var(--shadow-elegant)]">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {settings.loginTitle}
          </CardTitle>
          <CardDescription>{settings.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Contact your administrator to create an account
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
