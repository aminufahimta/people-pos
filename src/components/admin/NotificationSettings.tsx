import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Bell, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NotificationSetting {
  id: string;
  role: string;
  notification_type: string;
  enabled: boolean;
  description: string | null;
}

export const NotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    hr_manager: "HR Manager",
    project_manager: "Project Manager",
    employee: "Employee",
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .order("role", { ascending: true })
        .order("notification_type", { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      toast({
        title: "Error",
        description: "Failed to load notification settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleNotification = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("notification_settings")
        .update({ enabled: !currentState })
        .eq("id", id);

      if (error) throw error;

      setSettings((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: !currentState } : s))
      );

      toast({
        title: "Success",
        description: "Notification setting updated",
      });
    } catch (error) {
      console.error("Error updating notification setting:", error);
      toast({
        title: "Error",
        description: "Failed to update notification setting",
        variant: "destructive",
      });
    }
  };

  const getRoleSettings = (role: string) => {
    return settings.filter((s) => s.role === role);
  };

  const formatNotificationType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Notification Settings</CardTitle>
        </div>
        <CardDescription>
          Manage notification preferences for each user role
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="super_admin" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {Object.keys(roleLabels).map((role) => (
              <TabsTrigger key={role} value={role}>
                {roleLabels[role]}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.keys(roleLabels).map((role) => (
            <TabsContent key={role} value={role} className="space-y-4">
              {getRoleSettings(role).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notification settings configured for this role
                </p>
              ) : (
                <div className="space-y-4">
                  {getRoleSettings(role).map((setting) => (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between space-x-4 rounded-lg border p-4"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={setting.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {formatNotificationType(setting.notification_type)}
                          </Label>
                          <Badge variant={setting.enabled ? "default" : "secondary"}>
                            {setting.enabled ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {setting.description && (
                          <p className="text-sm text-muted-foreground">
                            {setting.description}
                          </p>
                        )}
                      </div>
                      <Switch
                        id={setting.id}
                        checked={setting.enabled}
                        onCheckedChange={() =>
                          toggleNotification(setting.id, setting.enabled)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
